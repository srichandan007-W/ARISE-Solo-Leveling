"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  fmtLong,
  fmtMonth,
  fmtShort,
  monthGrid,
  monthStart,
  parseISO,
  weekStart,
} from "@/lib/dates";
import { levelFromXp } from "@/lib/game";
import type { Actions, GameState } from "@/lib/types";
import { TaskList } from "./TaskList";
import { Bar, NavButton, Panel, SegButtons } from "./ui";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarView({
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
  const [mode, setMode] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(today);
  const [selected, setSelected] = useState(today);
  const { tasks, goals, player } = state;

  const byDay = useMemo(() => {
    const m = new Map<string, { total: number; done: number }>();
    for (const t of tasks) {
      if (t.scope !== "day") continue;
      const e = m.get(t.dueDate) ?? { total: 0, done: 0 };
      e.total++;
      if (t.completed) e.done++;
      m.set(t.dueDate, e);
    }
    return m;
  }, [tasks]);

  const goalsByDay = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const g of goals) {
      if (!g.targetDate || g.completed) continue;
      m.set(g.targetDate, [...(m.get(g.targetDate) ?? []), g.title]);
    }
    return m;
  }, [goals]);

  const ms = monthStart(cursor);
  const ws = weekStart(cursor);
  const title = mode === "month" ? fmtMonth(ms) : `${fmtShort(ws)} – ${fmtShort(addDays(ws, 6))}`;
  const step = (dir: 1 | -1) => setCursor(mode === "month" ? addMonths(cursor, dir) : addDays(cursor, 7 * dir));

  const dayTasks = (d: string) => tasks.filter((t) => t.scope === "day" && t.dueDate === d);
  const weekQuests = tasks.filter((t) => t.scope === "week" && t.dueDate === ws);
  const monthQuests = tasks.filter((t) => t.scope === "month" && t.dueDate === ms);
  const level = levelFromXp(player.xp).level;

  return (
    <div className="space-y-5">
      <Panel
        title="Quest Calendar"
        icon="📅"
        right={
          <SegButtons
            value={mode}
            onChange={(m) => {
              setMode(m);
              setCursor(selected);
            }}
            options={[
              { value: "month", label: "Month" },
              { value: "week", label: "Week" },
            ]}
          />
        }
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <NavButton label="Previous" onClick={() => step(-1)}>
              ‹
            </NavButton>
            <NavButton label="Next" onClick={() => step(1)}>
              ›
            </NavButton>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setCursor(today);
                setSelected(today);
              }}
            >
              Today
            </button>
          </div>
          <h3 className="display glow-text text-base font-black sm:text-xl">{title}</h3>
          <span className="hidden text-xs text-mute sm:block">Lv {level}</span>
        </div>

        {mode === "month" ? (
          <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
            <div>
              <div className="mb-1.5 grid grid-cols-7 gap-1.5 sm:gap-2">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="display text-center text-[0.6rem] uppercase tracking-widest text-mute">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {monthGrid(ms).map((d) => {
                  const info = byDay.get(d);
                  const inMonth = d.slice(0, 7) === ms.slice(0, 7);
                  const allDone = info && info.total > 0 && info.done === info.total;
                  const gl = goalsByDay.get(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelected(d)}
                      title={gl ? `Goal deadline: ${gl.join(", ")}` : undefined}
                      className={`cal-cell ${inMonth ? "" : "out"} ${d === today ? "today" : ""} ${d === selected ? "selected" : ""} ${allDone ? "cleared" : ""}`}
                    >
                      <div className="flex items-start justify-between">
                        <span className={`display text-sm font-bold ${d === today ? "text-sky-300" : ""}`}>{parseISO(d).getDate()}</span>
                        {gl && <span className="text-xs">🎯</span>}
                        {allDone && <span className="text-xs text-emerald-300">✓</span>}
                      </div>
                      {info && (
                        <div className="mt-2">
                          <Bar pct={(info.done / info.total) * 100} className="!h-1.5" color={allDone ? "#34d399" : undefined} />
                          <p className="mt-1 hidden text-[0.65rem] text-mute sm:block">
                            {info.done}/{info.total} quests
                          </p>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-mute">🎯 goal deadline · green = all quests cleared · click a day to plan it.</p>
            </div>

            <div className="space-y-3">
              <h4 className="sys-title">{fmtLong(selected)}</h4>
              <TaskList
                tasks={dayTasks(selected)}
                scope="day"
                dueDate={selected}
                goals={goals}
                mult={mult}
                actions={actions}
                today={today}
                emptyText="Nothing planned for this day."
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 7 }, (_, i) => addDays(ws, i)).map((d) => {
              const list = dayTasks(d);
              const done = list.filter((t) => t.completed).length;
              return (
                <div
                  key={d}
                  className={`rounded-xl border p-3 ${d === today ? "border-sky-400/70 shadow-[0_0_18px_rgba(56,189,248,0.3)]" : "border-[rgba(94,129,255,0.2)]"} bg-[rgba(5,7,22,0.4)]`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className={`sys-title ${d === today ? "" : "!text-indigo-200 !shadow-none"}`}>
                      {parseISO(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </h4>
                    <span className="display text-xs font-bold text-mute">
                      {done}/{list.length}
                    </span>
                  </div>
                  {goalsByDay.get(d) && <p className="mb-2 text-xs text-amber-300">🎯 {goalsByDay.get(d)!.join(", ")}</p>}
                  <TaskList
                    tasks={list}
                    scope="day"
                    dueDate={d}
                    goals={goals}
                    mult={mult}
                    actions={actions}
                    today={today}
                    compact
                  />
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {mode === "week" ? (
        <Panel title={`Weekly Quests · ${fmtShort(ws)} – ${fmtShort(addDays(ws, 6))}`} icon="🗓">
          <TaskList
            tasks={weekQuests}
            scope="week"
            dueDate={ws}
            goals={goals}
            mult={mult}
            actions={actions}
            today={today}
            emptyText="No weekly quests. Weekly quests pay ×1.5 XP & coins."
            placeholder="Weekly quest… e.g. Finish chapter 4"
          />
        </Panel>
      ) : (
        <Panel title={`Monthly Objectives · ${fmtMonth(ms)}`} icon="🗓">
          <TaskList
            tasks={monthQuests}
            scope="month"
            dueDate={ms}
            goals={goals}
            mult={mult}
            actions={actions}
            today={today}
            emptyText="No monthly objectives. Monthly quests pay ×2.5 XP & coins."
            placeholder="Monthly objective… e.g. Read 2 books"
          />
        </Panel>
      )}
    </div>
  );
}
