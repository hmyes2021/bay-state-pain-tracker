import { useState, type FormEvent } from "react";
import { GlassWater, Utensils } from "lucide-react";
import { useStore } from "@/app/AppStore";
import { useToast } from "@/components/Toast";
import { ChipGroup, Stepper, TextField } from "@/components/ui";
import { FormActions, RecordPage } from "@/features/records/RecordPage";
import { MEAL_TYPES, type MealEntry } from "@/data/models";
import { formatTime, fromLocalInput, isSameDay, relativeDay, toLocalInput } from "@/lib/dates";

function guessMeal(): MealEntry["mealType"] {
  const h = new Date().getHours();
  return h < 11 ? "Breakfast" : h < 15 ? "Lunch" : h < 21 ? "Dinner" : "Snack";
}

function MealForm({ initial, onDone }: { initial: Partial<MealEntry>; onDone: () => void }) {
  const { save } = useStore();
  const toast = useToast();
  const [r, setR] = useState<Partial<MealEntry>>(initial);
  const [err, setErr] = useState<string>();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!r.description?.trim()) { setErr("Briefly describe what you ate"); return; }
    await save("meals", { mealType: r.mealType ?? guessMeal(), date: r.date ?? new Date().toISOString(), description: r.description.trim(), waterGlasses: r.waterGlasses, symptoms: r.symptoms?.trim() || undefined, id: r.id, createdAt: r.createdAt });
    toast.show(r.id ? "Meal updated" : "Meal logged");
    onDone();
  };
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <ChipGroup label="Meal" options={MEAL_TYPES} value={r.mealType ?? guessMeal()} onChange={(x: MealEntry["mealType"] | undefined) => x && setR({ ...r, mealType: x })} />
      <TextField label="What did you eat?" value={r.description ?? ""} onChange={(e) => { setErr(undefined); setR({ ...r, description: e.target.value }); }} error={err} placeholder="e.g. Oatmeal with berries" />
      <Stepper label="Water (glasses)" value={r.waterGlasses ?? 0} onChange={(n) => setR({ ...r, waterGlasses: n })} max={15} />
      <TextField label="Symptoms you noticed" optional value={r.symptoms ?? ""} onChange={(e) => setR({ ...r, symptoms: e.target.value })} placeholder="e.g. Bloating, nausea" />
      <TextField label="When" type="datetime-local" value={toLocalInput(r.date ?? new Date())} onChange={(e) => e.target.value && setR({ ...r, date: fromLocalInput(e.target.value) })} />
      <FormActions onCancel={onDone} label={r.id ? "Save changes" : "Log meal"} />
    </form>
  );
}

export default function Meals() {
  const { data } = useStore();
  const water = data.meals.filter((m) => isSameDay(m.date, new Date())).reduce((a, m) => a + (m.waterGlasses ?? 0), 0);
  return (
    <RecordPage
      title="Meals" noun="meal" collection="meals" icon={Utensils}
      dateOf={(r) => r.date} blank={() => ({ date: new Date().toISOString(), mealType: guessMeal(), waterGlasses: 1 })} Form={MealForm as never}
      emptyText="Keep it light: what you ate, water, and anything you noticed."
      summary={<p className="card card-pad mb-4 flex items-center gap-3"><span className="icon-tile"><GlassWater size={20} aria-hidden /></span><span><span className="font-semibold">{water} glass{water === 1 ? "" : "es"} of water</span> logged today</span></p>}
      row={(r) => ({ side: <span className="icon-tile"><Utensils size={20} aria-hidden /></span>, title: `${r.mealType}: ${r.description}`, sub: `${relativeDay(r.date)}, ${formatTime(r.date)}${r.waterGlasses ? ` · ${r.waterGlasses} glass${r.waterGlasses === 1 ? "" : "es"} of water` : ""}`, body: r.symptoms ? <p className="text-sm text-ink mt-1">Noticed: {r.symptoms}</p> : undefined })}
    />
  );
}
