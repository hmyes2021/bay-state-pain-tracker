import type { Reminder } from "@/data/models";
import { addDays, atTime, dayKey, startOfDay } from "@/lib/dates";

export function activeOnDay(r: Reminder, day: Date): boolean {
  if (!r.enabled) return false;
  const dow = day.getDay();
  switch (r.repeat) {
    case "Daily": return true;
    case "Weekdays": return dow >= 1 && dow <= 5;
    case "Selected days": return r.days.includes(dow);
    case "Once": return r.onceDate === dayKey(day);
  }
}

/** Next time this reminder will fire, or null (disabled / one-off already passed). */
export function nextOccurrence(r: Reminder, now = new Date()): Date | null {
  if (!r.enabled || r.times.length === 0) return null;
  for (let i = 0; i < 8; i++) {
    const day = addDays(startOfDay(now), i);
    if (!activeOnDay(r, day)) continue;
    const times = [...r.times].sort().map((t) => atTime(day, t)).filter((d) => d.getTime() > now.getTime());
    if (times.length) return times[0];
  }
  if (r.repeat === "Once" && r.onceDate) {
    const d = new Date(`${r.onceDate}T00:00`);
    if (d > addDays(now, 7)) return atTime(d, [...r.times].sort()[0]);
  }
  return null;
}

/**
 * Reminders that became due since `since` (exclusive) up to `now` (inclusive) and have
 * not already fired for that slot. Used by the in-app scheduler each tick.
 */
export function dueReminders(reminders: Reminder[], since: Date, now: Date): Array<{ reminder: Reminder; slot: string }> {
  const out: Array<{ reminder: Reminder; slot: string }> = [];
  for (const r of reminders) {
    for (const day of [startOfDay(since), startOfDay(now)].filter((d, i, a) => i === 0 || d.getTime() !== a[0].getTime())) {
      if (!activeOnDay(r, day)) continue;
      for (const t of r.times) {
        const at = atTime(day, t);
        const slot = `${dayKey(day)} ${t}`;
        if (at > since && at <= now && r.lastFiredKey !== slot) out.push({ reminder: r, slot });
      }
    }
  }
  return out;
}

export function describeRepeat(r: Reminder): string {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  switch (r.repeat) {
    case "Daily": return "Every day";
    case "Weekdays": return "Weekdays";
    case "Selected days": return r.days.length ? [...r.days].sort().map((d) => names[d]).join(", ") : "No days selected";
    case "Once": return r.onceDate ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${r.onceDate}T00:00`)) : "Once";
  }
}
