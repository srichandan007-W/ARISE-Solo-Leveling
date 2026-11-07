"use client";

import { useState } from "react";
import {
  addDays,
  addMonths,
  fmtLong,
  fmtMonth,
  fmtShort,
  monthEnd,
  monthStart,
  weekStart,
} from "@/lib/dates";
import { GOAL_SIZES, goalProgress, SCOPE_MULT } from "@/lib/game";
import type { Actions, GameState } from "@/lib/types";
import { TaskItem, TaskList } from "./TaskList";
import { Bar, NavButton, Panel, SegButtons } from "./ui";

export function Planner({
  state,
  today,
  mult,
  actions,
}: {
  state: GameState;
  today: string;
  mult: number;
  actions: Actions;
}) {
  const [mode, setMode] = useState<"week" | "month">("week");
  const [cursor, setCursor] = useState(today);
  const { tasks, goals } = state;

  const start = mode === "week" ? weekStart(cursor) : monthStart(cursor);
  const end = mode === "week" ? addDays(start, 6) : monthEnd(cursor);
  const label = mode === "week" ? `Week of ${fmtShort(start)} – ${fmtShort(end)}` : fmtMonth(start);

  const quests = tasks.filter((t) => t.scope === mode && t.dueDate === start);
  const dayTasks = tasks.filter((t) => t.scope === "day" && t.dueDate >= start && t.dueDate <= end);
  const questsDone = quests.filter((t) => t.completed).length;
  const daysDone = dayTasks.filter((t) => t.completed).length;
  const goalsInRange = goals.filter((g) => g.targetDate && g.targetDate >= start && g.targetDate <= end);

  const grouped = new Map<string, typeof dayTasks>();
  for (const t of dayTasks) grouped.set(t.dueDate, [...(grouped.get(t.dueDate) ?? []), t]);
  const days = [...grouped.keys()].sort();

  const step = (dir: 1 | -1) => setCursor(mode === "week" ? addDays(cursor, 7 * dir) : addMonths(cursor, dir));

  return (
    <div className="space-y-5">
      <Panel
        title="Quest Board"
        icon="🗺"
        right={
          <SegButtons
            value={mode}
            onChange={(m) => setMode(m)}
            options={[
              { value: "week", label: "Weekly" },
              { value: "month", label: "Monthly" },
            ]}
          />
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <NavButton label="Previous" onClick={() => step(-1)}>
              ‹
            </NavButton>
            <NavButton label="Next" onClick={() => step(1)}>
              ›
            </NavButton>
            <button className="btn btn-ghost btn-sm" onClick={() => setCursor(today)}>
              This {mode}
            </button>
          </div>
          <h3 className="display glow-text text-lg font-black">{label}</h3>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1 flex justify-between text-xs text-mute">
              <span>{mode === "week" ? "Weekly" : "Monthly"} quests</span>
              <span className="display font-bold text-sky-200">
                {questsDone}/{quests.length}
              </span>
            </div>
            <Bar pct={quests.length ? (questsDone / quests.length) * 100 : 0} />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs text-mute">
              <span>Daily quests in this {mode}</span>
              <span className="display font-bold text-sky-200">
                {daysDone}/{dayTasks.length}
              </span>
            </div>
            <Bar pct={dayTasks.length ? (daysDone / dayTasks.length) * 100 : 0} color="#34d399" />
          </div>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={`${mode === "week" ? "Weekly" : "Monthly"} Quests (×${SCOPE_MULT[mode]} rewards)`} icon="🏹">
          <TaskList
            tasks={quests}
            scope={mode}
            dueDate={start}
            goals={goals}
            mult={mult}
            actions={actions}
            today={today}
            emptyText={`No ${mode}ly quests yet. Big-picture quests live here; ${mode === "week" ? "break them into daily quests in the calendar." : "pair them with weekly quests."}`}
            placeholder={mode === "week" ? "Weekly quest… e.g. Gym 4 times" : "Monthly objective… e.g. Finish online course"}
          />
        </Panel>

        <div className="space-y-5">
          <Panel title="Gate Deadlines" icon="🎯">
            {goalsInRange.length === 0 ? (
              <p className="text-sm text-mute">No long‑term goals are due in this {mode}.</p>
            ) : (
              <ul className="space-y-3">
                {goalsInRange.map((g) => {
                  const p = goalProgress(g, tasks.filter((t) => t.goalId === g.id));
                  return (
                    <li key={g.id}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className={g.completed ? "text-emerald-300 line-through" : "font-semibold"}>{g.title}</span>
                        <span className="text-xs text-mute">due {fmtShort(g.targetDate!)}</span>
                      </div>
                      <Bar pct={p.pct} color={GOAL_SIZES[g.size].color} className="!h-2" />
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel title={`Daily Quests in this ${mode}`} icon="⚔">
            {days.length === 0 ? (
              <p className="text-sm text-mute">No daily quests scheduled in this period.</p>
            ) : (
              <div className="max-h-[420px] space-y-4 overflow-y-auto pr-1">
                {days.map((d) => (
                  <div key={d}>
                    <p className="sys-title mb-1.5 !text-[0.6rem] !text-indigo-200 !shadow-none">{fmtLong(d)}</p>
                    <div className="space-y-1.5">
                      {grouped.get(d)!.map((t) => (
                        <TaskItem key={t.id} task={t} mult={mult} actions={actions} today={today} compact goals={goals} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
