# ARISE — Solo Leveling‑style Self‑Development System

A dark‑RPG life planner: tick tasks → earn XP & coins → keep a streak → spend rewards.

## 1. Layout / wireframe

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ARISE                                   "Only those who show up rise."    │
├───────────────────────────────────────────────────────────────────────────┤
│ [Lv 7|D]  HUNTER · D‑Rank   ████████░░░░ 240/400 XP   🔥 6 ×1.25  ◈ 132   │  ← Status window (always visible)
│                                                         Today 2/3         │
├───────────────────────────────────────────────────────────────────────────┤
│ ⚔ Quests │ 📅 Calendar │ 🗺 Week & Month │ 🎯 Goals │ ⏳ Focus │ 🛒 Shop  │  ← Tabs
├──────────────────────────────────────────────┬────────────────────────────┤
│ DAILY QUEST · Mon, Jan 5          target ▾   │ ✦ MESSAGE (random quote)   │
│ ▓▓▓▓▓░░ 2/3  bonus +37 XP +12◈  5d×1.25 …    │ ATTRIBUTES  STR INT VIT …  │
│ ☑ Study Math 2h     A‑Rank ⏱2h   +98 XP 14◈  │ ⏳ Focus timer (mini)       │
│ ☐ Gym               C‑Rank       +25 XP  5◈  │ 📜 System log              │
│ [ + New quest … rank · minutes · stat · goal]│                            │
│ ACTIVE GATES (goals) ▓▓▓░░ 40%               │                            │
└──────────────────────────────────────────────┴────────────────────────────┘
```

**Calendar tab** – Month grid (progress bar per day, 🎯 on goal deadlines, green when a day is fully cleared) + side panel for the
selected day; Week view = 7 day columns + weekly quests; Month view also shows Monthly Objectives.
**Week & Month tab** – "Quest Board": navigate any week/month, period quests (×1.5 / ×2.5 rewards), progress of daily quests inside the
period, goal deadlines.
**Goals tab** – Long‑term "Gates" (small / major / red) with linked quests, auto progress, claim reward.
**Focus tab** – Pomodoro ring (25/5/15, 4 cycles → long rest). Finished focus sessions pay XP + coins.
**Shop tab** – Reward cards (cost, level lock), inventory with "Use", forge your own rewards.

## 2. Tech stack (as built)

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 App Router, React 19, Tailwind CSS 4 + hand‑written RPG CSS (glow bars, shimmer, pops) |
| Backend | Next.js Route Handlers (`/api/*`) — thin; all game rules live in `src/lib/engine.ts` |
| DB | PostgreSQL + Drizzle ORM (`src/db/schema.ts`) |
| Shared logic | `src/lib/game.ts` (XP formula, streak tiers, level curve) is imported by both server & client so previews match payouts |

Tables: `player`, `tasks`, `goals`, `rewards`, `purchases`, `events` (activity log).
Dates are local `YYYY‑MM‑DD` strings sent from the browser (`?today=`) so streaks respect the user's timezone.

## 3. Data flow: task → XP → coins → rewards

```
Click checkbox
  → PATCH /api/tasks/:id {completed:true}
  → engine.setTaskCompleted()  (one DB transaction, player row locked)
      base  = (difficultyXP + minutes×0.4) × scope(1 | 1.5 | 2.5)
      mult  = streakMultiplier(active streak)             (1 → 2.5)
      xp    = round(base.xp × mult); coins likewise
      task  ← completed, xpAwarded, coinsAwarded
      if completedToday ≥ dailyTarget and streak not yet counted today:
           streak++ (or reset to 1), pay daily bonus (30 XP / 10 ◈ × mult)
      player.xp += xp; player.coins += coins; level = levelFromXp(xp)
      events ← log line
  ← { feedback:{xp,coins,multiplier,dailyCleared,levelUp}, state }
  → client: floating "+98 XP / +14 ◈" pops, toast, level‑up overlay, refreshed bars
Shop: POST /api/shop/:id → checks coins & level → coins −= cost → purchase row → Inventory → "Use".
Un‑tick: exact refund of what that task paid (+ revoke today's daily bonus/streak if target is no longer met) → no exploits.
```

| Example | Calculation | Reward |
|---|---|---|
| "Drink water" (Easy, 0 min, daily) | 10 | 10 XP / 2 ◈ |
| "Study Math 2 h" (Hard, 120 min, daily) | 50 + 48 | 98 XP / 14 ◈ |
| Same task during a 10‑day streak (×1.5) | | 147 XP / 21 ◈ |
| "Finish online course" (Epic, weekly) | (100)×1.5 | 150 XP / 38 ◈ |

Streak tiers: 5d ×1.25 · 10d ×1.5 · 20d ×1.75 · 30d ×2 · 60d ×2.5. A day counts when you clear your daily target (default 3 quests).
Level curve: `xpToNext(L) = 100 + 50·(L−1)`. Ranks: E → D(5) → C(10) → B(20) → A(35) → S(50) → National(75) → Monarch(100).

## 4. Motivational quotes

Implemented: local bank (`src/lib/quotes.ts`) served by `GET /api/quote?exclude=<idx>` (no repeats back‑to‑back, rotates every 60 s,
"[SYSTEM]" lines styled as in‑universe messages). Ideas to extend:
- Remote API (e.g. ZenQuotes / Quotable) fetched server‑side, cached for an hour, with the local bank as fallback.
- `quotes` table + favourites; weight quotes by context (level‑up → triumphant, broken streak → resilience, long idle → "return").
- Show a quote on the daily‑clear toast and on app open; let users add their own.

## 5. Scaling the RPG system

- **Levels:** milestone titles, unlockable themes/avatars/shop tiers per rank, prestige ("Rebirth") at Lv 100 with a permanent +5 % XP.
- **Stats:** make STR/INT/VIT/AGI/SEN matter: e.g. INT → Pomodoro XP bonus, VIT → streak "shield" chance, AGI → coin bonus, SEN → quote/loot luck.
- **Streaks:** streak freeze items (buy in shop), weekly "rest day" token, comeback bonus after a lapse, weekly/monthly streaks with their own multipliers, longest‑streak achievements.
- **Quests:** recurring templates (daily habit, weekly), sub‑tasks, dungeon runs (a chain of quests with a boss reward), timed "emergency quests" with 2× pay, penalty zone for missed dailies.
- **Shop:** tiers by level, limited daily stock, consumables (XP boost 1 h, streak freeze, reroll quote), cosmetics, "savings goals" (big reward 1000 ◈), inflation guard (price rises if bought many times per week).
- **Social:** auth (NextAuth), friends / guilds, weekly leaderboard, shared dungeons.
- **Tech:** move `player.id=1` to `user_id`, add indexes on `tasks(due_date)`, paginate old tasks, PWA + push notifications for daily quest reminders, analytics page (XP per day heat‑map).
