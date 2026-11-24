import { useCallback, useMemo, useState, type FormEvent } from "react";
import { Info, Pencil, Pill, Plus, Trash2, X } from "lucide-react";
import { Page } from "@/app/AppShell";
import { useStore } from "@/app/AppStore";
import { useToast } from "@/components/Toast";
import { Badge, Card, ChipGroup, ConfirmDialog, Dialog, EmptyState, Segmented, Switch, TextArea, TextField } from "@/components/ui";
import { DoseRow } from "@/features/meds/DoseRow";
import { MED_FREQUENCIES, type DoseStatus, type Medication } from "@/data/models";
import { asNeededToday, defaultTimes, dosesForDay } from "@/logic/medications";
import { addDays, dayKey, formatDateLong, formatTime, formatTime12, startOfDay } from "@/lib/dates";
import { useNewParam } from "@/hooks/useNewParam";

type MedDraft = Omit<Medication, "id" | "createdAt" | "updatedAt"> & { id?: string; createdAt?: string };
const emptyMed = (): MedDraft => ({ name: "", dosage: "", frequency: "Daily", times: ["08:00"], instructions: "", prescriber: "", active: true });

function MedForm({ initial, onDone }: { initial: MedDraft; onDone: () => void }) {
  const { save, data } = useStore();
  const toast = useToast();
  const [m, setM] = useState<MedDraft>(initial);
  const [remind, setRemind] = useState(!initial.id);
  const [errors, setErrors] = useState<{ name?: string; dosage?: string }>({});
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const er = { name: m.name.trim() ? undefined : "Enter the medication name", dosage: m.dosage.trim() ? undefined : "Enter the dosage exactly as prescribed" };
    setErrors(er);
    if (er.name || er.dosage) return;
    const times = [...new Set(m.times.filter(Boolean))].sort();
    const rec = await save("medications", { ...m, name: m.name.trim(), dosage: m.dosage.trim(), times }).catch(() => null);
    if (!rec) return;
    if (remind && times.length && !data.reminders.some((r) => r.linkedId === rec.id)) {
      await save("reminders", { kind: "medication", title: `Take ${rec.name}`, detail: `${rec.dosage}${rec.instructions ? ` · ${rec.instructions}` : ""}`, times, repeat: "Daily", days: [], enabled: true, sound: true, vibration: true, linkedId: rec.id }).catch(() => {});
    }
    toast.show(initial.id ? "Medication updated" : `${rec.name} added${remind && times.length ? " with a reminder" : ""}`);
    onDone();
  };
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <TextField label="Medication name" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} error={errors.name} autoFocus placeholder="e.g. Ibuprofen" />
      <TextField label="Prescribed dosage" value={m.dosage} onChange={(e) => setM({ ...m, dosage: e.target.value })} error={errors.dosage} placeholder="e.g. 400 mg tablet" hint="Copy this from your prescription label." />
      <ChipGroup label="How often?" options={MED_FREQUENCIES} value={m.frequency} onChange={(f: Medication["frequency"] | undefined) => f && setM({ ...m, frequency: f, times: f === "Custom" ? m.times : defaultTimes(f) })} />
      {m.frequency !== "As needed" && (
        <fieldset>
          <legend className="field-label">Dose times</legend>
          <ul className="space-y-2">
            {m.times.map((t, i) => (
              <li key={i} className="flex gap-2">
                <label className="sr-only" htmlFor={`t${i}`}>Dose {i + 1} time</label>
                <input id={`t${i}`} type="time" className="input" value={t} onChange={(e) => setM({ ...m, frequency: "Custom", times: m.times.map((x, j) => (j === i ? e.target.value : x)) })} />
                <button type="button" className="icon-btn text-ink-muted" aria-label={`Remove dose ${i + 1} time`} onClick={() => setM({ ...m, frequency: "Custom", times: m.times.filter((_, j) => j !== i) })}><X size={18} aria-hidden /></button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn-ghost btn-sm mt-2" onClick={() => setM({ ...m, frequency: "Custom", times: [...m.times, "12:00"] })}><Plus size={16} aria-hidden /> Add a time</button>
        </fieldset>
      )}
      <TextField label="Instructions" optional value={m.instructions ?? ""} onChange={(e) => setM({ ...m, instructions: e.target.value })} placeholder="e.g. Take with food" />
      <TextField label="Prescribed by" optional value={m.prescriber ?? ""} onChange={(e) => setM({ ...m, prescriber: e.target.value })} />
      {!initial.id && m.frequency !== "As needed" && <Switch label="Remind me at these times" checked={remind} onChange={setRemind} />}
      {initial.id && <Switch label="Currently taking" description="Turn off to keep history but hide it from today's schedule." checked={m.active} onChange={(a) => setM({ ...m, active: a })} />}
      <p className="text-sm text-ink-muted flex gap-2"><Info size={16} className="shrink-0 mt-0.5" aria-hidden /> Only change doses on your care team's advice. Pain Tracker records your schedule; it never suggests dose changes.</p>
      <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onDone}>Cancel</button><button className="btn-primary">{initial.id ? "Save changes" : "Add medication"}</button></div>
    </form>
  );
}

function AsNeededDialog({ med, onClose }: { med: Medication; onClose: () => void }) {
  const { save } = useStore();
  const toast = useToast();
  const [side, setSide] = useState("");
  return (
    <Dialog open onClose={onClose} title={`Record ${med.name}`} description={`${med.dosage}${med.instructions ? ` · ${med.instructions}` : ""}`}>
      <form onSubmit={async (e) => { e.preventDefault(); await save("doses", { medicationId: med.id, recordedAt: new Date().toISOString(), status: "taken", sideEffects: side.trim() || undefined }); toast.show(`${med.name} recorded at ${formatTime(new Date())}`); onClose(); }}>
        <TextArea label="Side effects" optional value={side} onChange={(e) => setSide(e.target.value)} />
        <div className="flex justify-end gap-2 mt-4"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary">Record dose taken now</button></div>
      </form>
    </Dialog>
  );
}

const STATUS_TONE: Record<DoseStatus, "success" | "danger" | "neutral"> = { taken: "success", missed: "danger", skipped: "neutral" };

export default function Medications() {
  const { data, remove, save } = useStore();
  const [editing, setEditing] = useState<MedDraft | null>(null);
  const [deleting, setDeleting] = useState<Medication | null>(null);
  const [prn, setPrn] = useState<Medication | null>(null);
  const [filter, setFilter] = useState<"all" | DoseStatus>("all");
  const [daysShown, setDaysShown] = useState(3);
  const openNew = useCallback(() => setEditing(emptyMed()), []);
  useNewParam(openNew);

  const now = new Date();
  const today = dosesForDay(data.medications, data.doses, now, now);
  const prnToday = asNeededToday(data.medications, data.doses, now);
  const active = data.medications.filter((m) => m.active);
  const inactive = data.medications.filter((m) => !m.active);
  const medName = (id: string) => data.medications.find((m) => m.id === id)?.name ?? "Removed medication";

  const history = useMemo(() => {
    const from = addDays(startOfDay(now), -13).getTime();
    const list = data.doses.filter((d) => new Date(d.recordedAt).getTime() >= from && (filter === "all" || d.status === filter)).sort((a, b) => (b.scheduledFor ?? b.recordedAt).localeCompare(a.scheduledFor ?? a.recordedAt));
    const m = new Map<string, typeof list>();
    for (const d of list) { const k = dayKey(d.scheduledFor ?? d.recordedAt); m.set(k, [...(m.get(k) ?? []), d]); }
    return [...m.entries()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.doses, filter]);

  return (
    <Page title="Medications" back="/" wide action={<button type="button" onClick={openNew} className="btn min-h-[40px] px-3 bg-white/15 text-white lg:bg-primary lg:min-h-[44px]"><Plus size={18} aria-hidden /> Add</button>}>
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Card title="Today's schedule" icon={Pill}>
          {today.length ? <ul className="divide-y divide-line">{today.map((d) => <DoseRow key={`${d.medication.id}-${d.time}`} dose={d} />)}</ul> : <EmptyState icon={Pill} title="No scheduled doses today" />}
          {prnToday.length > 0 && <p className="text-sm text-ink-muted mt-3">As-needed today: {prnToday.map((d) => `${medName(d.medicationId)} at ${formatTime(d.recordedAt)}`).join(", ")}</p>}
        </Card>

        <Card title="My medications" icon={Pill}>
          {active.length === 0 && <EmptyState icon={Pill} title="No medications yet" action={<button className="btn-primary" onClick={openNew}><Plus size={18} aria-hidden /> Add medication</button>}>Add what your care team prescribed to track doses and get reminders.</EmptyState>}
          <ul className="divide-y divide-line">
            {[...active, ...inactive].map((m) => (
              <li key={m.id} className="py-3 first:pt-0">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink">{m.name} {!m.active && <Badge>Not taking</Badge>}</p>
                    <p className="text-sm text-ink-muted">{m.dosage} · {m.frequency === "As needed" ? "As needed" : m.times.map(formatTime12).join(", ")}</p>
                    {m.instructions && <p className="text-sm text-ink-muted">{m.instructions}</p>}
                    {m.prescriber && <p className="text-xs text-ink-subtle mt-0.5">Prescribed by {m.prescriber}</p>}
                  </div>
                  <button type="button" className="icon-btn text-primary" aria-label={`Edit ${m.name}`} onClick={() => setEditing({ ...m })}><Pencil size={18} aria-hidden /></button>
                  <button type="button" className="icon-btn text-danger-ink" aria-label={`Delete ${m.name}`} onClick={() => setDeleting(m)}><Trash2 size={18} aria-hidden /></button>
                </div>
                {m.active && m.frequency === "As needed" && <button type="button" className="btn-secondary btn-sm mt-2" onClick={() => setPrn(m)}>Record a dose</button>}
              </li>
            ))}
          </ul>
          <p className="text-sm text-ink-muted mt-4 flex gap-2"><Info size={16} className="shrink-0 mt-0.5" aria-hidden /> Pain Tracker mirrors your prescribed schedule. It doesn't calculate or recommend dose changes — ask your care team.</p>
        </Card>

        <section className="card card-pad lg:col-span-2" aria-labelledby="hist-h">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 id="hist-h" className="section-title">Medication history · last 14 days</h2>
            <Segmented label="Filter by status" size="sm" value={filter} onChange={setFilter} options={[{ value: "all", label: "All" }, { value: "taken", label: "Taken" }, { value: "missed", label: "Missed" }, { value: "skipped", label: "Skipped" }]} />
          </div>
          {history.length === 0 ? <EmptyState icon={Pill} title="No dose records in this view" /> : (
            <div className="grid gap-x-8 md:grid-cols-2">
              {history.slice(0, daysShown).map(([k, list]) => (
                <div key={k} className="py-2 break-inside-avoid">
                  <h3 className="text-sm font-semibold text-ink-muted mb-1">{formatDateLong(list[0].scheduledFor ?? list[0].recordedAt)}</h3>
                  <ul>
                    {list.map((d) => (
                      <li key={d.id} className="flex items-center gap-2 py-1.5 text-[0.95rem]">
                        <span className="w-20 text-ink-muted tabular-nums text-sm">{formatTime(d.scheduledFor ?? d.recordedAt)}</span>
                        <span className="flex-1 min-w-0 truncate">{medName(d.medicationId)}{!d.scheduledFor && <span className="text-ink-muted"> (as needed)</span>}{d.sideEffects && <span className="block text-xs text-ink-muted">{d.sideEffects}</span>}</span>
                        <Badge tone={STATUS_TONE[d.status]}>{d.status[0].toUpperCase() + d.status.slice(1)}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          {history.length > daysShown && <button type="button" className="btn-ghost w-full mt-2 border border-line" onClick={() => setDaysShown(daysShown + 4)}>Show more days ({history.length - daysShown} more)</button>}
        </section>
      </div>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? `Edit ${editing.name}` : "Add medication"}>
        {editing && <MedForm initial={editing} onDone={() => setEditing(null)} />}
      </Dialog>
      {prn && <AsNeededDialog med={prn} onClose={() => setPrn(null)} />}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title={`Delete ${deleting?.name}?`} description="Its dose history stays in your records. Linked reminders are turned off. To keep it in reports, edit it and turn off “Currently taking” instead."
        onConfirm={() => {
          if (!deleting) return;
          for (const r of data.reminders.filter((x) => x.linkedId === deleting.id && x.enabled)) save("reminders", { ...r, enabled: false }).catch(() => {});
          remove("medications", deleting.id, { undoLabel: `${deleting.name} deleted` });
        }} />
    </Page>
  );
}
