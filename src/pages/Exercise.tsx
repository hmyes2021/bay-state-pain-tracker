import { useState, type FormEvent } from "react";
import { Dumbbell } from "lucide-react";
import { useStore } from "@/app/AppStore";
import { useToast } from "@/components/Toast";
import { Badge, ChipGroup, SelectField, Stat, TextArea, TextField } from "@/components/ui";
import { FormActions, PainSelect, RecordPage } from "@/features/records/RecordPage";
import { DIFFICULTY, EXERCISE_TYPES, type ExerciseSession } from "@/data/models";
import { exerciseSummary, inRange } from "@/logic/insights";
import { addDays, formatTime, fromLocalInput, relativeDay, startOfWeek, toLocalInput } from "@/lib/dates";

function ExerciseForm({ initial, onDone }: { initial: Partial<ExerciseSession>; onDone: () => void }) {
  const { save } = useStore();
  const toast = useToast();
  const [r, setR] = useState<Partial<ExerciseSession>>(initial);
  const [err, setErr] = useState<string>();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!r.durationMin || r.durationMin < 1) { setErr("Enter how many minutes"); return; }
    await save("exercise", { type: r.type ?? "Walking", date: r.date ?? new Date().toISOString(), durationMin: Math.round(r.durationMin), painBefore: r.painBefore, painAfter: r.painAfter, difficulty: r.difficulty, notes: r.notes?.trim() || undefined, id: r.id, createdAt: r.createdAt });
    toast.show(r.id ? "Session updated" : "Exercise logged");
    onDone();
  };
  return (
    <form onSubmit={submit} noValidate className="grid gap-4 md:grid-cols-2">
      <SelectField label="Exercise type" options={EXERCISE_TYPES} value={r.type ?? "Walking"} onChange={(e) => setR({ ...r, type: e.target.value })} />
      <TextField label="Duration (minutes)" type="number" inputMode="numeric" min={1} max={600} value={r.durationMin ?? ""} onChange={(e) => { setErr(undefined); setR({ ...r, durationMin: e.target.value ? Number(e.target.value) : undefined }); }} error={err} />
      <TextField label="Date and time" type="datetime-local" value={toLocalInput(r.date ?? new Date())} onChange={(e) => e.target.value && setR({ ...r, date: fromLocalInput(e.target.value) })} />
      <div className="hidden md:block" />
      <PainSelect id="eb" label="Pain before" value={r.painBefore} onChange={(n) => setR({ ...r, painBefore: n })} />
      <PainSelect id="ea" label="Pain after" value={r.painAfter} onChange={(n) => setR({ ...r, painAfter: n })} />
      <div className="md:col-span-2"><ChipGroup label="Difficulty" options={DIFFICULTY} value={r.difficulty} onChange={(x: ExerciseSession["difficulty"]) => setR({ ...r, difficulty: x })} /></div>
      <TextArea className="md:col-span-2" label="Notes" optional value={r.notes ?? ""} onChange={(e) => setR({ ...r, notes: e.target.value })} />
      <div className="md:col-span-2"><FormActions onCancel={onDone} label={r.id ? "Save changes" : "Log exercise"} /></div>
    </form>
  );
}

export default function Exercise() {
  const { data } = useStore();
  const now = new Date();
  const week = exerciseSummary(inRange(data.exercise, (e) => e.date, startOfWeek(now), addDays(now, 1)));
  const all = exerciseSummary(data.exercise);
  return (
    <RecordPage
      title="Exercise" noun="session" collection="exercise" icon={Dumbbell}
      dateOf={(r) => r.date} blank={() => ({ date: new Date().toISOString(), type: "Walking", durationMin: 20 })} Form={ExerciseForm}
      emptyText="Log walks, physical therapy and stretching to see your activity over time."
      summary={data.exercise.length > 0 && (
        <div className="card card-pad mb-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Minutes this week" value={week.minutes} />
          <Stat label="Sessions this week" value={week.sessions} />
          <Stat label="Avg pain before" value={all.avgBefore ?? "–"} sub="all sessions" />
          <Stat label="Avg pain after" value={all.avgAfter ?? "–"} sub="all sessions" />
        </div>
      )}
      row={(r) => ({
        side: <span className="icon-tile"><Dumbbell size={20} aria-hidden /></span>,
        title: `${r.type} · ${r.durationMin} min`,
        sub: `${relativeDay(r.date)}, ${formatTime(r.date)}`,
        body: <div className="flex flex-wrap gap-2 mt-1.5">{r.painBefore != null && r.painAfter != null && <Badge tone="info">Pain {r.painBefore} → {r.painAfter}</Badge>}{r.difficulty && <Badge>{r.difficulty}</Badge>}{r.notes && <p className="text-sm text-ink w-full">{r.notes}</p>}</div>,
      })}
    />
  );
}
