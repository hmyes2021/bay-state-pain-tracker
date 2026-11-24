import type { DoseRecord, ExerciseSession, ImpactLevel, InjectionRecord, PainEntry } from "@/data/models";
import { IMPACT_LEVELS } from "@/data/models";
import { DAY, addDays, dayKey, startOfDay, startOfMonth, startOfWeek } from "@/lib/dates";

/**
 * Descriptive summaries of patient-reported data. These describe what was logged;
 * they never infer causes, diagnoses or treatment changes.
 */

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const round1 = (x: number | null) => (x == null ? null : Math.round(x * 10) / 10);

export function inRange<T>(items: T[], get: (t: T) => string, from: Date, to: Date): T[] {
  const a = from.getTime(), b = to.getTime();
  return items.filter((i) => { const t = new Date(get(i)).getTime(); return t >= a && t < b; });
}

export interface DayPoint { key: string; date: Date; avg: number | null; max: number | null; count: number }

export function dailySeries(pain: PainEntry[], days: number, now = new Date()): DayPoint[] {
  const end = addDays(startOfDay(now), 1);
  const start = addDays(end, -days);
  const byDay = new Map<string, number[]>();
  for (const p of inRange(pain, (x) => x.timestamp, start, end)) {
    const k = dayKey(p.timestamp);
    byDay.set(k, [...(byDay.get(k) ?? []), p.intensity]);
  }
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(start, i);
    const vals = byDay.get(dayKey(date)) ?? [];
    return { key: dayKey(date), date, avg: round1(mean(vals)), max: vals.length ? Math.max(...vals) : null, count: vals.length };
  });
}

/** Weekly buckets (Mon–Sun) for longer ranges, keeps mobile charts readable. */
export function weeklySeries(pain: PainEntry[], weeks: number, now = new Date()): DayPoint[] {
  const thisWeek = startOfWeek(now);
  return Array.from({ length: weeks }, (_, i) => {
    const from = addDays(thisWeek, -7 * (weeks - 1 - i));
    const vals = inRange(pain, (x) => x.timestamp, from, addDays(from, 7)).map((p) => p.intensity);
    return { key: dayKey(from), date: from, avg: round1(mean(vals)), max: vals.length ? Math.max(...vals) : null, count: vals.length };
  });
}

export interface Comparison { current: number | null; previous: number | null; change: number | null; currentCount: number; previousCount: number }

function compare(pain: PainEntry[], curFrom: Date, curTo: Date, prevFrom: Date, prevTo: Date): Comparison {
  const cur = inRange(pain, (p) => p.timestamp, curFrom, curTo).map((p) => p.intensity);
  const prev = inRange(pain, (p) => p.timestamp, prevFrom, prevTo).map((p) => p.intensity);
  const c = round1(mean(cur)), p = round1(mean(prev));
  return { current: c, previous: p, change: c != null && p != null ? round1(c - p) : null, currentCount: cur.length, previousCount: prev.length };
}

/** This week so far vs. the same number of days last week. */
export function weekComparison(pain: PainEntry[], now = new Date()): Comparison {
  const wk = startOfWeek(now);
  const elapsed = now.getTime() - wk.getTime();
  return compare(pain, wk, now, addDays(wk, -7), new Date(wk.getTime() - 7 * DAY + elapsed));
}

export function monthComparison(pain: PainEntry[], now = new Date()): Comparison {
  const m = startOfMonth(now);
  const prev = startOfMonth(addDays(m, -1));
  const elapsedDays = (now.getTime() - m.getTime()) / DAY;
  return compare(pain, m, now, prev, new Date(Math.min(prev.getTime() + elapsedDays * DAY, m.getTime())));
}

export function locationCounts(pain: PainEntry[]): Array<{ id: string; count: number }> {
  const m = new Map<string, number>();
  for (const p of pain) for (const l of p.locations) m.set(l, (m.get(l) ?? 0) + 1);
  return [...m.entries()].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count);
}

export function triggerCounts(pain: PainEntry[]): Array<{ label: string; count: number }> {
  const m = new Map<string, number>();
  for (const p of pain) for (const t of p.triggers) m.set(t, (m.get(t) ?? 0) + 1);
  return [...m.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

/** Average reported pain grouped by reported sleep impact. Descriptive only. */
export function painBySleep(pain: PainEntry[]): Array<{ level: ImpactLevel; avg: number | null; count: number }> {
  return IMPACT_LEVELS.map((level) => {
    const vals = pain.filter((p) => p.sleepImpact === level).map((p) => p.intensity);
    return { level, avg: round1(mean(vals)), count: vals.length };
  });
}

export function adherence(doses: DoseRecord[]) {
  const c = { taken: 0, missed: 0, skipped: 0 };
  for (const d of doses) c[d.status]++;
  return c;
}

export function exerciseSummary(sessions: ExerciseSession[]) {
  const withBoth = sessions.filter((s) => s.painBefore != null && s.painAfter != null);
  return {
    sessions: sessions.length,
    minutes: sessions.reduce((a, s) => a + s.durationMin, 0),
    avgBefore: round1(mean(withBoth.map((s) => s.painBefore!))),
    avgAfter: round1(mean(withBoth.map((s) => s.painAfter!))),
  };
}

export function exerciseMinutesByWeek(sessions: ExerciseSession[], weeks: number, now = new Date()) {
  const wk = startOfWeek(now);
  return Array.from({ length: weeks }, (_, i) => {
    const from = addDays(wk, -7 * (weeks - 1 - i));
    const list = inRange(sessions, (s) => s.date, from, addDays(from, 7));
    return { date: from, minutes: list.reduce((a, s) => a + s.durationMin, 0), count: list.length };
  });
}

/** Average daily pain in the windows before and after each injection (patient-reported). */
export function aroundInjection(pain: PainEntry[], inj: InjectionRecord, windowDays = 14) {
  const d = startOfDay(inj.date);
  const before = inRange(pain, (p) => p.timestamp, addDays(d, -windowDays), d).map((p) => p.intensity);
  const after = inRange(pain, (p) => p.timestamp, addDays(d, 1), addDays(d, 1 + windowDays)).map((p) => p.intensity);
  return { before: round1(mean(before)), after: round1(mean(after)), beforeCount: before.length, afterCount: after.length };
}

/** Consecutive days (ending today or yesterday) with at least one pain log. */
export function loggingStreak(pain: PainEntry[], now = new Date()): number {
  const days = new Set(pain.map((p) => dayKey(p.timestamp)));
  let d = startOfDay(now);
  if (!days.has(dayKey(d))) d = addDays(d, -1);
  let n = 0;
  while (days.has(dayKey(d))) { n++; d = addDays(d, -1); }
  return n;
}
