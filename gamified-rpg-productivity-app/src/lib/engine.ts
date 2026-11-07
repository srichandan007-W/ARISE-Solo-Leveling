import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, goals, player, purchases, rewards, tasks } from "@/db/schema";
import { addDays, addMonths, ISO_RE, monthStart, weekStart } from "./dates";
import {
  calcPomodoroReward,
  calcTaskReward,
  DAILY_BONUS,
  DIFFICULTIES,
  CATEGORIES,
  GOAL_SIZES,
  goalProgress,
  levelFromXp,
  streakMultiplier,
} from "./game";
import type { Feedback, GameState } from "./types";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const DEFAULT_REWARDS = [
  { name: "5‑minute stretch break", description: "Stand up, stretch, breathe.", icon: "🧘", cost: 10, minLevel: 1 },
  { name: "15 minutes of break time", description: "Guilt‑free scrolling or a walk.", icon: "☕", cost: 25, minLevel: 1 },
  { name: "One anime episode", description: "Watch a single episode. Just one.", icon: "📺", cost: 40, minLevel: 1 },
  { name: "30 minutes of gaming", description: "Unlock half an hour of play.", icon: "🎮", cost: 50, minLevel: 1 },
  { name: "Favourite snack", description: "Treat yourself to something tasty.", icon: "🍫", cost: 80, minLevel: 2 },
  { name: "Cheat meal", description: "Your favourite meal, no regrets.", icon: "🍔", cost: 150, minLevel: 4 },
  { name: "Movie night", description: "A full movie of your choice.", icon: "🎬", cost: 200, minLevel: 6 },
  { name: "Lazy half‑day", description: "An earned afternoon off.", icon: "🛌", cost: 500, minLevel: 10 },
];

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

async function ensurePlayer() {
  await db.insert(player).values({ id: 1 }).onConflictDoNothing();
}

async function seedRewards() {
  const [{ n }] = await db.select({ n: count() }).from(rewards);
  if (n === 0) await db.insert(rewards).values(DEFAULT_REWARDS).onConflictDoNothing();
}

export async function getState(today: string): Promise<GameState> {
  await ensurePlayer();
  await seedRewards();
  const [p] = await db.select().from(player).where(eq(player.id, 1));
  const [t, g, r, pu, ev, pom, todayCount] = await Promise.all([
    db.select().from(tasks).orderBy(asc(tasks.createdAt), asc(tasks.id)),
    db.select().from(goals).orderBy(asc(goals.completed), asc(goals.createdAt)),
    db.select().from(rewards).orderBy(asc(rewards.cost)),
    db.select().from(purchases).orderBy(desc(purchases.purchasedAt)).limit(40),
    db.select().from(events).orderBy(desc(events.createdAt), desc(events.id)).limit(12),
    db
      .select({ n: count() })
      .from(events)
      .where(and(eq(events.type, "pomodoro"), eq(events.localDate, today))),
    db
      .select({ n: count() })
      .from(tasks)
      .where(and(eq(tasks.completed, true), eq(tasks.completedDate, today))),
  ]);
  const yesterday = addDays(today, -1);
  const alive = p.lastStreakDate === today || p.lastStreakDate === yesterday;
  const view = {
    ...p,
    currentStreak: alive ? p.streak : 0,
    streakDoneToday: p.lastStreakDate === today,
  };
  return JSON.parse(
    JSON.stringify({
      player: view,
      tasks: t,
      goals: g,
      rewards: r,
      purchases: pu,
      events: ev,
      todayCount: todayCount[0].n,
      pomodorosToday: pom[0].n,
    }),
  ) as GameState;
}

async function lockPlayer(tx: Tx) {
  await tx.insert(player).values({ id: 1 }).onConflictDoNothing();
  const [p] = await tx.select().from(player).where(eq(player.id, 1)).for("update");
  return p;
}

function activeStreak(p: { streak: number; lastStreakDate: string | null }, today: string) {
  return p.lastStreakDate === today || p.lastStreakDate === addDays(today, -1) ? p.streak : 0;
}

/* ------------------------------------------------------------------ */
/*  Tasks                                                              */
/* ------------------------------------------------------------------ */

export async function createTask(body: Record<string, unknown>, today: string) {
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
  if (!title) throw new ApiError("Quest title is required");
  const scope = oneOf(body.scope, ["day", "week", "month"] as const, "day");
  let due = typeof body.dueDate === "string" && ISO_RE.test(body.dueDate) ? body.dueDate : today;
  if (scope === "week") due = weekStart(due);
  if (scope === "month") due = monthStart(due);
  const difficulty = oneOf(body.difficulty, Object.keys(DIFFICULTIES) as (keyof typeof DIFFICULTIES)[], "easy");
  const category = oneOf(body.category, Object.keys(CATEGORIES) as (keyof typeof CATEGORIES)[], "agi");
  const minutes = Number(body.estimateMinutes);
  const estimateMinutes = Number.isFinite(minutes) && minutes > 0 ? Math.min(1440, Math.round(minutes)) : null;
  const goalIdNum = Number(body.goalId);
  const goalId = Number.isInteger(goalIdNum) && goalIdNum > 0 ? goalIdNum : null;
  await db.insert(tasks).values({ title, scope, dueDate: due, difficulty, category, estimateMinutes, goalId });
}

export async function updateTask(id: number, body: Record<string, unknown>, today: string): Promise<Feedback | void> {
  if (typeof body.completed === "boolean") return setTaskCompleted(id, body.completed, today);
  if (typeof body.dueDate === "string" && ISO_RE.test(body.dueDate)) {
    await db.update(tasks).set({ dueDate: body.dueDate }).where(eq(tasks.id, id));
  }
}

export async function deleteTask(id: number) {
  await db.delete(tasks).where(eq(tasks.id, id));
}

async function setTaskCompleted(id: number, done: boolean, today: string): Promise<Feedback> {
  return db.transaction(async (tx) => {
    const p = await lockPlayer(tx);
    const [task] = await tx.select().from(tasks).where(eq(tasks.id, id)).for("update");
    if (!task) throw new ApiError("Quest not found", 404);
    const yesterday = addDays(today, -1);
    const levelBefore = levelFromXp(p.xp).level;

    if (done) {
      if (task.completed) return { xp: 0, coins: 0 };
      const mult = streakMultiplier(activeStreak(p, today));
      const base = calcTaskReward({
        difficulty: task.difficulty as keyof typeof DIFFICULTIES,
        scope: task.scope as "day" | "week" | "month",
        estimateMinutes: task.estimateMinutes,
      });
      let xp = Math.round(base.xp * mult);
      let coins = Math.round(base.coins * mult);
      await tx
        .update(tasks)
        .set({ completed: true, completedAt: new Date(), completedDate: today, xpAwarded: xp, coinsAwarded: coins })
        .where(eq(tasks.id, id));
      await tx.insert(events).values({ type: "task", message: `Cleared: ${task.title}`, xp, coins, localDate: today });

      const [{ n }] = await tx
        .select({ n: count() })
        .from(tasks)
        .where(and(eq(tasks.completed, true), eq(tasks.completedDate, today)));

      let streak = p.streak;
      let best = p.bestStreak;
      let last = p.lastStreakDate;
      let bonusDate = p.bonusDate;
      let bonusXp = p.bonusXp;
      let bonusCoins = p.bonusCoins;
      let dailyCleared = false;
      if (n >= p.dailyTarget && last !== today) {
        streak = last === yesterday ? p.streak + 1 : 1;
        best = Math.max(best, streak);
        last = today;
        dailyCleared = true;
        const m = streakMultiplier(streak);
        bonusXp = Math.round(DAILY_BONUS.xp * m);
        bonusCoins = Math.round(DAILY_BONUS.coins * m);
        bonusDate = today;
        xp += bonusXp;
        coins += bonusCoins;
        await tx.insert(events).values({
          type: "daily",
          message: `Daily quest cleared — streak ${streak} 🔥`,
          xp: bonusXp,
          coins: bonusCoins,
          localDate: today,
        });
      }
      const newXp = p.xp + xp;
      await tx
        .update(player)
        .set({
          xp: newXp,
          coins: p.coins + coins,
          streak,
          bestStreak: best,
          lastStreakDate: last,
          bonusDate,
          bonusXp,
          bonusCoins,
        })
        .where(eq(player.id, 1));
      const levelAfter = levelFromXp(newXp).level;
      return {
        xp,
        coins,
        multiplier: mult,
        dailyCleared,
        streak,
        levelUp: levelAfter > levelBefore ? levelAfter : undefined,
      };
    }

    // ---- un-tick: refund everything that this task paid out ----
    if (!task.completed) return { xp: 0, coins: 0 };
    let xp = task.xpAwarded;
    let coins = task.coinsAwarded;
    await tx
      .update(tasks)
      .set({ completed: false, completedAt: null, completedDate: null, xpAwarded: 0, coinsAwarded: 0 })
      .where(eq(tasks.id, id));
    const [{ n }] = await tx
      .select({ n: count() })
      .from(tasks)
      .where(and(eq(tasks.completed, true), eq(tasks.completedDate, today)));

    let streak = p.streak;
    let last = p.lastStreakDate;
    let streakLost = false;
    let bonusDate = p.bonusDate;
    let bonusXp = p.bonusXp;
    let bonusCoins = p.bonusCoins;
    if (last === today && n < p.dailyTarget) {
      streak = Math.max(0, p.streak - 1);
      last = streak > 0 ? yesterday : null;
      streakLost = true;
      if (bonusDate === today) {
        xp += bonusXp;
        coins += bonusCoins;
      }
      bonusDate = null;
      bonusXp = 0;
      bonusCoins = 0;
    }
    const newXp = Math.max(0, p.xp - xp);
    await tx
      .update(player)
      .set({
        xp: newXp,
        coins: Math.max(0, p.coins - coins),
        streak,
        lastStreakDate: last,
        bonusDate,
        bonusXp,
        bonusCoins,
      })
      .where(eq(player.id, 1));
    return { xp: -xp, coins: -coins, streakLost, levelDown: levelFromXp(newXp).level < levelBefore };
  });
}

/* ------------------------------------------------------------------ */
/*  Goals                                                              */
/* ------------------------------------------------------------------ */

export async function createGoal(body: Record<string, unknown>) {
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
  if (!title) throw new ApiError("Goal title is required");
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 500) : null;
  const targetDate = typeof body.targetDate === "string" && ISO_RE.test(body.targetDate) ? body.targetDate : null;
  const size = oneOf(body.size, ["small", "medium", "large"] as const, "medium");
  await db.insert(goals).values({ title, description: description || null, targetDate, size });
}

export async function updateGoal(id: number, body: Record<string, unknown>, today: string): Promise<Feedback | void> {
  if (body.claim === true) return claimGoal(id, today);
  const n = Number(body.manualProgress);
  if (Number.isFinite(n)) {
    await db
      .update(goals)
      .set({ manualProgress: Math.min(100, Math.max(0, Math.round(n))) })
      .where(eq(goals.id, id));
  }
}

export async function deleteGoal(id: number) {
  await db.transaction(async (tx) => {
    await tx.update(tasks).set({ goalId: null }).where(eq(tasks.goalId, id));
    await tx.delete(goals).where(eq(goals.id, id));
  });
}

async function claimGoal(id: number, today: string): Promise<Feedback> {
  return db.transaction(async (tx) => {
    const p = await lockPlayer(tx);
    const [goal] = await tx.select().from(goals).where(eq(goals.id, id)).for("update");
    if (!goal) throw new ApiError("Goal not found", 404);
    if (goal.completed) throw new ApiError("Reward already claimed");
    const linked = await tx.select({ completed: tasks.completed }).from(tasks).where(eq(tasks.goalId, id));
    if (goalProgress(goal, linked).pct < 100) throw new ApiError("Goal is not complete yet");
    const size = GOAL_SIZES[goal.size as keyof typeof GOAL_SIZES] ?? GOAL_SIZES.medium;
    const levelBefore = levelFromXp(p.xp).level;
    const newXp = p.xp + size.xp;
    await tx.update(goals).set({ completed: true, completedAt: new Date(), manualProgress: 100 }).where(eq(goals.id, id));
    await tx
      .update(player)
      .set({ xp: newXp, coins: p.coins + size.coins })
      .where(eq(player.id, 1));
    await tx.insert(events).values({
      type: "goal",
      message: `Gate cleared: ${goal.title}`,
      xp: size.xp,
      coins: size.coins,
      localDate: today,
    });
    const levelAfter = levelFromXp(newXp).level;
    return { xp: size.xp, coins: size.coins, message: "GATE CLEARED", levelUp: levelAfter > levelBefore ? levelAfter : undefined };
  });
}

/* ------------------------------------------------------------------ */
/*  Shop                                                               */
/* ------------------------------------------------------------------ */

export async function createReward(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const cost = Math.round(Number(body.cost));
  if (!name) throw new ApiError("Reward name is required");
  if (!Number.isFinite(cost) || cost < 1 || cost > 100000) throw new ApiError("Cost must be between 1 and 100000");
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 200) : "";
  const icon = typeof body.icon === "string" && body.icon.trim() ? body.icon.trim().slice(0, 8) : "🎁";
  const minLevel = Math.min(200, Math.max(1, Math.round(Number(body.minLevel)) || 1));
  const [dupe] = await db.select({ id: rewards.id }).from(rewards).where(eq(rewards.name, name));
  if (dupe) throw new ApiError("A reward with that name already exists");
  await db.insert(rewards).values({ name, description, icon, cost, minLevel, isCustom: true });
}

export async function deleteReward(id: number) {
  await db.delete(rewards).where(eq(rewards.id, id));
}

export async function buyReward(id: number, today: string): Promise<Feedback> {
  return db.transaction(async (tx) => {
    const p = await lockPlayer(tx);
    const [reward] = await tx.select().from(rewards).where(eq(rewards.id, id));
    if (!reward) throw new ApiError("Reward not found", 404);
    if (levelFromXp(p.xp).level < reward.minLevel) throw new ApiError(`Requires level ${reward.minLevel}`);
    if (p.coins < reward.cost) throw new ApiError("Not enough coins");
    await tx.update(player).set({ coins: p.coins - reward.cost }).where(eq(player.id, 1));
    await tx.insert(purchases).values({ rewardId: reward.id, name: reward.name, icon: reward.icon, cost: reward.cost });
    await tx.insert(events).values({
      type: "purchase",
      message: `Purchased: ${reward.name}`,
      xp: 0,
      coins: -reward.cost,
      localDate: today,
    });
    return { xp: 0, coins: -reward.cost, message: reward.name };
  });
}

export async function markItemUsed(id: number) {
  await db.update(purchases).set({ usedAt: new Date() }).where(and(eq(purchases.id, id), sql`${purchases.usedAt} is null`));
}

/* ------------------------------------------------------------------ */
/*  Player & Pomodoro                                                  */
/* ------------------------------------------------------------------ */

export async function updatePlayer(body: Record<string, unknown>) {
  await ensurePlayer();
  const n = Math.round(Number(body.dailyTarget));
  if (Number.isFinite(n)) {
    await db
      .update(player)
      .set({ dailyTarget: Math.min(10, Math.max(1, n)) })
      .where(eq(player.id, 1));
  }
}

export async function completePomodoro(body: Record<string, unknown>, today: string): Promise<Feedback> {
  const minutes = Math.round(Number(body.minutes));
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 120) throw new ApiError("Invalid session length");
  return db.transaction(async (tx) => {
    const p = await lockPlayer(tx);
    const mult = streakMultiplier(activeStreak(p, today));
    const { xp, coins } = calcPomodoroReward(minutes, mult);
    const newXp = p.xp + xp;
    const levelBefore = levelFromXp(p.xp).level;
    await tx
      .update(player)
      .set({
        xp: newXp,
        coins: p.coins + coins,
        totalPomodoros: p.totalPomodoros + 1,
        focusMinutes: p.focusMinutes + minutes,
      })
      .where(eq(player.id, 1));
    await tx.insert(events).values({ type: "pomodoro", message: `Focus session · ${minutes} min`, xp, coins, localDate: today });
    const levelAfter = levelFromXp(newXp).level;
    return { xp, coins, multiplier: mult, levelUp: levelAfter > levelBefore ? levelAfter : undefined };
  });
}

// keep helper exports referenced for tree-shaking friendliness
export const _dateHelpers = { addMonths };
