"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PomoMode = "focus" | "short" | "long";

export interface PomodoroApi {
  mode: PomoMode;
  remaining: number; // seconds
  total: number; // seconds
  running: boolean;
  cycles: number;
  durations: Record<PomoMode, number>;
  start(): void;
  pause(): void;
  reset(): void;
  skip(): void;
  setMode(m: PomoMode): void;
  setFocusLength(min: number): void;
}

function beep() {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    [660, 880, 1100].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.22);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.22 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.22 + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.22);
      o.stop(ctx.currentTime + i * 0.22 + 0.22);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {
    /* audio unavailable */
  }
}

/** Timer lives at the app root so it keeps running while you browse other tabs. */
export function usePomodoro(onFocusDone: (minutes: number) => void): PomodoroApi {
  const [durations, setDurations] = useState<Record<PomoMode, number>>({ focus: 25, short: 5, long: 15 });
  const [mode, setModeState] = useState<PomoMode>("focus");
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const endRef = useRef(0);
  const cbRef = useRef(onFocusDone);

  useEffect(() => {
    cbRef.current = onFocusDone;
  });

  const advance = useCallback(
    (rewarded: boolean) => {
      setRunning(false);
      let next: PomoMode = "focus";
      if (mode === "focus") {
        if (rewarded) cbRef.current(durations.focus);
        const nc = cycles + 1;
        setCycles(nc);
        next = nc % 4 === 0 ? "long" : "short";
      }
      setModeState(next);
      setRemaining(durations[next] * 60);
    },
    [mode, cycles, durations],
  );

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((endRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        beep();
        advance(true);
      }
    }, 250);
    return () => clearInterval(id);
  }, [running, advance]);

  useEffect(() => {
    const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
    const ss = String(remaining % 60).padStart(2, "0");
    document.title = running
      ? `${mm}:${ss} · ${mode === "focus" ? "Focus" : "Rest"} — ARISE`
      : "ARISE — Level Up Your Life";
  }, [running, remaining, mode]);

  const start = useCallback(() => {
    endRef.current = Date.now() + remaining * 1000;
    setRunning(true);
  }, [remaining]);

  const pause = useCallback(() => setRunning(false), []);
  const reset = useCallback(() => {
    setRunning(false);
    setRemaining(durations[mode] * 60);
  }, [durations, mode]);
  const skip = useCallback(() => advance(false), [advance]);
  const setMode = useCallback(
    (m: PomoMode) => {
      setRunning(false);
      setModeState(m);
      setRemaining(durations[m] * 60);
    },
    [durations],
  );
  const setFocusLength = useCallback(
    (min: number) => {
      setDurations((d) => ({ ...d, focus: min }));
      if (mode === "focus" && !running) setRemaining(min * 60);
    },
    [mode, running],
  );

  return {
    mode,
    remaining,
    total: durations[mode] * 60,
    running,
    cycles,
    durations,
    start,
    pause,
    reset,
    skip,
    setMode,
    setFocusLength,
  };
}
