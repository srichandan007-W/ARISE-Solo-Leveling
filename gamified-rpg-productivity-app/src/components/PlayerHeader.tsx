"use client";

import { levelFromXp, nextStreakTier, rankForLevel, streakMultiplier } from "@/lib/game";
import type { PlayerView } from "@/lib/types";
import type { PomodoroApi } from "@/lib/usePomodoro";
import { Bar } from "./ui";

export function PlayerHeader({
  player,
  todayCount,
  pomo,
  onOpenPomodoro,
}: {
  player: PlayerView;
  todayCount: number;
  pomo: PomodoroApi;
  onOpenPomodoro: () => void;
}) {
  const lv = levelFromXp(player.xp);
  const rank = rankForLevel(lv.level);
  const mult = streakMultiplier(player.currentStreak);
  const next = nextStreakTier(player.currentStreak);
  const mm = String(Math.floor(pomo.remaining / 60)).padStart(2, "0");
  const ss = String(pomo.remaining % 60).padStart(2, "0");

  return (
    <div className="sys-panel pulse-glow p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
        {/* identity */}
        <div className="flex items-center gap-4">
          <div
            className="relative grid h-[68px] w-[68px] flex-none place-items-center rounded-2xl border-2 bg-[rgba(5,7,22,0.9)]"
            style={{ borderColor: rank.color, boxShadow: `0 0 22px ${rank.color}88, inset 0 0 18px ${rank.color}33` }}
          >
            <div className="text-center leading-none">
              <div className="display text-[0.5rem] tracking-[0.25em] text-mute">LV</div>
              <div className="display glow-text text-2xl font-black" key={lv.level} style={{ color: rank.color }}>
                {lv.level}
              </div>
            </div>
            <span
              className="display absolute -bottom-2 -right-2 grid h-6 w-6 place-items-center rounded-md text-[0.7rem] font-black text-black"
              style={{ background: rank.color, boxShadow: `0 0 12px ${rank.color}` }}
            >
              {rank.rank}
            </span>
          </div>
          <div>
            <p className="sys-title !text-[0.6rem]">[ Status Window ]</p>
            <p className="display glow-text flicker text-lg font-black uppercase tracking-widest">{player.name}</p>
            <p className="text-sm font-semibold" style={{ color: rank.color }}>
              {rank.title}
            </p>
          </div>
        </div>

        {/* xp bar */}
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-end justify-between">
            <span className="sys-title !text-[0.6rem]">Experience</span>
            <span className="display text-xs font-bold text-sky-200">
              {lv.into} / {lv.needed} XP
            </span>
          </div>
          <Bar pct={lv.pct} className="!h-3.5" />
          <p className="mt-1.5 text-xs text-mute">
            {lv.needed - lv.into} XP to <span className="font-bold text-indigo-200">Level {lv.level + 1}</span> · {player.xp.toLocaleString()} total
          </p>
        </div>

        {/* streak + coins */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:flex lg:flex-none">
          <div className="rounded-xl border border-orange-400/30 bg-orange-500/5 px-3 py-2 text-center">
            <p className="sys-title !text-[0.55rem] !text-orange-300 !shadow-none">Streak</p>
            <p className="display text-xl font-black text-orange-300">
              <span className={player.currentStreak > 0 ? "flame" : "opacity-40"}>🔥</span> {player.currentStreak}
            </p>
            <p className="text-[0.65rem] text-mute" title={next ? `Next bonus at ${next.days} days` : "Max tier"}>
              {mult > 1 ? `×${mult} XP` : next ? `${next.days - player.currentStreak}d → ×${next.mult}` : "MAX"}
            </p>
          </div>
          <div className="rounded-xl border border-amber-300/30 bg-amber-400/5 px-3 py-2 text-center">
            <p className="sys-title !text-[0.55rem] !text-amber-300">Coins</p>
            <p className="display text-xl font-black text-gold">
              ◈ <span key={player.coins} className="bump">{player.coins}</span>
            </p>
            <p className="text-[0.65rem] text-mute">to spend</p>
          </div>
          <div className="rounded-xl border border-emerald-300/30 bg-emerald-400/5 px-3 py-2 text-center">
            <p className="sys-title !text-[0.55rem] !text-emerald-300">Today</p>
            <p className="display text-xl font-black text-emerald-300">
              {Math.min(todayCount, 99)}/{player.dailyTarget}
            </p>
            <p className="text-[0.65rem] text-mute">{todayCount >= player.dailyTarget ? "cleared ✓" : "quests"}</p>
          </div>
        </div>
      </div>

      {pomo.running && (
        <button
          type="button"
          onClick={onOpenPomodoro}
          className="mt-3 flex w-full items-center justify-center gap-3 rounded-lg border border-violet-400/40 bg-violet-500/10 py-1.5 text-sm hover:bg-violet-500/20"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-violet-400" />
          </span>
          <span className="display font-bold tracking-widest text-violet-200">
            {mm}:{ss}
          </span>
          <span className="text-mute">{pomo.mode === "focus" ? "Focus session in progress" : "Resting"}</span>
        </button>
      )}
    </div>
  );
}
