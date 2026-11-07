"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toISO } from "@/lib/dates";
import { levelFromXp, rankForLevel, streakMultiplier } from "@/lib/game";
import type { Actions, Feedback, GameState } from "@/lib/types";
import { usePomodoro } from "@/lib/usePomodoro";
import { CalendarView } from "./CalendarView";
import { Dashboard } from "./Dashboard";
import { Goals } from "./Goals";
import { Planner } from "./Planner";
import { PlayerHeader } from "./PlayerHeader";
import { PomodoroView } from "./Pomodoro";
import { Shop } from "./Shop";

type Tab = "dashboard" | "calendar" | "planner" | "goals" | "focus" | "shop";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "dashboard", label: "Quests", icon: "⚔" },
  { id: "calendar", label: "Calendar", icon: "📅" },
  { id: "planner", label: "Week & Month", icon: "🗺" },
  { id: "goals", label: "Goals", icon: "🎯" },
  { id: "focus", label: "Focus", icon: "⏳" },
  { id: "shop", label: "Shop", icon: "🛒" },
];

interface Pop {
  id: number;
  x: number;
  y: number;
  text: string;
  kind: "xp" | "coin" | "streak" | "bad";
  delay: number;
}
interface Toast {
  id: number;
  title: string;
  body: string;
  tone: "good" | "bad" | "info";
}

let uid = 0;
const nextId = () => ++uid;

function pointOf(el?: HTMLElement | null) {
  if (el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top };
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 3 };
}

export default function GameApp() {
  const [state, setState] = useState<GameState | null>(null);
  const [today, setToday] = useState("");
  const [tab, setTab] = useState<Tab>("dashboard");
  const [pops, setPops] = useState<Pop[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);

  const pushToast = useCallback((title: string, body: string, tone: Toast["tone"] = "info") => {
    const id = nextId();
    setToasts((t) => [...t.slice(-3), { id, title, body, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const load = useCallback(async () => {
    const t = toISO(new Date());
    try {
      const res = await fetch(`/api/state?today=${t}`, { cache: "no-store" });
      if (!res.ok) throw new Error("bad response");
      setState((await res.json()) as GameState);
      setToday(t);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    load();
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  /** Generic mutation: calls the API, swaps in the fresh state, surfaces errors. */
  const call = useCallback(
    async (path: string, method: string, body?: unknown): Promise<{ ok: boolean; feedback: Feedback | null }> => {
      const t = toISO(new Date());
      try {
        const res = await fetch(`${path}?today=${t}`, {
          method,
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        const data = await res.json();
        if (!res.ok) {
          pushToast("[ SYSTEM ERROR ]", data.error ?? "Something went wrong", "bad");
          return { ok: false, feedback: null };
        }
        setState(data.state as GameState);
        setToday(t);
        return { ok: true, feedback: (data.feedback as Feedback | null) ?? null };
      } catch {
        pushToast("[ SYSTEM ERROR ]", "Connection lost. Try again.", "bad");
        return { ok: false, feedback: null };
      }
    },
    [pushToast],
  );

  const celebrate = useCallback(
    (fb: Feedback, pt: { x: number; y: number }) => {
      const lines: Omit<Pop, "id" | "x" | "y" | "delay">[] = [];
      if (fb.xp > 0) lines.push({ text: `+${fb.xp} XP`, kind: "xp" });
      if (fb.xp < 0) lines.push({ text: `${fb.xp} XP`, kind: "bad" });
      if (fb.coins > 0) lines.push({ text: `+${fb.coins} ◈`, kind: "coin" });
      if (fb.coins < 0) lines.push({ text: `${fb.coins} ◈`, kind: "bad" });
      if (fb.xp > 0 && fb.multiplier && fb.multiplier > 1) lines.push({ text: `🔥 STREAK ×${fb.multiplier}`, kind: "streak" });
      const created = lines.map((l, i) => ({ ...l, id: nextId(), x: pt.x, y: pt.y - i * 28, delay: i * 140 }));
      setPops((p) => [...p, ...created]);
      setTimeout(() => setPops((p) => p.filter((x) => !created.some((c) => c.id === x.id))), 2200);

      if (fb.dailyCleared) pushToast("[ DAILY QUEST COMPLETE ]", `Streak is now ${fb.streak} day${fb.streak === 1 ? "" : "s"} 🔥 — bonus awarded.`, "good");
      if (fb.streakLost) pushToast("[ SYSTEM ]", "Daily target no longer met — streak progress for today reverted.", "info");
      if (fb.message === "GATE CLEARED") pushToast("[ GATE CLEARED ]", "A long‑term goal has been conquered. Rewards received.", "good");
      if (fb.levelUp) setLevelUp(fb.levelUp);
    },
    [pushToast],
  );

  useEffect(() => {
    if (levelUp === null) return;
    const id = setTimeout(() => setLevelUp(null), 5000);
    return () => clearTimeout(id);
  }, [levelUp]);

  const pomo = usePomodoro(async (minutes) => {
    const r = await call("/api/pomodoro", "POST", { minutes });
    if (r.ok && r.feedback) {
      celebrate(r.feedback, pointOf());
      pushToast("[ FOCUS COMPLETE ]", `${minutes} minutes of deep work banked. Take your rest.`, "good");
    }
  });

  const actions: Actions = {
    addTask: async (input) => {
      await call("/api/tasks", "POST", input);
    },
    toggleTask: async (task, anchor) => {
      const pt = pointOf(anchor);
      const r = await call(`/api/tasks/${task.id}`, "PATCH", { completed: !task.completed });
      if (r.ok && r.feedback && (r.feedback.xp !== 0 || r.feedback.coins !== 0)) celebrate(r.feedback, pt);
    },
    deleteTask: async (id) => {
      await call(`/api/tasks/${id}`, "DELETE");
    },
    moveTask: async (id, dueDate) => {
      await call(`/api/tasks/${id}`, "PATCH", { dueDate });
    },
    addGoal: async (input) => {
      await call("/api/goals", "POST", input);
    },
    setGoalProgress: async (id, progress) => {
      await call(`/api/goals/${id}`, "PATCH", { manualProgress: progress });
    },
    claimGoal: async (goal, anchor) => {
      const pt = pointOf(anchor);
      const r = await call(`/api/goals/${goal.id}`, "PATCH", { claim: true });
      if (r.ok && r.feedback) celebrate(r.feedback, pt);
    },
    deleteGoal: async (id) => {
      await call(`/api/goals/${id}`, "DELETE");
    },
    buy: async (reward, anchor) => {
      const pt = pointOf(anchor);
      const r = await call(`/api/shop/${reward.id}`, "POST");
      if (r.ok && r.feedback) {
        celebrate(r.feedback, pt);
        pushToast("[ PURCHASED ]", `${reward.icon} ${reward.name} added to your inventory.`, "good");
      }
    },
    useItem: async (id) => {
      const r = await call(`/api/purchases/${id}`, "PATCH");
      if (r.ok) pushToast("[ ENJOY ]", "Reward used. You earned it. Now get back to the grind.", "info");
    },
    addReward: async (input) => {
      await call("/api/shop", "POST", input);
    },
    deleteReward: async (id) => {
      await call(`/api/shop/${id}`, "DELETE");
    },
    setDailyTarget: async (n) => {
      await call("/api/player", "PATCH", { dailyTarget: n });
    },
  };

  if (!state || !today) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="display glow-text flicker text-4xl font-black tracking-[0.4em]">ARISE</p>
          <p className="sys-title mt-4">{loadError ? "Connection to the System failed" : "Initializing System…"}</p>
          {loadError && (
            <button className="btn mt-4" onClick={load}>
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  const mult = streakMultiplier(state.player.currentStreak);
  const lv = levelFromXp(state.player.xp).level;
  const rank = rankForLevel(levelUp ?? lv);
  const viewProps = { state, today, mult, actions };

  return (
    <div className="relative min-h-screen">
      <div className="aura" aria-hidden>
        {Array.from({ length: 16 }, (_, i) => (
          <span
            key={i}
            style={{
              left: `${(i * 37 + 7) % 100}%`,
              animationDelay: `${(i * 1.7) % 12}s`,
              animationDuration: `${10 + (i % 5) * 2.5}s`,
              opacity: 0,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-7xl space-y-5 px-3 py-4 sm:px-6 sm:py-6">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="display glow-text text-3xl font-black tracking-[0.3em] sm:text-4xl">ARISE</h1>
            <p className="sys-title !text-[0.6rem]">The System · Level up your life</p>
          </div>
          <p className="hidden text-sm italic text-mute sm:block">“Only those who show up daily can rise.”</p>
        </header>

        <PlayerHeader player={state.player} todayCount={state.todayCount} pomo={pomo} onOpenPomodoro={() => setTab("focus")} />

        <nav className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" aria-label="Sections">
          {TABS.map((t) => (
            <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)} aria-current={tab === t.id}>
              <span className="mr-1.5">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>

        <main key={tab} className="fade-in">
          {tab === "dashboard" && <Dashboard {...viewProps} pomo={pomo} go={(t) => setTab(t as Tab)} />}
          {tab === "calendar" && <CalendarView {...viewProps} />}
          {tab === "planner" && <Planner {...viewProps} />}
          {tab === "goals" && <Goals {...viewProps} />}
          {tab === "focus" && (
            <PomodoroView
              pomo={pomo}
              mult={mult}
              pomodorosToday={state.pomodorosToday}
              totalPomodoros={state.player.totalPomodoros}
              focusMinutes={state.player.focusMinutes}
            />
          )}
          {tab === "shop" && <Shop state={state} actions={actions} />}
        </main>

        <footer className="pb-6 pt-2 text-center text-xs text-mute">
          ARISE · tick quests → earn XP & coins → keep the streak alive → spend rewards guilt‑free.
        </footer>
      </div>

      {/* floating XP / coin pops */}
      {pops.map((p) => (
        <span key={p.id} className={`pop pop-${p.kind}`} style={{ left: p.x, top: p.y, animationDelay: `${p.delay}ms` }}>
          {p.text}
        </span>
      ))}

      {/* system toasts */}
      <div className="fixed right-3 top-3 z-[150] flex w-[min(360px,calc(100vw-1.5rem))] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast p-3"
            style={t.tone === "bad" ? { borderColor: "rgba(244,63,94,0.7)", boxShadow: "0 0 26px rgba(244,63,94,0.35)" } : t.tone === "good" ? { borderColor: "rgba(52,211,153,0.7)", boxShadow: "0 0 26px rgba(52,211,153,0.3)" } : undefined}
          >
            <p className="sys-title !text-[0.65rem]">{t.title}</p>
            <p className="mt-1 text-sm text-indigo-100">{t.body}</p>
          </div>
        ))}
      </div>

      {/* level up */}
      {levelUp !== null && (
        <div className="levelup-overlay" onClick={() => setLevelUp(null)} role="dialog" aria-label="Level up">
          <span className="levelup-ring" />
          <span className="levelup-ring" style={{ animationDelay: "0.7s" }} />
          <div className="levelup-text relative text-center">
            <p className="sys-title !text-sm">[ SYSTEM ]</p>
            <p className="display glow-text mt-2 text-5xl font-black tracking-[0.2em] sm:text-7xl">LEVEL UP</p>
            <p className="display mt-4 text-6xl font-black sm:text-8xl" style={{ color: rank.color, textShadow: `0 0 30px ${rank.color}` }}>
              {levelUp}
            </p>
            <p className="mt-3 text-lg font-semibold" style={{ color: rank.color }}>
              {rank.title}
            </p>
            <p className="mt-6 text-xs text-mute">Click to continue</p>
          </div>
        </div>
      )}
    </div>
  );
}
