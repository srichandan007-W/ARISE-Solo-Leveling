export type Scope = "day" | "week" | "month";
export type Difficulty = "easy" | "medium" | "hard" | "epic";
export type Category = "str" | "int" | "vit" | "agi" | "sen";
export type GoalSize = "small" | "medium" | "large";

export interface Task {
  id: number;
  title: string;
  notes: string | null;
  scope: Scope;
  dueDate: string;
  difficulty: Difficulty;
  category: Category;
  estimateMinutes: number | null;
  goalId: number | null;
  completed: boolean;
  completedAt: string | null;
  completedDate: string | null;
  xpAwarded: number;
  coinsAwarded: number;
  createdAt: string;
}

export interface Goal {
  id: number;
  title: string;
  description: string | null;
  targetDate: string | null;
  size: GoalSize;
  manualProgress: number;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
}

export interface Reward {
  id: number;
  name: string;
  description: string;
  icon: string;
  cost: number;
  minLevel: number;
  isCustom: boolean;
}

export interface Purchase {
  id: number;
  rewardId: number | null;
  name: string;
  icon: string;
  cost: number;
  purchasedAt: string;
  usedAt: string | null;
}

export interface GameEvent {
  id: number;
  type: string;
  message: string;
  xp: number;
  coins: number;
  localDate: string;
  createdAt: string;
}

export interface PlayerView {
  id: number;
  name: string;
  xp: number;
  coins: number;
  streak: number;
  bestStreak: number;
  lastStreakDate: string | null;
  dailyTarget: number;
  totalPomodoros: number;
  focusMinutes: number;
  /** streak that is still alive today (0 if broken) */
  currentStreak: number;
  streakDoneToday: boolean;
}

export interface GameState {
  player: PlayerView;
  tasks: Task[];
  goals: Goal[];
  rewards: Reward[];
  purchases: Purchase[];
  events: GameEvent[];
  todayCount: number;
  pomodorosToday: number;
}

export interface Feedback {
  xp: number; // signed
  coins: number; // signed
  multiplier?: number;
  levelUp?: number;
  levelDown?: boolean;
  dailyCleared?: boolean;
  streak?: number;
  streakLost?: boolean;
  message?: string;
}

export interface NewTask {
  title: string;
  scope: Scope;
  dueDate: string;
  difficulty: Difficulty;
  category: Category;
  estimateMinutes: number | null;
  goalId: number | null;
}

export interface NewGoal {
  title: string;
  description: string;
  targetDate: string | null;
  size: GoalSize;
}

export interface NewReward {
  name: string;
  description: string;
  icon: string;
  cost: number;
  minLevel: number;
}

export interface Actions {
  addTask(input: NewTask): Promise<void>;
  toggleTask(task: Task, anchor: HTMLElement): Promise<void>;
  deleteTask(id: number): Promise<void>;
  moveTask(id: number, dueDate: string): Promise<void>;
  addGoal(input: NewGoal): Promise<void>;
  setGoalProgress(id: number, progress: number): Promise<void>;
  claimGoal(goal: Goal, anchor: HTMLElement): Promise<void>;
  deleteGoal(id: number): Promise<void>;
  buy(reward: Reward, anchor: HTMLElement): Promise<void>;
  useItem(id: number): Promise<void>;
  addReward(input: NewReward): Promise<void>;
  deleteReward(id: number): Promise<void>;
  setDailyTarget(n: number): Promise<void>;
}
