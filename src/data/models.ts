/**
 * Pain Tracker data models.
 * Every record is patient-reported. Nothing here is a diagnosis, and the app never
 * calculates or recommends medication changes.
 */

export type ISODate = string; // full ISO timestamp

export interface BaseRecord {
  id: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/* ---------- Pain ---------- */

export type BodyView = "front" | "back";
export type BodyRegionId = string; // see features/pain/bodyRegions.ts

export const PAIN_CHARACTERISTICS = ["Aching", "Sharp", "Burning", "Throbbing", "Stabbing", "Shooting", "Tingling", "Numb", "Stiff", "Cramping"] as const;
export const PAIN_DURATIONS = ["Under 1 hour", "1–4 hours", "4–12 hours", "Most of the day", "Constant"] as const;
export const COMMON_TRIGGERS = ["Sitting", "Standing", "Walking", "Lifting", "Poor sleep", "Weather", "Stress", "Bending", "Driving", "Exercise"] as const;
export const IMPACT_LEVELS = ["None", "Mild", "Moderate", "Severe"] as const;

export type ImpactLevel = (typeof IMPACT_LEVELS)[number];

export interface PainEntry extends BaseRecord {
  timestamp: ISODate;
  intensity: number; // 0–10
  locations: BodyRegionId[];
  characteristics: string[];
  duration?: string;
  triggers: string[];
  sleepImpact?: ImpactLevel;
  activityImpact?: ImpactLevel;
  notes?: string;
}

/* ---------- Medication ---------- */

export const MED_FREQUENCIES = ["Daily", "Every 12 hours", "Every 8 hours", "As needed", "Custom"] as const;
export type MedFrequency = (typeof MED_FREQUENCIES)[number];
export type DoseStatus = "taken" | "missed" | "skipped";

export interface Medication extends BaseRecord {
  name: string;
  dosage: string; // as prescribed, free text e.g. "300 mg"
  frequency: MedFrequency;
  times: string[]; // "HH:MM" local, empty for as-needed
  instructions?: string;
  prescriber?: string;
  active: boolean;
}

export interface DoseRecord extends BaseRecord {
  medicationId: string;
  scheduledFor?: ISODate; // undefined for as-needed doses
  recordedAt: ISODate;
  status: DoseStatus;
  sideEffects?: string;
}

/* ---------- Treatments (therapeutic injections) ---------- */

export const INJECTION_TYPES = [
  "Epidural steroid injection",
  "Facet joint injection",
  "Medial branch block",
  "Radiofrequency ablation",
  "Nerve block",
  "Trigger point injection",
  "Joint injection",
  "Sacroiliac joint injection",
  "Other",
] as const;
export const EFFECTIVENESS = ["Not effective", "Slightly effective", "Moderately effective", "Very effective"] as const;
export type Effectiveness = (typeof EFFECTIVENESS)[number];

export interface InjectionRecord extends BaseRecord {
  type: string;
  date: ISODate;
  location: string;
  provider: string;
  painBefore?: number;
  painAfter?: number;
  effectiveness?: Effectiveness;
  notes?: string;
}

/* ---------- Exercise ---------- */

export const EXERCISE_TYPES = ["Walking", "Physical therapy exercises", "Stretching", "Aquatic therapy", "Stationary bike", "Yoga", "Strength training", "Other"] as const;
export const DIFFICULTY = ["Easy", "Moderate", "Hard"] as const;

export interface ExerciseSession extends BaseRecord {
  type: string;
  date: ISODate;
  durationMin: number;
  painBefore?: number;
  painAfter?: number;
  difficulty?: (typeof DIFFICULTY)[number];
  notes?: string;
}

/* ---------- Meals ---------- */

export const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;

export interface MealEntry extends BaseRecord {
  mealType: (typeof MEAL_TYPES)[number];
  date: ISODate;
  description: string;
  waterGlasses?: number;
  symptoms?: string;
}

/* ---------- Appointments ---------- */

export interface Appointment extends BaseRecord {
  date: ISODate;
  provider: string;
  location?: string;
  purpose: string;
  notes?: string;
}

/* ---------- Reminders ---------- */

export const REMINDER_KINDS = ["medication", "pain-log", "exercise", "appointment", "custom"] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];
export const REMINDER_REPEATS = ["Daily", "Weekdays", "Selected days", "Once"] as const;
export type ReminderRepeat = (typeof REMINDER_REPEATS)[number];

export interface Reminder extends BaseRecord {
  kind: ReminderKind;
  title: string;
  detail?: string;
  times: string[]; // "HH:MM"
  repeat: ReminderRepeat;
  days: number[]; // 0=Sun … 6=Sat, used for "Selected days"
  onceDate?: string; // "YYYY-MM-DD" for "Once"
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  linkedId?: string; // medication or appointment id
  lastFiredKey?: string; // "YYYY-MM-DD HH:MM" to prevent duplicate alerts
}

/* ---------- Profile, consent, settings ---------- */

export type Role = "patient" | "caregiver" | "clinician";

export const GOALS = ["Track Pain", "Share with Doctor", "Manage Meds", "Understand Triggers", "Injection", "Monitor Sleep"] as const;

export interface Profile {
  id: string;
  displayName: string;
  role: Role;
  goals: string[];
  createdAt: ISODate;
}

export interface Consent {
  version: number;
  acceptedAt: ISODate;
  demoAcknowledged: boolean;
  storageOnDevice: boolean;
  notMedicalAdvice: boolean;
  voiceDictation: boolean; // opt-in: browser speech services may process audio off-device
}

export interface Settings {
  notificationsEnabled: boolean;
  voiceInputEnabled: boolean;
  reduceCharts: boolean;
}

export interface PainDraft {
  savedAt: ISODate;
  editingId?: string;
  values: Partial<PainEntry>;
}

export const CONSENT_VERSION = 1;

/** Collections persisted per patient. */
export interface PatientData {
  pain: PainEntry[];
  medications: Medication[];
  doses: DoseRecord[];
  injections: InjectionRecord[];
  exercise: ExerciseSession[];
  meals: MealEntry[];
  appointments: Appointment[];
  reminders: Reminder[];
}

export type CollectionName = keyof PatientData;
