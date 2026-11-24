import { describe, expect, it } from "vitest";
import { buildDemoData } from "@/data/demoData";
import type { PainEntry, Reminder } from "@/data/models";
import { adherence, dailySeries, loggingStreak, painBySleep, weekComparison } from "@/logic/insights";
import { dosesForDay } from "@/logic/medications";
import { dueReminders, nextOccurrence } from "@/logic/reminders";
import { buildReport } from "@/logic/report";
import { LocalAdapter } from "@/storage/localAdapter";
import { addDays, startOfDay } from "@/lib/dates";

const NOW = new Date("2026-11-20T15:00:00");
const pain = (ts: string, intensity: number, extra: Partial<PainEntry> = {}): PainEntry => ({ id: ts, createdAt: ts, updatedAt: ts, timestamp: new Date(ts).toISOString(), intensity, locations: [], characteristics: [], triggers: [], ...extra });

describe("insights", () => {
  it("averages per day and leaves gaps as null", () => {
    const s = dailySeries([pain("2026-11-20T08:00", 4), pain("2026-11-20T18:00", 6), pain("2026-11-18T09:00", 3)], 3, NOW);
    expect(s.map((d) => d.avg)).toEqual([3, null, 5]);
    expect(s[2].max).toBe(6);
  });
  it("compares this week so far with the same span last week", () => {
    // 2026-11-20 is a Friday; week starts Monday 16th
    const c = weekComparison([pain("2026-11-17T09:00", 4), pain("2026-11-10T09:00", 6), pain("2026-11-14T09:00", 9)], NOW);
    expect(c).toMatchObject({ current: 4, previous: 6, change: -2 }); // the 14th (Sat) is outside the elapsed span
  });
  it("groups pain by reported sleep impact without inferring causes", () => {
    const r = painBySleep([pain("2026-11-19T09:00", 7, { sleepImpact: "Severe" }), pain("2026-11-18T09:00", 3, { sleepImpact: "None" })]);
    expect(r.find((x) => x.level === "Severe")?.avg).toBe(7);
    expect(r.find((x) => x.level === "Mild")?.avg).toBeNull();
  });
  it("counts a logging streak ending today or yesterday", () => {
    expect(loggingStreak([pain("2026-11-19T09:00", 3), pain("2026-11-18T09:00", 3), pain("2026-11-16T09:00", 3)], NOW)).toBe(2);
  });
});

describe("medications", () => {
  const data = buildDemoData(NOW);
  it("never auto-marks a past unrecorded dose as missed", () => {
    const today = dosesForDay(data.medications, data.doses, NOW, NOW);
    const unrecorded = today.find((d) => d.time === "14:00");
    expect(unrecorded?.record).toBeUndefined();
    expect(dosesForDay(data.medications, data.doses, NOW, new Date("2026-11-20T14:20:00")).find((d) => d.time === "14:00")?.state).toBe("due");
    expect(unrecorded?.state).toBe("overdue");
    const later = dosesForDay(data.medications, data.doses, NOW, new Date("2026-11-20T17:00:00"));
    expect(later.find((d) => d.time === "14:00")?.state).toBe("overdue");
  });
  it("counts recorded statuses", () => {
    expect(adherence([{ status: "taken" }, { status: "missed" }, { status: "taken" }] as never)).toEqual({ taken: 2, missed: 1, skipped: 0 });
  });
});

describe("reminders", () => {
  const r: Reminder = { id: "r", createdAt: "", updatedAt: "", kind: "pain-log", title: "Log", times: ["20:00"], repeat: "Selected days", days: [1, 3], enabled: true, sound: false, vibration: false };
  it("finds the next selected day", () => {
    expect(nextOccurrence(r, NOW)?.toString()).toBe(new Date("2026-11-23T20:00:00").toString()); // Monday
  });
  it("fires once per slot", () => {
    const daily = { ...r, repeat: "Daily" as const };
    const due = dueReminders([daily], new Date("2026-11-20T19:59:50"), new Date("2026-11-20T20:00:10"));
    expect(due).toHaveLength(1);
    expect(dueReminders([{ ...daily, lastFiredKey: due[0].slot }], new Date("2026-11-20T19:59:50"), new Date("2026-11-20T20:00:10"))).toHaveLength(0);
  });
  it("ignores disabled reminders", () => {
    expect(nextOccurrence({ ...r, enabled: false }, NOW)).toBeNull();
  });
});

describe("report", () => {
  it("includes only records inside the selected period", () => {
    const data = buildDemoData(NOW);
    const to = addDays(startOfDay(NOW), 1);
    const rep = buildReport(data, { from: addDays(to, -14), to, sections: ["summary", "pain"] });
    expect(rep.pain.length).toBeGreaterThan(0);
    expect(rep.pain.every((p) => new Date(p.timestamp) >= addDays(to, -14))).toBe(true);
    expect(rep.series).toHaveLength(14);
  });
});

describe("demo data", () => {
  it("is fictional, current and populated", () => {
    const d = buildDemoData(NOW);
    expect(d.pain.some((p) => startOfDay(p.timestamp).getTime() === startOfDay(NOW).getTime())).toBe(true);
    expect(d.injections.every((i) => i.provider.includes("fictional"))).toBe(true);
    expect(d.appointments.some((a) => new Date(a.date) > NOW)).toBe(true);
  });
});

describe("LocalAdapter", () => {
  it("persists, updates and removes records", async () => {
    localStorage.clear();
    const a = new LocalAdapter(localStorage);
    await a.upsert("p", "pain", pain("2026-11-20T08:00", 4));
    await a.upsert("p", "pain", { ...pain("2026-11-20T08:00", 4), intensity: 6 });
    expect((await a.load("p"))?.pain.map((p) => p.intensity)).toEqual([6]);
    await a.remove("p", "pain", "2026-11-20T08:00");
    expect((await a.load("p"))?.pain).toEqual([]);
    await a.clear("p");
    expect(await a.load("p")).toBeNull();
  });
});
