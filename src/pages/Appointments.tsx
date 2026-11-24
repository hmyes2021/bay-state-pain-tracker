import { useState, type FormEvent } from "react";
import { CalendarDays } from "lucide-react";
import { useStore } from "@/app/AppStore";
import { useToast } from "@/components/Toast";
import { Switch, TextArea, TextField } from "@/components/ui";
import { FormActions, RecordPage } from "@/features/records/RecordPage";
import type { Appointment } from "@/data/models";
import { addDays, atTime, dayKey, formatDateLong, formatTime, fromLocalInput, startOfDay, toLocalInput } from "@/lib/dates";

function AppointmentForm({ initial, onDone }: { initial: Partial<Appointment>; onDone: () => void }) {
  const { save } = useStore();
  const toast = useToast();
  const [r, setR] = useState<Partial<Appointment>>(initial);
  const [remind, setRemind] = useState(!initial.id);
  const [err, setErr] = useState<Record<string, string>>({});
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!r.purpose?.trim()) er.purpose = "What is the visit for?";
    if (!r.provider?.trim()) er.provider = "Who is the appointment with?";
    setErr(er);
    if (Object.keys(er).length) return;
    const rec = await save("appointments", { date: r.date ?? new Date().toISOString(), provider: r.provider!.trim(), purpose: r.purpose!.trim(), location: r.location?.trim() || undefined, notes: r.notes?.trim() || undefined, id: r.id, createdAt: r.createdAt }).catch(() => null);
    if (!rec) return;
    const dayBefore = addDays(startOfDay(rec.date), -1);
    if (remind && atTime(dayBefore, "18:00") > new Date()) {
      await save("reminders", { kind: "appointment", title: "Appointment tomorrow", detail: `${rec.purpose} at ${formatTime(rec.date)}`, times: ["18:00"], repeat: "Once", onceDate: dayKey(dayBefore), days: [], enabled: true, sound: true, vibration: true, linkedId: rec.id }).catch(() => {});
    }
    toast.show(r.id ? "Appointment updated" : "Appointment added");
    onDone();
  };
  return (
    <form onSubmit={submit} noValidate className="grid gap-4 md:grid-cols-2">
      <TextField className="md:col-span-2" label="Purpose" value={r.purpose ?? ""} onChange={(e) => setR({ ...r, purpose: e.target.value })} error={err.purpose} placeholder="e.g. Follow-up visit" />
      <TextField label="Date and time" type="datetime-local" value={toLocalInput(r.date ?? new Date())} onChange={(e) => e.target.value && setR({ ...r, date: fromLocalInput(e.target.value) })} />
      <TextField label="Provider" value={r.provider ?? ""} onChange={(e) => setR({ ...r, provider: e.target.value })} error={err.provider} />
      <TextField className="md:col-span-2" label="Location" optional value={r.location ?? ""} onChange={(e) => setR({ ...r, location: e.target.value })} />
      <TextArea className="md:col-span-2" label="Notes and questions" optional value={r.notes ?? ""} onChange={(e) => setR({ ...r, notes: e.target.value })} />
      {!initial.id && <div className="md:col-span-2"><Switch label="Remind me the evening before (6:00 PM)" checked={remind} onChange={setRemind} /></div>}
      <div className="md:col-span-2"><FormActions onCancel={onDone} label={r.id ? "Save changes" : "Add appointment"} /></div>
    </form>
  );
}

export default function Appointments() {
  return (
    <RecordPage
      title="Appointments" noun="appointment" collection="appointments" icon={CalendarDays} upcomingFirst
      dateOf={(r) => r.date} blank={() => ({ date: atTime(addDays(new Date(), 7), "10:00").toISOString() })} Form={AppointmentForm}
      emptyText="Add upcoming visits so they show on Home and you can prepare a report."
      row={(r) => ({
        side: <div className="w-14 shrink-0 rounded-sm bg-primary-soft text-navy text-center py-1.5"><p className="text-xs font-semibold uppercase">{new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(r.date))}</p><p className="text-xl font-bold leading-none">{new Date(r.date).getDate()}</p></div>,
        title: r.purpose,
        sub: `${formatDateLong(r.date)}, ${formatTime(r.date)} · ${r.provider}${r.location ? ` · ${r.location}` : ""}`,
        body: r.notes ? <p className="text-sm text-ink mt-1">{r.notes}</p> : undefined,
      })}
    />
  );
}
