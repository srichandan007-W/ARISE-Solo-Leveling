"use client";

import { useState } from "react";
import { daysBetween, fmtShort } from "@/lib/dates";
import { goalProgress, GOAL_SIZES } from "@/lib/game";
import type { Actions, GameState, Goal, GoalSize } from "@/lib/types";
import { AddTask, TaskItem } from "./TaskList";
import { Bar, Chip, Empty, Panel } from "./ui";

export function Goals({
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
  const active = state.goals.filter((g) => !g.completed);
  const done = state.goals.filter((g) => g.completed);
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        {active.length === 0 ? (
          <Panel title="Active Gates" icon="🎯">
            <Empty>No gates are open. Create a long‑term goal — then link daily/weekly quests to it to fill its progress bar.</Empty>
          </Panel>
        ) : (
          active.map((g) => <GoalCard key={g.id} goal={g} state={state} today={today} mult={mult} actions={actions} />)
        )}
        {done.length > 0 && (
          <Panel title="Cleared Gates" icon="🏆">
            <ul className="space-y-2">
              {done.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-3 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3 py-2">
                  <span className="font-semibold text-emerald-200">✓ {g.title}</span>
                  <span className="text-xs text-mute">{GOAL_SIZES[g.size].label}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
      <NewGoalForm onAdd={actions.addGoal} />
    </div>
  );
}

function GoalCard({
  goal,
  state,
  today,
  mult,
  actions,
}: {
  goal: Goal;
  state: GameState;
  today: string;
  mult: number;
  actions: Actions;
}) {
  const [showTasks, setShowTasks] = useState(false);
  const linked = state.tasks.filter((t) => t.goalId === goal.id);
  const prog = goalProgress(goal, linked);
  const size = GOAL_SIZES[goal.size];
  const left = goal.targetDate ? daysBetween(today, goal.targetDate) : null;
  const ready = prog.pct >= 100;

  return (
    <Panel className={ready ? "pulse-glow" : ""}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Chip color={size.color}>{size.label}</Chip>
            {left !== null && (
              <Chip color={left < 0 ? "#fb7185" : left <= 7 ? "#fbbf24" : "#7f8bb5"}>
                {left < 0 ? `${-left}d past due` : left === 0 ? "due today" : `${left}d left`} · {fmtShort(goal.targetDate!)}
              </Chip>
            )}
          </div>
          <h3 className="display mt-2 text-lg font-bold">{goal.title}</h3>
          {goal.description && <p className="mt-0.5 text-sm text-mute">{goal.description}</p>}
        </div>
        <div className="text-right text-sm">
          <p className="font-bold text-indigo-200">+{size.xp} XP</p>
          <p className="font-bold text-gold">+{size.coins} ◈</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-mute">
            {prog.auto ? `${prog.done}/${prog.linked} linked quests cleared` : "Manual progress"}
          </span>
          <span className="display font-bold text-sky-200">{prog.pct}%</span>
        </div>
        <Bar pct={prog.pct} color={size.color} className="!h-3" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!prog.auto && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => actions.setGoalProgress(goal.id, prog.pct - 10)} disabled={prog.pct <= 0}>
              −10%
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => actions.setGoalProgress(goal.id, prog.pct + 10)} disabled={prog.pct >= 100}>
              +10%
            </button>
          </>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => setShowTasks((s) => !s)}>
          {showTasks ? "Hide" : "Quests"} ({linked.length})
        </button>
        <button
          className="btn btn-gold btn-sm"
          disabled={!ready}
          onClick={(e) => actions.claimGoal(goal, e.currentTarget)}
        >
          {ready ? "Claim reward" : "Locked"}
        </button>
        <button
          className="btn btn-ghost btn-sm ml-auto !text-rose-300"
          onClick={() => {
            if (confirm(`Abandon "${goal.title}"? Linked quests stay but are unlinked.`)) actions.deleteGoal(goal.id);
          }}
        >
          Abandon
        </button>
      </div>

      {showTasks && (
        <div className="mt-4 space-y-2 border-t border-[rgba(94,129,255,0.2)] pt-4">
          {linked.map((t) => (
            <TaskItem key={t.id} task={t} mult={mult} actions={actions} today={today} compact goals={state.goals} />
          ))}
          <AddTask
            scope="day"
            dueDate={today}
            goals={state.goals}
            mult={mult}
            onAdd={actions.addTask}
            defaultGoalId={goal.id}
            placeholder="Add a quest toward this goal…"
          />
        </div>
      )}
    </Panel>
  );
}

function NewGoalForm({ onAdd }: { onAdd: Actions["addGoal"] }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [size, setSize] = useState<GoalSize>("medium");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      await onAdd({ title, description, targetDate: targetDate || null, size });
      setTitle("");
      setDescription("");
      setTargetDate("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Open a New Gate" icon="🌀" className="h-fit">
      <form onSubmit={submit} className="space-y-3">
        <input className="field" placeholder="e.g. Pass the calculus exam" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} aria-label="Goal title" />
        <textarea className="field min-h-[70px]" placeholder="Why does it matter? (optional)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} aria-label="Goal description" />
        <div>
          <label className="mb-1 block text-xs text-mute">Target date (optional)</label>
          <input className="field" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </div>
        <div>
          <p className="mb-1 text-xs text-mute">Gate size — bigger gates pay bigger rewards</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(GOAL_SIZES) as GoalSize[]).map((k) => (
              <button
                type="button"
                key={k}
                onClick={() => setSize(k)}
                className={`rounded-lg border px-2 py-2 text-center text-xs transition ${size === k ? "bg-white/5" : "opacity-60 hover:opacity-100"}`}
                style={{ borderColor: GOAL_SIZES[k].color, color: GOAL_SIZES[k].color, boxShadow: size === k ? `0 0 14px ${GOAL_SIZES[k].color}88` : undefined }}
              >
                <b className="block">{GOAL_SIZES[k].label}</b>
                <span className="text-[0.65rem]">{GOAL_SIZES[k].xp} XP · {GOAL_SIZES[k].coins}◈</span>
              </button>
            ))}
          </div>
        </div>
        <button className="btn w-full" disabled={!title.trim() || busy}>
          Open gate
        </button>
      </form>
    </Panel>
  );
}
