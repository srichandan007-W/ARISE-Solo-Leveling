import { ApiError, getState } from "./engine";
import { ISO_RE, toISO } from "./dates";
import type { Feedback } from "./types";

export function getToday(req: Request): string {
  const t = new URL(req.url).searchParams.get("today");
  return t && ISO_RE.test(t) ? t : toISO(new Date());
}

export async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    return b && typeof b === "object" ? (b as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw new ApiError("Invalid id", 400);
  return id;
}

/** Runs a mutation, then returns { feedback, state } so the client can animate + re-render in one round trip. */
export async function run(req: Request, fn: (today: string) => Promise<Feedback | void>) {
  try {
    const today = getToday(req);
    const feedback = await fn(today);
    const state = await getState(today);
    return Response.json({ feedback: feedback ?? null, state });
  } catch (e) {
    if (e instanceof ApiError) return Response.json({ error: e.message }, { status: e.status });
    console.error(e);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
