import { useState } from "react";
import { Check, Clock, MessageSquarePlus, RotateCcw } from "lucide-react";
import { useStore } from "@/app/AppStore";
import { Badge, Dialog, TextArea } from "@/components/ui";
import type { DoseStatus } from "@/data/models";
import type { ScheduledDose } from "@/logic/medications";
import { formatTime } from "@/lib/dates";

const STATE_BADGE: Record<ScheduledDose["state"], { tone: "success" | "warning" | "danger" | "neutral" | "info"; label: string }> = {
  taken: { tone: "success", label: "Taken" },
  skipped: { tone: "neutral", label: "Skipped" },
  missed: { tone: "danger", label: "Missed" },
  due: { tone: "info", label: "Due now" },
  overdue: { tone: "warning", label: "Not recorded" },
  upcoming: { tone: "neutral", label: "Upcoming" },
};

/** One scheduled dose with Taken / Skipped / Missed recording and optional side-effect note. */
export function DoseRow({ dose, compact = false }: { dose: ScheduledDose; compact?: boolean }) {
  const { save, remove } = useStore();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(dose.record?.sideEffects ?? "");
  const b = STATE_BADGE[dose.state];
  const record = (status: DoseStatus) =>
    save("doses", { id: dose.record?.id, createdAt: dose.record?.createdAt, medicationId: dose.medication.id, scheduledFor: dose.scheduledFor.toISOString(), recordedAt: new Date().toISOString(), status, sideEffects: dose.record?.sideEffects });
  const name = `${dose.medication.name} ${formatTime(dose.scheduledFor)}`;
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <span className="icon-tile w-10 h-10 mt-0.5">{dose.state === "taken" ? <Check size={20} aria-hidden /> : <Clock size={20} aria-hidden />}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-semibold text-ink">{dose.medication.name}</p>
            <Badge tone={b.tone}>{b.label}</Badge>
          </div>
          <p className="text-sm text-ink-muted">{dose.medication.dosage} · {formatTime(dose.scheduledFor)}</p>
          {dose.record?.sideEffects && <p className="text-sm text-ink mt-0.5">Side effects: {dose.record.sideEffects}</p>}
        </div>
      </div>
      {dose.state !== "upcoming" || !compact ? (
        <div className="flex flex-wrap gap-2 mt-2 pl-[52px]">
          {dose.record ? (
            <>
              <button type="button" className="btn-ghost btn-sm" onClick={() => setNoteOpen(true)} aria-label={`Add side-effect note for ${name}`}><MessageSquarePlus size={16} aria-hidden /> Side effects</button>
              <button type="button" className="btn-ghost btn-sm" onClick={() => remove("doses", dose.record!.id, { undoLabel: "Dose record cleared" })} aria-label={`Clear record for ${name}`}><RotateCcw size={16} aria-hidden /> Change</button>
            </>
          ) : (
            <>
              <button type="button" className="btn-primary btn-sm" onClick={() => record("taken")} aria-label={`Mark ${name} as taken`}>Taken</button>
              <button type="button" className="btn-secondary btn-sm border" onClick={() => record("skipped")} aria-label={`Mark ${name} as skipped`}>Skipped</button>
              <button type="button" className="btn-secondary btn-sm border" onClick={() => record("missed")} aria-label={`Mark ${name} as missed`}>Missed</button>
            </>
          )}
        </div>
      ) : null}
      <Dialog open={noteOpen} onClose={() => setNoteOpen(false)} title="Side-effect note" description={`${dose.medication.name}, ${formatTime(dose.scheduledFor)}. This is shared only if you include it in a report.`}>
        <form onSubmit={(e) => { e.preventDefault(); if (dose.record) save("doses", { ...dose.record, sideEffects: note.trim() || undefined }); setNoteOpen(false); }}>
          <TextArea label="What did you notice?" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Drowsy for an hour" />
          <p className="text-sm text-ink-muted mt-2">If a side effect is severe or worrying, contact your care team.</p>
          <div className="flex justify-end gap-2 mt-4"><button type="button" className="btn-ghost" onClick={() => setNoteOpen(false)}>Cancel</button><button className="btn-primary">Save note</button></div>
        </form>
      </Dialog>
    </li>
  );
}
