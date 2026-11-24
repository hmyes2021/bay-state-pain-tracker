import type { DoseRecord, Medication } from "@/data/models";
import { atTime, isSameDay, startOfDay } from "@/lib/dates";

export interface ScheduledDose {
  medication: Medication;
  time: string;
  scheduledFor: Date;
  record?: DoseRecord;
  state: "taken" | "missed" | "skipped" | "due" | "upcoming" | "overdue";
}

/**
 * Today's doses from the prescribed schedule the patient entered.
 * Pain Tracker only mirrors the schedule — it never suggests or calculates dose changes.
 * A dose past its time is shown as "overdue" until the patient records it; it is never
 * auto-marked as missed.
 */
export function dosesForDay(meds: Medication[], doses: DoseRecord[], day = new Date(), now = new Date()): ScheduledDose[] {
  const out: ScheduledDose[] = [];
  for (const m of meds.filter((x) => x.active)) {
    for (const t of m.times) {
      const when = atTime(startOfDay(day), t);
      const record = doses.find((d) => d.medicationId === m.id && d.scheduledFor && new Date(d.scheduledFor).getTime() === when.getTime());
      let state: ScheduledDose["state"];
      if (record) state = record.status;
      else {
        const diff = when.getTime() - now.getTime();
        state = diff > 60 * 60_000 ? "upcoming" : diff > -60 * 60_000 ? "due" : "overdue";
      }
      out.push({ medication: m, time: t, scheduledFor: when, record, state });
    }
  }
  return out.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
}

export function asNeededToday(meds: Medication[], doses: DoseRecord[], day = new Date()) {
  const ids = new Set(meds.filter((m) => m.active && m.times.length === 0).map((m) => m.id));
  return doses.filter((d) => ids.has(d.medicationId) && !d.scheduledFor && isSameDay(d.recordedAt, day));
}

/** Default dose times for the prototype's frequency chips. The patient can edit them. */
export function defaultTimes(freq: Medication["frequency"]): string[] {
  switch (freq) {
    case "Daily": return ["08:00"];
    case "Every 12 hours": return ["08:00", "20:00"];
    case "Every 8 hours": return ["06:00", "14:00", "22:00"];
    case "As needed": return [];
    default: return ["08:00"];
  }
}
