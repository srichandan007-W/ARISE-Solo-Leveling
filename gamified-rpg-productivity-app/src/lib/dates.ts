// All dates are plain local "YYYY-MM-DD" strings so server & client never disagree about timezones.

const pad = (n: number) => String(n).padStart(2, "0");

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, n: number): string {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Monday of the week containing `s`. */
export function weekStart(s: string): string {
  const d = parseISO(s);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return toISO(d);
}

export function monthStart(s: string): string {
  return `${s.slice(0, 7)}-01`;
}

export function addMonths(s: string, n: number): string {
  const d = parseISO(monthStart(s));
  d.setMonth(d.getMonth() + n);
  return toISO(d);
}

export function monthEnd(s: string): string {
  return addDays(addMonths(s, 1), -1);
}

/** 42 cells (6 weeks, Monday first) covering the month that starts at `monthStartIso`. */
export function monthGrid(monthStartIso: string): string[] {
  const first = weekStart(monthStartIso);
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000);
}

export function fmtLong(s: string): string {
  return parseISO(s).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function fmtMonth(s: string): string {
  return parseISO(s).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function fmtShort(s: string): string {
  return parseISO(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
