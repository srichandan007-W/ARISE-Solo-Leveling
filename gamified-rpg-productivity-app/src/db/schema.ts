import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/** Single-hunter profile (row id = 1). Swap for a users table when adding auth. */
export const player = pgTable("player", {
  id: integer("id").primaryKey(),
  name: text("name").notNull().default("Hunter"),
  xp: integer("xp").notNull().default(0),
  coins: integer("coins").notNull().default(0),
  streak: integer("streak").notNull().default(0),
  bestStreak: integer("best_streak").notNull().default(0),
  lastStreakDate: text("last_streak_date"),
  dailyTarget: integer("daily_target").notNull().default(3),
  // Daily-clear bonus that was paid today (so it can be revoked if a task is un-ticked)
  bonusDate: text("bonus_date"),
  bonusXp: integer("bonus_xp").notNull().default(0),
  bonusCoins: integer("bonus_coins").notNull().default(0),
  totalPomodoros: integer("total_pomodoros").notNull().default(0),
  focusMinutes: integer("focus_minutes").notNull().default(0),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  notes: text("notes"),
  scope: text("scope").notNull().default("day"), // day | week | month
  dueDate: text("due_date").notNull(), // day: date, week: monday, month: first of month
  difficulty: text("difficulty").notNull().default("easy"), // easy | medium | hard | epic
  category: text("category").notNull().default("agi"), // str | int | vit | agi | sen
  estimateMinutes: integer("estimate_minutes"),
  goalId: integer("goal_id"),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  completedDate: text("completed_date"),
  xpAwarded: integer("xp_awarded").notNull().default(0),
  coinsAwarded: integer("coins_awarded").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: text("target_date"),
  size: text("size").notNull().default("medium"), // small | medium | large
  manualProgress: integer("manual_progress").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const rewards = pgTable("rewards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull().default(""),
  icon: text("icon").notNull().default("🎁"),
  cost: integer("cost").notNull(),
  minLevel: integer("min_level").notNull().default(1),
  isCustom: boolean("is_custom").notNull().default(false),
});

export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  rewardId: integer("reward_id"),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("🎁"),
  cost: integer("cost").notNull(),
  purchasedAt: timestamp("purchased_at").notNull().defaultNow(),
  usedAt: timestamp("used_at"),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // task | daily | pomodoro | goal | purchase
  message: text("message").notNull(),
  xp: integer("xp").notNull().default(0),
  coins: integer("coins").notNull().default(0),
  localDate: text("local_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
