import { useState, type FormEvent } from "react";
import { Syringe } from "lucide-react";
import { useStore } from "@/app/AppStore";
import { useToast } from "@/components/Toast";
import { Badge, ChipGroup, SelectField, TextArea, TextField } from "@/components/ui";
import { FormActions, PainSelect, RecordPage } from "@/features/records/RecordPage";
import { EFFECTIVENESS, INJECTION_TYPES, type InjectionRecord } from "@/data/models";
import { aroundInjection } from "@/logic/insights";
import { formatDateYear, fromLocalInput, toLocalInput } from "@/lib/dates";

function InjectionForm({ initial, onDone }: { initial: Partial<InjectionRecord>; onDone: () => void }) {
  const { save } = useStore();
  const toast = useToast();
  const [r, setR] = useState<Partial<InjectionRecord>>(initial);
  const [err, setErr] = useState<Record<string, string>>({});
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!r.location?.trim()) er.location = "Where was the injection given?";
    if (!r.provider?.trim()) er.provider = "Who gave the injection?";
    setErr(er);
    if (Object.keys(er).length) return;
    await save("injections", { type: r.type ?? INJECTION_TYPES[0], date: r.date ?? new Date().toISOString(), location: r.location!.trim(), provider: r.provider!.trim(), painBefore: r.painBefore, painAfter: r.painAfter, effectiveness: r.effectiveness, notes: r.notes?.trim() || undefined, id: r.id, createdAt: r.createdAt });
    toast.show(r.id ? "Injection updated" : "Injection recorded");
    onDone();
  };
  return (
    <form onSubmit={submit} noValidate className="grid gap-4 md:grid-cols-2">
      <SelectField label="Injection type" options={INJECTION_TYPES} value={r.type ?? INJECTION_TYPES[0]} onChange={(e) => setR({ ...r, type: e.target.value })} />
      <TextField label="Date" type="datetime-local" value={toLocalInput(r.date ?? new Date())} onChange={(e) => e.target.value && setR({ ...r, date: fromLocalInput(e.target.value) })} />
      <TextField label="Body location" value={r.location ?? ""} onChange={(e) => setR({ ...r, location: e.target.value })} error={err.location} placeholder="e.g. Lower back, L4–L5" />
      <TextField label="Provider" value={r.provider ?? ""} onChange={(e) => setR({ ...r, provider: e.target.value })} error={err.provider} placeholder="e.g. Dr. Ruiz" />
      <PainSelect id="pb" label="Pain before" value={r.painBefore} onChange={(n) => setR({ ...r, painBefore: n })} />
      <PainSelect id="pa" label="Pain after" value={r.painAfter} onChange={(n) => setR({ ...r, painAfter: n })} />
      <div className="md:col-span-2"><ChipGroup label="How effective did it feel to you?" options={EFFECTIVENESS} value={r.effectiveness} onChange={(x: InjectionRecord["effectiveness"]) => setR({ ...r, effectiveness: x })} /></div>
      <TextArea className="md:col-span-2" label="Notes" optional value={r.notes ?? ""} onChange={(e) => setR({ ...r, notes: e.target.value })} placeholder="Soreness, how long relief lasted, questions for your doctor" />
      <div className="md:col-span-2"><FormActions onCancel={onDone} label={r.id ? "Save changes" : "Record injection"} /></div>
    </form>
  );
}

export default function Treatments() {
  const { data } = useStore();
  return (
    <RecordPage
      title="Therapeutic injections" noun="injection" collection="injections" icon={Syringe}
      dateOf={(r) => r.date} blank={() => ({ date: new Date().toISOString(), type: INJECTION_TYPES[0] })} Form={InjectionForm}
      emptyText="Record injections to compare how you felt before and after."
      row={(r) => {
        const around = aroundInjection(data.pain, r);
        return {
          side: <span className="icon-tile"><Syringe size={20} aria-hidden /></span>,
          title: r.type,
          sub: `${formatDateYear(r.date)} · ${r.location} · ${r.provider}`,
          body: (
            <div className="mt-1.5 space-y-1 text-sm">
              <div className="flex flex-wrap gap-2">
                {r.painBefore != null && r.painAfter != null && <Badge tone="info">Pain {r.painBefore} → {r.painAfter}</Badge>}
                {r.effectiveness && <Badge tone={r.effectiveness === "Not effective" ? "neutral" : "success"}>{r.effectiveness}</Badge>}
              </div>
              {(around.beforeCount > 0 || around.afterCount > 0) && <p className="text-ink-muted">Your logs: avg {around.before ?? "–"} in the 2 weeks before, {around.after ?? "–"} in the 2 weeks after.</p>}
              {r.notes && <p className="text-ink">{r.notes}</p>}
            </div>
          ),
        };
      }}
    />
  );
}
