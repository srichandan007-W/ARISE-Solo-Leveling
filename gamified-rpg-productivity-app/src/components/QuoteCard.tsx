"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Panel } from "./ui";

interface Q {
  index: number;
  text: string;
  author: string;
}

export function QuoteCard() {
  const [quote, setQuote] = useState<Q | null>(null);
  const [tick, setTick] = useState(0);
  const last = useRef<number | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/quote${last.current !== undefined ? `?exclude=${last.current}` : ""}`, {
        cache: "no-store",
      });
      const q = (await res.json()) as Q;
      last.current = q.index;
      setQuote(q);
      setTick((t) => t + 1);
    } catch {
      setQuote({ index: -1, text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" });
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load]);

  const isSystem = quote?.author === "The System";

  return (
    <Panel
      title="Message"
      icon="✦"
      right={
        <button type="button" className="btn btn-ghost btn-sm" onClick={load} aria-label="New quote">
          ↻ New
        </button>
      }
    >
      {quote ? (
        <blockquote key={tick} className="fade-in">
          <p className={`text-[1.05rem] font-medium leading-snug ${isSystem ? "text-sky-200 glow-text" : "text-indigo-100"}`}>
            “{quote.text}”
          </p>
          <footer className="mt-2 text-sm text-mute">— {quote.author}</footer>
        </blockquote>
      ) : (
        <p className="text-sm text-mute">Receiving message from the System…</p>
      )}
    </Panel>
  );
}
