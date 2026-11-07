"use client";

import { useState } from "react";
import {
  calcTaskReward,
  CATEGORIES,
  DIFFICULTIES,
  SCOPE_LABEL,
} from "@/lib/game";
import { daysBetween, fmtShort } from "@/lib/dates";
import type { Actions, Category, Difficulty, Goal, Scope, Task } from "@/lib/types";
import { Chip, Empty } from "./ui";

export function TaskItem({
  task,
  mult,
  actions,
  today,
  compact,
  goals,
}: {
  task: Task;
  mult: number;
  actions: Actions;
  today: string;
  compact?: boolean;
  goals?: Goal[];
}) {
  const d = DIFFICULTIES[task.difficulty];
  const cat = CATEGORIES[task.category];
  const base = calcTaskReward(task);
  const xp = task.completed ? task.xpAwarded : Math.round(base.xp * mult);
  const coins = task.completed ? task.coinsAwarded : Math.round(base.coins * mult);
  const overdue = !task.completed && task.scope === "day" && task.dueDate < today;
  const goal = task.goalId ? goals?.find((g) => g.id === task.goalId) : undefined;

  return (
    <div className={`task-row group ${task.completed ? "done" : ""} ${compact ? "!gap-2 !p-2" : ""}`}>
      <button
        type="button"
        className={`check ${task.completed ? "checked" : ""}`}
        onClick={(e) => actions.toggleTask(task, e.currentTarget)}
        aria-label={task.completed ? "Mark as not done" : "Mark as done"}
        aria-pressed={task.completed}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#03130d" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </button>

      <div className="min-w-0 flex-1">
        <p className={`task-title truncate font-semibold ${compact ? "text-sm" : "text-[1.02rem]"}`} title={task.title}>
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Chip color={d.color} title={`${d.label} — ${d.hint}`}>
            {d.rank}-Rank
          </Chip>
          {!compact && (
            <Chip color={cat.color} title={cat.label}>
              {cat.icon} {cat.short}
            </Chip>
          )}
          {task.estimateMinutes ? (
            <Chip color="#7f8bb5">⏱ {task.estimateMinutes >= 60 ? `${+(task.estimateMinutes / 60).toFixed(1)}h` : `${task.estimateMinutes}m`}</Chip>
          ) : null}
          {task.scope !== "day" && !compact && <Chip color="#c084fc">{SCOPE_LABEL[task.scope]}</Chip>}
          {goal && !compact && <Chip color="#38bdf8">🎯 {goal.title.length > 18 ? goal.title.slice(0, 18) + "…" : goal.title}</Chip>}
          {overdue && (
            <Chip color="#fb7185">
              ⚠ {daysBetween(task.dueDate, today)}d overdue · {fmtShort(task.dueDate)}
            </Chip>
          )}
        </div>
      </div>

      <div className="flex flex-none flex-col items-end gap-0.5 text-right">
        <span className={`display text-xs font-bold ${task.completed ? "text-emerald-300" : "text-indigo-200"}`}>
          {task.completed ? "+" : ""}
          {xp} XP
        </span>
        <span className="text-xs font-semibold text-gold">
          {task.completed ? "+" : ""}
          {coins} ◈
        </span>
      </div>

      <div className="flex flex-none gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100 max-sm:opacity-100">
        {overdue && (
          <button
            type="button"
            title="Move to today"
            onClick={() => actions.moveTask(task.id, today)}
            className="rounded-md px-1.5 text-sm text-sky-300 hover:bg-sky-400/10"
          >
            ↪
          </button>
        )}
        <button
          type="button"
          title="Delete quest"
          aria-label="Delete quest"
          onClick={() => actions.deleteTask(task.id)}
          className="rounded-md px-1.5 text-sm text-rose-400 hover:bg-rose-400/10"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function AddTask({
  scope,
  dueDate,
  goals,
  mult,
  onAdd,
  compact,
  placeholder,
  defaultGoalId,
}: {
  scope: Scope;
  dueDate: string;
  goals: Goal[];
  mult: number;
  onAdd: Actions["addTask"];
  compact?: boolean;
  placeholder?: string;
  defaultGoalId?: number;
}) {
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [category, setCategory] = useState<Category>("agi");
  const [minutes, setMinutes] = useState("");
  const [goalId, setGoalId] = useState(defaultGoalId ? String(defaultGoalId) : "");
  const [open, setOpen] = useState(!compact);
  const [busy, setBusy] = useState(false);

  const est = minutes ? Math.max(0, Number(minutes)) : null;
  const preview = calcTaskReward({ difficulty, scope, estimateMinutes: est });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      await onAdd({
        title,
        scope,
        dueDate,
        difficulty,
        category,
        estimateMinutes: est && est > 0 ? est : null,
        goalId: goalId ? Number(goalId) : null,
      });
      setTitle("");
      setMinutes("");
      if (compact) setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-ghost btn-sm w-full">
        ＋ Add
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl border border-[rgba(94,129,255,0.2)] bg-[rgba(5,7,22,0.45)] p-2.5">
      <div className="flex gap-2">
        <input
          className="field"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={placeholder ?? "New quest… e.g. Study Math for 2 hours"}
          maxLength={200}
          autoFocus={compact}
          aria-label="Quest title"
        />
        <button className="btn flex-none" disabled={!title.trim() || busy}>
          Add
        </button>
      </div>
      <div className={`grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
        <select className="field" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} aria-label="Difficulty">
          {(Object.keys(DIFFICULTIES) as Difficulty[]).map((k) => (
            <option key={k} value={k}>
              {DIFFICULTIES[k].rank}-Rank · {DIFFICULTIES[k].label}
            </option>
          ))}
        </select>
        <input
          className="field"
          type="number"
          min={1}
          max={1440}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          placeholder="Minutes"
          aria-label="Estimated minutes"
        />
        <select className="field" value={category} onChange={(e) => setCategory(e.target.value as Category)} aria-label="Stat category">
          {(Object.keys(CATEGORIES) as Category[]).map((k) => (
            <option key={k} value={k}>
              {CATEGORIES[k].icon} {CATEGORIES[k].label}
            </option>
          ))}
        </select>
        <select className="field" value={goalId} onChange={(e) => setGoalId(e.target.value)} aria-label="Linked goal">
          <option value="">No goal</option>
          {goals
            .filter((g) => !g.completed)
            .map((g) => (
              <option key={g.id} value={g.id}>
                🎯 {g.title}
              </option>
            ))}
        </select>
      </div>
      <p className="text-xs text-mute">
        Reward:{" "}
        <span className="font-bold text-indigo-200">+{Math.round(preview.xp * mult)} XP</span>{" "}
        <span className="font-bold text-gold">+{Math.round(preview.coins * mult)} ◈</span>
        {mult > 1 && <span className="text-orange-400"> (streak ×{mult})</span>}
        {" · "}more minutes & higher rank = bigger rewards
      </p>
    </form>
  );
}

export function TaskList({
  tasks,
  scope,
  dueDate,
  goals,
  mult,
  actions,
  today,
  compact,
  emptyText,
  placeholder,
  hideAdd,
}: {
  tasks: Task[];
  scope: Scope;
  dueDate: string;
  goals: Goal[];
  mult: number;
  actions: Actions;
  today: string;
  compact?: boolean;
  emptyText?: string;
  placeholder?: string;
  hideAdd?: boolean;
}) {
  const sorted = [...tasks].sort((a, b) => Number(a.completed) - Number(b.completed));
  return (
    <div className="space-y-2">
      {sorted.length === 0 ? (
        compact ? null : <Empty>{emptyText ?? "No quests yet — add your first one below."}</Empty>
      ) : (
        sorted.map((t) => (
          <TaskItem key={t.id} task={t} mult={mult} actions={actions} today={today} compact={compact} goals={goals} />
        ))
      )}
      {!hideAdd && (
        <AddTask
          scope={scope}
          dueDate={dueDate}
          goals={goals}
          mult={mult}
          onAdd={actions.addTask}
          compact={compact}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}
