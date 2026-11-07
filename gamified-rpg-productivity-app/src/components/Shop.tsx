"use client";

import { useState } from "react";
import { levelFromXp } from "@/lib/game";
import type { Actions, GameState, Reward } from "@/lib/types";
import { Empty, Panel } from "./ui";

export function Shop({ state, actions }: { state: GameState; actions: Actions }) {
  const { player, rewards, purchases } = state;
  const level = levelFromXp(player.xp).level;
  const [shaking, setShaking] = useState<number | null>(null);
  const inventory = purchases.filter((p) => !p.usedAt);
  const history = purchases.filter((p) => p.usedAt).slice(0, 6);

  function tryBuy(r: Reward, el: HTMLElement) {
    if (player.coins < r.cost || level < r.minLevel) {
      setShaking(r.id);
      setTimeout(() => setShaking(null), 450);
      return;
    }
    actions.buy(r, el);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Panel
          title="Reward Shop"
          icon="🛒"
          right={
            <span className="display text-lg font-black text-gold">
              ◈ <span key={player.coins} className="bump">{player.coins}</span>
            </span>
          }
        >
          <p className="mb-4 text-sm text-mute">You earned them — spend them guilt‑free. Some rewards unlock as you level up.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {rewards.map((r) => {
              const locked = level < r.minLevel;
              const poor = player.coins < r.cost;
              return (
                <div
                  key={r.id}
                  className={`group relative rounded-xl border p-3 transition ${shaking === r.id ? "shake" : ""} ${
                    locked ? "border-slate-600/40 opacity-60" : "border-[rgba(94,129,255,0.3)] hover:border-amber-300/60 hover:shadow-[0_0_20px_rgba(251,191,36,0.2)]"
                  } bg-[rgba(8,11,32,0.6)]`}
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-12 w-12 flex-none place-items-center rounded-xl border border-[rgba(94,129,255,0.3)] bg-[rgba(5,7,22,0.8)] text-2xl">
                      {locked ? "🔒" : r.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold leading-tight">{r.name}</p>
                      <p className="text-xs text-mute">{r.description}</p>
                    </div>
                    {r.isCustom && (
                      <button
                        className="text-xs text-rose-400 opacity-0 transition group-hover:opacity-100 max-sm:opacity-100"
                        onClick={() => actions.deleteReward(r.id)}
                        aria-label="Remove reward"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`display text-sm font-black ${poor ? "text-mute" : "text-gold"}`}>◈ {r.cost}</span>
                    {locked ? (
                      <span className="text-xs font-bold text-slate-400">Requires Lv {r.minLevel}</span>
                    ) : (
                      <button className="btn btn-gold btn-sm" disabled={poor} onClick={(e) => tryBuy(r, e.currentTarget)}>
                        {poor ? `Need ${r.cost - player.coins} more` : "Buy"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="space-y-5">
        <Panel title="Inventory" icon="🎒">
          {inventory.length === 0 ? (
            <Empty>Nothing unclaimed. Buy a reward, then press “Use” when you take it.</Empty>
          ) : (
            <ul className="space-y-2">
              {inventory.map((p) => (
                <li key={p.id} className="fade-in flex items-center gap-3 rounded-lg border border-amber-300/25 bg-amber-300/5 px-3 py-2">
                  <span className="text-xl">{p.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span>
                  <button className="btn btn-sm" onClick={() => actions.useItem(p.id)}>
                    Use
                  </button>
                </li>
              ))}
            </ul>
          )}
          {history.length > 0 && (
            <div className="mt-4">
              <p className="sys-title mb-2 !text-[0.6rem]">Used recently</p>
              <ul className="space-y-1 text-sm text-mute">
                {history.map((p) => (
                  <li key={p.id}>
                    {p.icon} {p.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
        <NewReward onAdd={actions.addReward} />
      </div>
    </div>
  );
}

function NewReward({ onAdd }: { onAdd: Actions["addReward"] }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🎁");
  const [cost, setCost] = useState("50");
  const [minLevel, setMinLevel] = useState("1");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await onAdd({ name, description: "Custom reward", icon, cost: Number(cost) || 1, minLevel: Number(minLevel) || 1 });
      setName("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Forge a Reward" icon="⚒">
      <form onSubmit={submit} className="space-y-2">
        <div className="flex gap-2">
          <input className="field !w-16 text-center" value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} aria-label="Icon" />
          <input className="field" placeholder="e.g. 1 hour of YouTube" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} aria-label="Reward name" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-mute">
            Cost (coins)
            <input className="field mt-1" type="number" min={1} value={cost} onChange={(e) => setCost(e.target.value)} />
          </label>
          <label className="text-xs text-mute">
            Min level
            <input className="field mt-1" type="number" min={1} value={minLevel} onChange={(e) => setMinLevel(e.target.value)} />
          </label>
        </div>
        <button className="btn w-full" disabled={!name.trim() || busy}>
          Add to shop
        </button>
      </form>
    </Panel>
  );
}
