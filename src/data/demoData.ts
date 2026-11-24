import type { Appointment, DoseRecord, ExerciseSession, InjectionRecord, MealEntry, Medication, PainEntry, PatientData, Profile, Reminder } from "./models";
import { DAY, addDays, atTime, dayKey, startOfDay } from "@/lib/dates";

/**
 * Fictional demo patient. "Sarah" is the illustrative persona from the PainTrack case study
 * (50, chronic lower-back pain). All names, providers and records are invented — no real
 * patient or clinician data. Records are generated relative to `now` so the demo always
 * shows a current week.
 */

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DEMO_PROFILE = (now = new Date()): Profile => ({
  id: "demo-patient",
  displayName: "Sarah",
  role: "patient",
  goals: ["Track Pain", "Share with Doctor", "Manage Meds", "Injection"],
  createdAt: addDays(now, -62).toISOString(),
});

const PROVIDER = "Dr. Elena Ruiz (fictional)";
const PT = "Marcus Chen, PT (fictional)";

export function buildDemoData(now = new Date()): PatientData {
  const r = rng(20251116);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
  const today = startOfDay(now);
  const stamp = (d: Date) => d.toISOString();
  let n = 0;
  const id = (p: string) => `demo-${p}-${++n}`;
  const base = (d: Date) => ({ createdAt: stamp(d), updatedAt: stamp(d) });

  /* --- Injection 45 days ago changes the trend --- */
  const injectionDay = addDays(today, -45);

  /* --- Pain entries: ~60 days --- */
  const pain: PainEntry[] = [];
  for (let i = 60; i >= 1; i--) {
    if (r() < 0.14) continue; // some days not logged, as in real life
    const day = addDays(today, -i);
    const sinceInjection = Math.round((day.getTime() - injectionDay.getTime()) / DAY);
    let level = sinceInjection < 0 ? 6.4 : sinceInjection < 4 ? 5.5 : 3.6 + Math.min(1.4, sinceInjection / 30);
    const poorSleep = r() < 0.28;
    if (poorSleep) level += 1.3;
    const weekend = day.getDay() === 0 || day.getDay() === 6;
    if (weekend) level -= 0.5;
    const entries = r() < 0.35 ? 2 : 1;
    for (let k = 0; k < entries; k++) {
      const hour = k === 0 ? 8 + Math.floor(r() * 3) : 18 + Math.floor(r() * 3);
      const ts = new Date(day);
      ts.setHours(hour, Math.floor(r() * 60));
      const intensity = Math.max(1, Math.min(9, Math.round(level + (r() - 0.5) * 2 + (k === 1 ? 0.6 : 0))));
      const locs = ["lower-back"];
      if (r() < 0.5) locs.push("right-buttock");
      if (r() < 0.3) locs.push("right-hamstring");
      if (r() < 0.12) locs.push("neck");
      pain.push({
        id: id("pain"), ...base(ts), timestamp: stamp(ts), intensity, locations: locs,
        characteristics: intensity >= 6 ? ["Aching", "Shooting"] : [pick(["Aching", "Stiff", "Aching", "Throbbing"])],
        duration: intensity >= 6 ? pick(["4–12 hours", "Most of the day"]) : pick(["Under 1 hour", "1–4 hours"]),
        triggers: poorSleep ? ["Poor sleep", pick(["Sitting", "Bending", "Standing"])] : r() < 0.6 ? [pick(["Sitting", "Driving", "Lifting", "Weather", "Standing"])] : [],
        sleepImpact: poorSleep ? pick(["Moderate", "Severe"] as const) : pick(["None", "Mild", "None"] as const),
        activityImpact: intensity >= 6 ? pick(["Moderate", "Severe"] as const) : pick(["None", "Mild"] as const),
        notes: k === 0 && r() < 0.15 ? pick(["Stiff getting out of bed, eased after a warm shower.", "Long drive to work made it worse.", "Better after the evening walk."]) : undefined,
      });
    }
  }
  // One entry earlier today so "Today" has data on first open.
  const earlier = new Date(Math.max(now.getTime() - 2 * 3_600_000, today.getTime() + 60_000));
  pain.push({
    id: id("pain"), ...base(earlier), timestamp: stamp(earlier), intensity: 4, locations: ["lower-back", "right-buttock"],
    characteristics: ["Aching", "Stiff"], duration: "1–4 hours", triggers: ["Sitting"], sleepImpact: "Mild", activityImpact: "Mild",
    notes: "Morning stiffness, eased after stretching.",
  });

  /* --- Medications (as prescribed; the app never changes doses) --- */
  const created = addDays(today, -62);
  const medications: Medication[] = [
    { id: "demo-med-gabapentin", ...base(created), name: "Gabapentin", dosage: "300 mg capsule", frequency: "Custom", times: ["08:00", "14:00", "21:00"], instructions: "Take with water.", prescriber: PROVIDER, active: true },
    { id: "demo-med-naproxen", ...base(created), name: "Naproxen", dosage: "500 mg tablet", frequency: "Every 12 hours", times: ["08:00", "20:00"], instructions: "Take with food.", prescriber: PROVIDER, active: true },
    { id: "demo-med-cyclobenzaprine", ...base(created), name: "Cyclobenzaprine", dosage: "5 mg tablet", frequency: "As needed", times: [], instructions: "At bedtime for muscle spasm, as prescribed.", prescriber: PROVIDER, active: true },
  ];

  const doses: DoseRecord[] = [];
  for (let i = 14; i >= 0; i--) {
    const day = addDays(today, -i);
    for (const med of medications.filter((m) => m.times.length)) {
      for (const t of med.times) {
        const when = atTime(day, t);
        if (when.getTime() > now.getTime() - 30 * 60_000) continue; // future/just-due doses stay unrecorded
        if (i === 0 && t === "14:00") continue; // leave one of today's doses for the patient to record
        const roll = r();
        const status = roll < 0.86 ? "taken" : roll < 0.94 ? "missed" : "skipped";
        const rec = new Date(when.getTime() + Math.floor(r() * 25) * 60_000);
        doses.push({
          id: id("dose"), ...base(rec), medicationId: med.id, scheduledFor: stamp(when), recordedAt: stamp(rec), status,
          sideEffects: med.id === "demo-med-gabapentin" && r() < 0.12 ? "Mild drowsiness" : undefined,
        });
      }
    }
    if (r() < 0.2 && i > 0) {
      const when = atTime(day, "22:15");
      doses.push({ id: id("dose"), ...base(when), medicationId: "demo-med-cyclobenzaprine", recordedAt: stamp(when), status: "taken", sideEffects: r() < 0.5 ? "Dry mouth next morning" : undefined });
    }
  }

  /* --- Therapeutic injections --- */
  const injections: InjectionRecord[] = [
    { id: "demo-inj-1", ...base(addDays(today, -118)), type: "Trigger point injection", date: stamp(atTime(addDays(today, -118), "11:00")), location: "Right buttock (piriformis area)", provider: PROVIDER, painBefore: 7, painAfter: 6, effectiveness: "Slightly effective", notes: "Relief lasted about a week." },
    { id: "demo-inj-2", ...base(injectionDay), type: "Epidural steroid injection", date: stamp(atTime(injectionDay, "09:30")), location: "Lower back (L4–L5, right side)", provider: PROVIDER, painBefore: 7, painAfter: 4, effectiveness: "Moderately effective", notes: "Sore at the site for two days. Leg pain eased by the end of the first week." },
  ];

  /* --- Exercise --- */
  const exercise: ExerciseSession[] = [];
  for (let i = 40; i >= 0; i--) {
    const day = addDays(today, -i);
    const dow = day.getDay();
    let type: string | null = null;
    if (dow === 2 || dow === 4) type = "Physical therapy exercises";
    else if (r() < 0.5) type = pick(["Walking", "Walking", "Stretching", "Aquatic therapy"]);
    if (!type) continue;
    const when = atTime(day, type === "Walking" ? "18:30" : "16:00");
    if (when > now) continue;
    const before = 3 + Math.floor(r() * 4);
    exercise.push({
      id: id("ex"), ...base(when), type, date: stamp(when),
      durationMin: type === "Walking" ? 20 + Math.floor(r() * 3) * 5 : type === "Aquatic therapy" ? 45 : 30,
      painBefore: before, painAfter: Math.max(1, before + (r() < 0.75 ? -1 : 1)),
      difficulty: pick(["Easy", "Moderate", "Moderate"] as const),
      notes: type === "Physical therapy exercises" && r() < 0.3 ? "Bird-dog and pelvic tilts; hamstring stretch was tight." : undefined,
    });
  }

  /* --- Meals (lightweight) --- */
  const meals: MealEntry[] = [];
  const foods = {
    Breakfast: ["Oatmeal with berries", "Greek yogurt and granola", "Eggs and whole-wheat toast"],
    Lunch: ["Turkey sandwich and salad", "Lentil soup", "Chicken and rice bowl"],
    Dinner: ["Baked salmon and vegetables", "Pasta with tomato sauce", "Stir-fried tofu and greens"],
    Snack: ["Apple and almonds", "Hummus and carrots"],
  } as const;
  for (let i = 6; i >= 0; i--) {
    const day = addDays(today, -i);
    for (const [mt, time] of [["Breakfast", "07:45"], ["Lunch", "12:30"], ["Dinner", "18:45"]] as const) {
      const when = atTime(day, time);
      if (when > now || r() < 0.15) continue;
      meals.push({ id: id("meal"), ...base(when), mealType: mt, date: stamp(when), description: pick(foods[mt]), waterGlasses: 1 + Math.floor(r() * 3), symptoms: r() < 0.08 ? "Felt bloated afterwards" : undefined });
    }
  }

  /* --- Appointments --- */
  const appointments: Appointment[] = [
    { id: "demo-appt-past", ...base(addDays(today, -20)), date: stamp(atTime(addDays(today, -20), "10:00")), provider: PROVIDER, location: "Bay State Pain Associates — main office", purpose: "Post-injection follow-up" },
    { id: "demo-appt-pt", ...base(today), date: stamp(atTime(addDays(today, 2), "15:00")), provider: PT, location: "Physical therapy suite", purpose: "Physical therapy session", notes: "Bring sneakers." },
    { id: "demo-appt-followup", ...base(today), date: stamp(atTime(addDays(today, 6), "10:30")), provider: PROVIDER, location: "Bay State Pain Associates — main office", purpose: "Medication and pain review", notes: "Export a Pain Tracker report beforehand." },
  ];

  /* --- Reminders --- */
  const rem = (p: Omit<Reminder, "id" | "createdAt" | "updatedAt" | "sound" | "vibration" | "days"> & Partial<Reminder>): Reminder => ({
    id: id("rem"), ...base(created), sound: true, vibration: true, days: [], ...p,
  });
  const reminders: Reminder[] = [
    ...medications.filter((m) => m.times.length).map((m) => rem({ kind: "medication", title: `Take ${m.name}`, detail: `${m.dosage}${m.instructions ? ` · ${m.instructions}` : ""}`, times: m.times, repeat: "Daily", enabled: true, linkedId: m.id })),
    rem({ kind: "pain-log", title: "Log how your pain feels today", detail: "One tap is enough.", times: ["20:00"], repeat: "Daily", enabled: true }),
    rem({ kind: "exercise", title: "Evening walk", detail: "20 minutes, at a comfortable pace.", times: ["18:00"], repeat: "Selected days", days: [1, 3, 5], enabled: true }),
    rem({ kind: "appointment", title: "Appointment tomorrow", detail: "Medication and pain review at 10:30 AM", times: ["18:00"], repeat: "Once", onceDate: dayKey(addDays(today, 5)), enabled: true, linkedId: "demo-appt-followup" }),
  ];

  return { pain, medications, doses, injections, exercise, meals, appointments, reminders };
}
