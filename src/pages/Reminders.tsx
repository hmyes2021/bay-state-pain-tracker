import { useCallback, useState, type FormEvent } from "react";
import { Bell, BellOff, BellRing, CalendarDays, Dumbbell, Pencil, Pill, Plus, Smartphone, Sparkles, Trash2, Volume2, X, Activity } from "lucide-react";
import { Page } from "@/app/AppShell";
import { useStore } from "@/app/AppStore";
import { useToast } from "@/components/Toast";
import { ChipGroup, ConfirmDialog, Dialog, EmptyState, Switch, TextField, type Icon } from "@/components/ui";
import { REMINDER_KINDS, REMINDER_REPEATS, type Reminder, type ReminderKind } from "@/data/models";
import { describeRepeat, nextOccurrence } from "@/logic/reminders";
import { deliverReminder, notificationPermission, requestNotifications } from "@/hooks/useReminderRunner";
import { useNewParam } from "@/hooks/useNewParam";
import { dayKey, formatTime, formatTime12, relativeDay } from "@/lib/dates";
import { cx } from "@/lib/cx";

const KIND: Record<ReminderKind, { label: string; icon: Icon; title: string }> = {
  medication: { label: "Medication", icon: Pill, title: "Time to take your medication" },
  "pain-log": { label: "Pain log", icon: Activity, title: "How is your pain right now?" },
  exercise: { label: "Exercise", icon: Dumbbell, title: "Time for your exercises" },
  appointment: { label: "Appointment", icon: CalendarDays, title: "Upcoming appointment" },
  custom: { label: "Custom", icon: Sparkles, title: "Reminder" },
};
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Draft = Omit<Reminder, "id" | "createdAt" | "updatedAt"> & { id?: string; createdAt?: string };
const blank = (kind: ReminderKind = "pain-log"): Draft => ({ kind, title: KIND[kind].title, detail: "", times: ["20:00"], repeat: "Daily", days: [1, 2, 3, 4, 5], enabled: true, sound: true, vibration: true });

function ReminderForm({ initial, onDone }: { initial: Draft; onDone: () => void }) {
  const { save, data } = useStore();
  const toast = useToast();
  const [r, setR] = useState<Draft>(initial);
  const [err, setErr] = useState<string>();
  const kindLabels = REMINDER_KINDS.map((k) => KIND[k].label);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!r.title.trim()) return setErr("Give the reminder a short title");
    if (!r.times.filter(Boolean).length) return setErr("Add at least one time");
    if (r.repeat === "Selected days" && !r.days.length) return setErr("Choose at least one day");
    if (r.repeat === "Once" && !r.onceDate) return setErr("Choose a date");
    await save("reminders", { ...r, title: r.title.trim(), detail: r.detail?.trim() || undefined, times: [...new Set(r.times.filter(Boolean))].sort(), lastFiredKey: undefined });
    toast.show(initial.id ? "Reminder updated" : "Reminder created");
    onDone();
  };
  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <ChipGroup label="Reminder type" options={kindLabels} value={KIND[r.kind].label}
        onChange={(lbl: string | undefined) => { const k = REMINDER_KINDS.find((x) => KIND[x].label === lbl); if (k) setR({ ...r, kind: k, title: r.title === KIND[r.kind].title || !r.title ? KIND[k].title : r.title }); }} />
      {r.kind === "medication" && data.medications.length > 0 && (
        <div>
          <label htmlFor="rmed" className="field-label">Medication</label>
          <select id="rmed" className="input" value={r.linkedId ?? ""} onChange={(e) => { const m = data.medications.find((x) => x.id === e.target.value); setR({ ...r, linkedId: m?.id, title: m ? `Take ${m.name}` : r.title, detail: m ? m.dosage : r.detail, times: m?.times.length ? m.times : r.times }); }}>
            <option value="">Not linked</option>
            {data.medications.map((m) => <option key={m.id} value={m.id}>{m.name} {m.dosage}</option>)}
          </select>
        </div>
      )}
      <TextField label="Title" value={r.title} onChange={(e) => { setErr(undefined); setR({ ...r, title: e.target.value }); }} />
      <TextField label="Details" optional value={r.detail ?? ""} onChange={(e) => setR({ ...r, detail: e.target.value })} placeholder="e.g. Ibuprofen 400mg • Morning dose" />
      <fieldset>
        <legend className="field-label">Times</legend>
        <ul className="space-y-2">
          {r.times.map((t, i) => (
            <li key={i} className="flex gap-2">
              <label htmlFor={`rt${i}`} className="sr-only">Time {i + 1}</label>
              <input id={`rt${i}`} type="time" className="input" value={t} onChange={(e) => setR({ ...r, times: r.times.map((x, j) => (j === i ? e.target.value : x)) })} />
              {r.times.length > 1 && <button type="button" className="icon-btn text-ink-muted" aria-label={`Remove time ${i + 1}`} onClick={() => setR({ ...r, times: r.times.filter((_, j) => j !== i) })}><X size={18} aria-hidden /></button>}
            </li>
          ))}
        </ul>
        <button type="button" className="btn-ghost btn-sm mt-2" onClick={() => setR({ ...r, times: [...r.times, "12:00"] })}><Plus size={16} aria-hidden /> Add a time</button>
      </fieldset>
      <ChipGroup label="How often?" options={REMINDER_REPEATS} value={r.repeat} onChange={(x: Reminder["repeat"] | undefined) => { setErr(undefined); x && setR({ ...r, repeat: x, onceDate: x === "Once" ? r.onceDate ?? dayKey(new Date()) : r.onceDate }); }} />
      {r.repeat === "Selected days" && (
        <div role="group" aria-label="Days of the week" className="flex flex-wrap gap-2">
          {DAY_NAMES.map((d, i) => <button key={d} type="button" className="chip w-[3.25rem] justify-center px-0" aria-pressed={r.days.includes(i)} onClick={() => setR({ ...r, days: r.days.includes(i) ? r.days.filter((x) => x !== i) : [...r.days, i] })}>{d}</button>)}
        </div>
      )}
      {r.repeat === "Once" && <TextField label="Date" type="date" value={r.onceDate ?? ""} min={dayKey(new Date())} onChange={(e) => setR({ ...r, onceDate: e.target.value })} />}
      <div>
        <p className="field-label">Reminder preferences</p>
        <div className="space-y-2">
          <Switch label="Sound notification" icon={Volume2} checked={r.sound} onChange={(v) => setR({ ...r, sound: v })} />
          <Switch label="Vibration" icon={Smartphone} checked={r.vibration} onChange={(v) => setR({ ...r, vibration: v })} description="On supported phones" />
        </div>
      </div>
      <div className="rounded-md border border-accent-soft bg-accent-wash p-4" aria-label="Reminder preview">
        <p className="eyebrow">Reminder preview</p>
        <div className="flex gap-3 mt-2">
          <span className="w-11 h-11 rounded-sm bg-primary text-white flex items-center justify-center shrink-0"><Bell size={20} aria-hidden /></span>
          <div><p className="font-semibold text-ink">{r.title || KIND[r.kind].title}</p><p className="text-ink-muted text-sm">{r.detail || KIND[r.kind].label} · {r.times.filter(Boolean).map(formatTime12).join(", ")}</p></div>
        </div>
      </div>
      {err && <p role="alert" className="text-danger-ink font-medium">{err}</p>}
      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between">
        <button type="button" className="btn-ghost" onClick={() => deliverReminder({ ...r, kind: r.kind }, (m) => toast.show(m, { tone: "info" }))}><BellRing size={18} aria-hidden /> Send a test</button>
        <div className="flex flex-col-reverse sm:flex-row gap-2"><button type="button" className="btn-ghost" onClick={onDone}>Cancel</button><button className="btn-primary btn-lg">{initial.id ? "Save changes" : "Finish Setup"}</button></div>
      </div>
    </form>
  );
}

export default function Reminders() {
  const { data, save, remove, updateSettings } = useStore();
  const toast = useToast();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<Reminder | null>(null);
  const [perm, setPerm] = useState(notificationPermission());
  const openNew = useCallback(() => setEditing(blank()), []);
  useNewParam(openNew);
  const now = new Date();
  const sorted = [...data.reminders].sort((a, b) => (nextOccurrence(a, now)?.getTime() ?? Infinity) - (nextOccurrence(b, now)?.getTime() ?? Infinity));

  const ask = async () => {
    const p = await requestNotifications();
    setPerm(p);
    updateSettings({ notificationsEnabled: p === "granted" });
    toast.show(p === "granted" ? "Notifications allowed" : p === "denied" ? "Notifications are blocked. You can change this in your browser's site settings." : "Notifications aren't available here; reminders will show inside the app.", { tone: p === "granted" ? "success" : "info" });
  };

  return (
    <Page title="Reminders" action={<button type="button" onClick={openNew} className="btn min-h-[40px] px-3 bg-white/15 text-white lg:bg-primary lg:min-h-[44px]"><Plus size={18} aria-hidden /> Add</button>}>
      {perm !== "granted" && (
        <div className="card card-pad mb-4 flex flex-wrap gap-3 items-center border-primary/40 bg-accent-wash">
          <BellOff className="text-primary" size={22} aria-hidden />
          <p className="flex-1 min-w-[14rem] text-[0.95rem]">{perm === "unsupported" ? "This browser can't show system notifications. Reminders appear inside Pain Tracker while it's open." : perm === "denied" ? "Notifications are blocked for this site. Reminders will appear inside Pain Tracker while it's open." : "Allow notifications so reminders can appear even when you're in another app."}</p>
          {perm === "default" && <button type="button" className="btn-primary" onClick={ask}>Allow notifications</button>}
        </div>
      )}
      <p className="text-sm text-ink-muted mb-4">Reminders are delivered while Pain Tracker is open or running in the background. On iPhone, install Pain Tracker to your Home Screen first.</p>

      {sorted.length === 0 ? (
        <div className="card"><EmptyState icon={Bell} title="No reminders yet" action={<button className="btn-primary" onClick={openNew}><Plus size={18} aria-hidden /> Create a reminder</button>}>Set reminders for medications, pain logging, exercise or appointments.</EmptyState></div>
      ) : (
        <ul className="space-y-3">
          {sorted.map((r) => {
            const I = KIND[r.kind].icon;
            const next = nextOccurrence(r, now);
            return (
              <li key={r.id} className={cx("card p-4 flex gap-3 items-start", !r.enabled && "bg-surface-sunken")}>
                <span className="icon-tile"><I size={20} aria-hidden /></span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink">{r.title}</p>
                  <p className="text-sm text-ink-muted">{r.times.map(formatTime12).join(", ")} · {describeRepeat(r)}</p>
                  <p className="text-xs text-ink-muted mt-0.5">{r.enabled ? (next ? `Next: ${relativeDay(next, now)} at ${formatTime(next)}` : "No upcoming time") : "Paused"}</p>
                  <div className="flex gap-1 mt-1 -ml-2">
                    <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing({ ...r })} aria-label={`Edit reminder ${r.title}`}><Pencil size={16} aria-hidden /> Edit</button>
                    <button type="button" className="btn-ghost btn-sm text-danger-ink" onClick={() => setDeleting(r)} aria-label={`Delete reminder ${r.title}`}><Trash2 size={16} aria-hidden /> Delete</button>
                  </div>
                </div>
                <button type="button" role="switch" aria-checked={r.enabled} aria-label={`${r.title} reminder ${r.enabled ? "on" : "off"}`} onClick={() => save("reminders", { ...r, enabled: !r.enabled })}
                  className={cx("relative w-[52px] h-[30px] rounded-full transition-colors shrink-0 border-2 mt-1", r.enabled ? "bg-primary border-primary" : "bg-line-strong border-line-strong")}>
                  <span className={cx("absolute top-[2px] left-[2px] w-[22px] h-[22px] rounded-full bg-white shadow transition-transform", r.enabled && "translate-x-[22px]")} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit reminder" : "New reminder"} size="lg">
        {editing && <ReminderForm initial={editing} onDone={() => setEditing(null)} />}
      </Dialog>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title="Delete this reminder?" onConfirm={() => deleting && remove("reminders", deleting.id, { undoLabel: "Reminder deleted" })} />
    </Page>
  );
}
