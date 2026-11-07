"use client";

import { CATEGORIES, computeStats, goalProgress, GOAL_SIZES, STREAK_TIERS, DAILY_BONUS } from "@/lib/game";
import { fmtLong } from "@/lib/dates";
import type { Actions, Category, GameState } from "@/lib/types";
import type { PomodoroApi } from "@/lib/usePomodoro";
import { MiniPomodoro } from "./Pomodoro";
import { QuoteCard } from "./QuoteCard";
import { TaskList, TaskItem } from "./TaskList";
import { Bar, Panel } from "./ui";

export function Dashboard({
  state,
  today,
  mult,
  actions,
  pomo,
  go,
}: {
  state: GameState;
  today: string;
  mult: number;
  actions: Actions;
  pomo: PomodoroApi;
  go: (tab: string) => void;
}) {
  const { player, tasks, goals } = state;
  const todays = tasks.filter((t) => t.scope === "day" && t.dueDate === today);
  const overdue = tasks.filter((t) => t.scope === "day" && !t.completed && t.dueDate < today);
  const stats = computeStats(tasks);
  const cleared = state.todayCount >= player.dailyTarget;
  const activeGoals = goals.filter((g) => !g.completed).slice(0, 3);

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        {/* Daily quest */}
        <Panel
          title={`Daily Quest · ${fmtLong(today)}`}
          icon="⚔"
          right={
            <label className="flex items-center gap-2 text-xs text-mute">
              Target
              <select
                className="field !w-auto !py-1"
                value={player.dailyTarget}
                onChange={(e) => actions.setDailyTarget(Number(e.target.value))}
                aria-label="Daily target"
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} quests
                  </option>
                ))}
              </select>
            </label>
          }
        >
          <div className="mb-4 rounded-xl border border-[rgba(94,129,255,0.2)] bg-[rgba(5,7,22,0.5)] p-3">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className={cleared ? "font-bold text-emerald-300" : "text-indigo-100"}>
                {cleared ? "✓ DAILY QUEST CLEARED" : `Clear ${player.dailyTarget} quests today to keep your streak`}
              </span>
              <span className="display text-xs font-bold text-sky-200">
                {Math.min(state.todayCount, player.dailyTarget)}/{player.dailyTarget}
              </span>
            </div>
            <Bar pct={(state.todayCount / player.dailyTarget) * 100} color={cleared ? "#34d399" : undefined} />
            <p className="mt-2 text-xs text-mute">
              Completion bonus: <b className="text-indigo-200">+{Math.round(DAILY_BONUS.xp * mult)} XP</b>{" "}
              <b className="text-gold">+{Math.round(DAILY_BONUS.coins * mult)} ◈</b> · Streak bonus:{" "}
              {STREAK_TIERS.slice(1).map((t) => (
                <span
                  key={t.days}
                  className={`ml-1 inline-block rounded px-1.5 ${
                    player.currentStreak >= t.days ? "bg-orange-500/20 font-bold text-orange-300" : "text-mute"
                  }`}
                >
                  {t.days}d ×{t.mult}
                </span>
              ))}
            </p>
          </div>

          {overdue.length > 0 && (
            <div className="mb-4">
              <p className="sys-title mb-2 !text-rose-300">⚠ Unfinished from earlier</p>
              <div className="space-y-2">
                {overdue.slice(0, 5).map((t) => (
                  <TaskItem key={t.id} task={t} mult={mult} actions={actions} today={today} goals={goals} />
                ))}
                {overdue.length > 5 && <p className="text-xs text-mute">+{overdue.length - 5} more in the calendar</p>}
              </div>
            </div>
          )}

          <TaskList
            tasks={todays}
            scope="day"
            dueDate={today}
            goals={goals}
            mult={mult}
            actions={actions}
            today={today}
            emptyText="No quests for today. Accept your first quest below — harder & longer quests pay more XP."
          />
        </Panel>

        {/* Goals preview */}
        <Panel
          title="Active Gates (Long‑term Goals)"
          icon="🎯"
          right={
            <button className="btn btn-ghost btn-sm" onClick={() => go("goals")}>
              Manage
            </button>
          }
        >
          {activeGoals.length === 0 ? (
            <p className="text-sm text-mute">No active goals. Open a gate in the Goals tab to chase something big.</p>
          ) : (
            <div className="space-y-3">
              {activeGoals.map((g) => {
                const p = goalProgress(g, tasks.filter((t) => t.goalId === g.id));
                const size = GOAL_SIZES[g.size];
                return (
                  <div key={g.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-semibold">{g.title}</span>
                      <span className="display text-xs font-bold" style={{ color: size.color }}>
                        {p.pct}%
                      </span>
                    </div>
                    <Bar pct={p.pct} color={size.color} />
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <div className="space-y-5">
        <QuoteCard />

        <Panel title="Attributes" icon="📊">
          <div className="space-y-2.5">
            {(Object.keys(CATEGORIES) as Category[]).map((k) => {
              const c = CATEGORIES[k];
              return (
                <div key={k} className="flex items-center gap-3">
                  <span className="display w-10 text-xs font-bold" style={{ color: c.color }}>
                    {c.short}
                  </span>
                  <div className="flex-1">
                    <Bar pct={Math.min(100, stats[k])} color={c.color} className="!h-2" />
                  </div>
                  <span className="display w-8 text-right text-sm font-black">{stats[k]}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-mute">Tag quests with a stat to grow it. Every ~15 XP in a stat adds +1.</p>
        </Panel>

        <MiniPomodoro pomo={pomo} onOpen={() => go("focus")} />

        <Panel title="System Log" icon="📜">
          {state.events.length === 0 ? (
            <p className="text-sm text-mute">Nothing yet. Clear a quest to write the first entry.</p>
          ) : (
            <ul className="space-y-1.5">
              {state.events.slice(0, 7).map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate text-indigo-100" title={e.message}>
                    {e.message}
                  </span>
                  <span className="flex-none text-xs font-bold">
                    {e.xp !== 0 && <span className="text-indigo-300">{e.xp > 0 ? "+" : ""}{e.xp}xp </span>}
                    {e.coins !== 0 && <span className="text-gold">{e.coins > 0 ? "+" : ""}{e.coins}◈</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
