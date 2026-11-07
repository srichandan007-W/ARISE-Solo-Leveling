import type { Category, Difficulty, Goal, GoalSize, Scope, Task } from "./types";

/* ------------------------------------------------------------------ */
/*  Quest difficulty, scope & categories                               */
/* ------------------------------------------------------------------ */

export const DIFFICULTIES: Record<
  Difficulty,
  { label: string; rank: string; xp: number; coins: number; color: string; hint: string }
> = {
  easy: { label: "Easy", rank: "E", xp: 10, coins: 2, color: "#94a3b8", hint: "Quick win (< 15 min)" },
  medium: { label: "Medium", rank: "C", xp: 25, coins: 5, color: "#38bdf8", hint: "Real effort (30–60 min)" },
  hard: { label: "Hard", rank: "A", xp: 50, coins: 10, color: "#a78bfa", hint: "Deep work (1–3 h)" },
  epic: { label: "Epic", rank: "S", xp: 100, coins: 25, color: "#fbbf24", hint: "Boss fight (half a day+)" },
};

export const SCOPE_MULT: Record<Scope, number> = { day: 1, week: 1.5, month: 2.5 };
export const SCOPE_LABEL: Record<Scope, string> = { day: "Daily", week: "Weekly", month: "Monthly" };

export const CATEGORIES: Record<Category, { label: string; short: string; icon: string; color: string }> = {
  str: { label: "Strength", short: "STR", icon: "⚔️", color: "#f43f5e" },
  int: { label: "Intelligence", short: "INT", icon: "📖", color: "#38bdf8" },
  vit: { label: "Vitality", short: "VIT", icon: "❤️", color: "#34d399" },
  agi: { label: "Agility", short: "AGI", icon: "⚡", color: "#fbbf24" },
  sen: { label: "Sense", short: "SEN", icon: "👁️", color: "#a78bfa" },
};

export const GOAL_SIZES: Record<GoalSize, { label: string; xp: number; coins: number; color: string }> = {
  small: { label: "Minor Gate", xp: 150, coins: 30, color: "#38bdf8" },
  medium: { label: "Major Gate", xp: 300, coins: 60, color: "#a78bfa" },
  large: { label: "Red Gate", xp: 600, coins: 150, color: "#f43f5e" },
};

export const DAILY_BONUS = { xp: 30, coins: 10 };

/* ------------------------------------------------------------------ */
/*  Rewards                                                            */
/* ------------------------------------------------------------------ */

const MAX_MINUTES_FOR_XP = 480;

/** Base reward (before streak multiplier). Longer + harder + broader scope = more. */
export function calcTaskReward(t: {
  difficulty: Difficulty;
  scope: Scope;
  estimateMinutes: number | null;
}): { xp: number; coins: number } {
  const d = DIFFICULTIES[t.difficulty];
  const minutes = Math.min(t.estimateMinutes ?? 0, MAX_MINUTES_FOR_XP);
  const m = SCOPE_MULT[t.scope];
  return {
    xp: Math.round((d.xp + minutes * 0.4) * m),
    coins: Math.round((d.coins + Math.floor(minutes / 30)) * m),
  };
}

export function calcPomodoroReward(minutes: number, multiplier: number) {
  return {
    xp: Math.round(minutes * 0.6 * multiplier),
    coins: Math.floor((minutes / 10) * multiplier),
  };
}

/* ------------------------------------------------------------------ */
/*  Streaks                                                            */
/* ------------------------------------------------------------------ */

export const STREAK_TIERS = [
  { days: 0, mult: 1 },
  { days: 5, mult: 1.25 },
  { days: 10, mult: 1.5 },
  { days: 20, mult: 1.75 },
  { days: 30, mult: 2 },
  { days: 60, mult: 2.5 },
];

export function streakMultiplier(streak: number): number {
  let m = 1;
  for (const t of STREAK_TIERS) if (streak >= t.days) m = t.mult;
  return m;
}

export function nextStreakTier(streak: number) {
  return STREAK_TIERS.find((t) => t.days > streak) ?? null;
}

/* ------------------------------------------------------------------ */
/*  Levels                                                             */
/* ------------------------------------------------------------------ */

/** XP needed to go from `level` to `level + 1`. */
export function xpForNext(level: number): number {
  return 100 + (level - 1) * 50;
}

export function levelFromXp(xp: number) {
  let level = 1;
  let rem = Math.max(0, xp);
  while (rem >= xpForNext(level)) {
    rem -= xpForNext(level);
    level++;
  }
  const needed = xpForNext(level);
  return { level, into: rem, needed, pct: (rem / needed) * 100 };
}

export function rankForLevel(level: number): { rank: string; title: string; color: string } {
  if (level >= 100) return { rank: "∞", title: "Shadow Monarch", color: "#c084fc" };
  if (level >= 75) return { rank: "N", title: "National-Level Hunter", color: "#f472b6" };
  if (level >= 50) return { rank: "S", title: "S-Rank Hunter", color: "#fbbf24" };
  if (level >= 35) return { rank: "A", title: "A-Rank Hunter", color: "#f97316" };
  if (level >= 20) return { rank: "B", title: "B-Rank Hunter", color: "#a78bfa" };
  if (level >= 10) return { rank: "C", title: "C-Rank Hunter", color: "#38bdf8" };
  if (level >= 5) return { rank: "D", title: "D-Rank Hunter", color: "#34d399" };
  return { rank: "E", title: "E-Rank Hunter", color: "#94a3b8" };
}

/* ------------------------------------------------------------------ */
/*  Stats & goals                                                      */
/* ------------------------------------------------------------------ */

export function computeStats(tasks: Task[]): Record<Category, number> {
  const sums: Record<Category, number> = { str: 0, int: 0, vit: 0, agi: 0, sen: 0 };
  for (const t of tasks) if (t.completed) sums[t.category] += t.xpAwarded;
  return {
    str: 5 + Math.floor(sums.str / 15),
    int: 5 + Math.floor(sums.int / 15),
    vit: 5 + Math.floor(sums.vit / 15),
    agi: 5 + Math.floor(sums.agi / 15),
    sen: 5 + Math.floor(sums.sen / 15),
  };
}

export function goalProgress(
  goal: Pick<Goal, "manualProgress" | "completed">,
  linked: { completed: boolean }[],
) {
  if (goal.completed) return { pct: 100, linked: linked.length, done: linked.length, auto: linked.length > 0 };
  if (linked.length === 0) {
    return { pct: Math.min(100, Math.max(0, goal.manualProgress)), linked: 0, done: 0, auto: false };
  }
  const done = linked.filter((t) => t.completed).length;
  return { pct: Math.round((done / linked.length) * 100), linked: linked.length, done, auto: true };
}
