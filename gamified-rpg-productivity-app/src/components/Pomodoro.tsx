"use client";

import { calcPomodoroReward } from "@/lib/game";
import type { PomoMode, PomodoroApi } from "@/lib/usePomodoro";
import { Panel, SegButtons } from "./ui";

const COLORS: Record<PomoMode, { a: string; b: string; label: string }> = {
  focus: { a: "#7c5cff", b: "#22d3ee", label: "Focus" },
  short: { a: "#34d399", b: "#a7f3d0", label: "Short Rest" },
  long: { a: "#38bdf8", b: "#818cf8", label: "Long Rest" },
};

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function PomodoroRing({ pomo, size = 280 }: { pomo: PomodoroApi; size?: number }) {
  const c = COLORS[pomo.mode];
  const r = 120;
  const circ = 2 * Math.PI * r;
  const progress = 1 - pomo.remaining / pomo.total;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox="0 0 280 280" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id={`pg-${pomo.mode}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={c.a} />
            <stop offset="100%" stopColor={c.b} />
          </linearGradient>
        </defs>
        <circle cx="140" cy="140" r={r} fill="none" stroke="rgba(94,129,255,0.15)" strokeWidth="10" />
        <circle
          cx="140"
          cy="140"
          r={r}
          fill="none"
          stroke={`url(#pg-${pomo.mode})`}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - progress)}
          style={{ filter: `drop-shadow(0 0 8px ${c.b})`, transition: "stroke-dashoffset 0.4s linear" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="sys-title !text-[0.6rem]">{c.label}</p>
          <p className="display glow-text font-black" style={{ fontSize: size * 0.2 }}>
            {fmt(pomo.remaining)}
          </p>
          <p className="mt-1 text-xs text-mute">{pomo.running ? "Stay in the zone…" : "Ready"}</p>
        </div>
      </div>
    </div>
  );
}

export function PomodoroView({
  pomo,
  mult,
  pomodorosToday,
  totalPomodoros,
  focusMinutes,
}: {
  pomo: PomodoroApi;
  mult: number;
  pomodorosToday: number;
  totalPomodoros: number;
  focusMinutes: number;
}) {
  const reward = calcPomodoroReward(pomo.durations.focus, mult);
  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <Panel title="Focus Dungeon" icon="⏳" className="lg:col-span-3">
        <div className="flex flex-col items-center gap-5 py-2">
          <SegButtons
            value={pomo.mode}
            onChange={pomo.setMode}
            options={[
              { value: "focus", label: "Focus" },
              { value: "short", label: "Short" },
              { value: "long", label: "Long" },
            ]}
          />
          <PomodoroRing pomo={pomo} />
          <div className="flex flex-wrap justify-center gap-2">
            {pomo.running ? (
              <button className="btn btn-ghost" onClick={pomo.pause}>
                ❚❚ Pause
              </button>
            ) : (
              <button className="btn" onClick={pomo.start}>
                ▶ {pomo.remaining < pomo.total ? "Resume" : "Start"}
              </button>
            )}
            <button className="btn btn-ghost" onClick={pomo.reset}>
              ↺ Reset
            </button>
            <button className="btn btn-ghost" onClick={pomo.skip} title="Skip to the next phase (no reward)">
              ⏭ Skip
            </button>
          </div>
          <div className="flex items-center gap-2" aria-label="Cycle progress">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-3 w-3 rounded-full border ${
                  i < pomo.cycles % 4 || (pomo.cycles > 0 && pomo.cycles % 4 === 0 && pomo.mode === "long")
                    ? "border-cyan-300 bg-cyan-300 shadow-[0_0_10px_#22d3ee]"
                    : "border-indigo-400/50"
                }`}
              />
            ))}
            <span className="ml-2 text-xs text-mute">4 sessions → long rest</span>
          </div>
        </div>
      </Panel>

      <div className="space-y-5 lg:col-span-2">
        <Panel title="Session Length" icon="⚙">
          <div className="flex flex-wrap gap-2">
            {[15, 25, 45, 50].map((m) => (
              <button
                key={m}
                onClick={() => pomo.setFocusLength(m)}
                className={`btn btn-sm ${pomo.durations.focus === m ? "" : "btn-ghost"}`}
              >
                {m} min
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-mute">
            Finishing a <b className="text-indigo-200">{pomo.durations.focus}‑min</b> focus session pays{" "}
            <b className="text-indigo-200">+{reward.xp} XP</b> and <b className="text-gold">+{reward.coins} ◈</b>
            {mult > 1 && <span className="text-orange-400"> (streak ×{mult})</span>}.
          </p>
        </Panel>
        <Panel title="Focus Record" icon="📜">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Today" value={pomodorosToday} />
            <Stat label="All time" value={totalPomodoros} />
            <Stat label="Hours" value={+(focusMinutes / 60).toFixed(1)} />
          </div>
          <p className="mt-3 text-xs text-mute">
            Tip: pick one quest, silence notifications, and clear it inside a single session. The timer keeps running while you browse
            other tabs of the System.
          </p>
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[rgba(94,129,255,0.2)] bg-[rgba(5,7,22,0.5)] py-2">
      <p className="display text-xl font-black text-sky-200">{value}</p>
      <p className="text-[0.65rem] uppercase tracking-widest text-mute">{label}</p>
    </div>
  );
}

export function MiniPomodoro({ pomo, onOpen }: { pomo: PomodoroApi; onOpen: () => void }) {
  return (
    <Panel
      title="Focus Timer"
      icon="⏳"
      right={
        <button className="btn btn-ghost btn-sm" onClick={onOpen}>
          Open
        </button>
      }
    >
      <div className="flex items-center gap-4">
        <div className="flex-none">
          <PomodoroRing pomo={pomo} size={96} />
        </div>
        <div className="flex flex-col gap-2">
          {pomo.running ? (
            <button className="btn btn-ghost btn-sm" onClick={pomo.pause}>
              ❚❚ Pause
            </button>
          ) : (
            <button className="btn btn-sm" onClick={pomo.start}>
              ▶ Start
            </button>
          )}
          <p className="text-xs text-mute">{COLORS[pomo.mode].label} · {pomo.durations[pomo.mode]} min</p>
        </div>
      </div>
    </Panel>
  );
}
