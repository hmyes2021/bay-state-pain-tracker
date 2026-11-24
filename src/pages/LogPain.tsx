import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, BedDouble, Check, Clock, Flame, Hourglass, MapPin, Mic, MicOff, NotebookPen, Pencil, Ruler, Footprints, Sparkles, Trash2 } from "lucide-react";
import { HeaderSave, Page } from "@/app/AppShell";
import { useStore } from "@/app/AppStore";
import { useToast } from "@/components/Toast";
import { ChipGroup, Collapsible, ConfirmDialog, Dialog, EmptyState, TextArea } from "@/components/ui";
import { BodyMap } from "@/features/pain/BodyMap";
import { PainScale } from "@/features/pain/PainScale";
import { COMMON_TRIGGERS, IMPACT_LEVELS, PAIN_CHARACTERISTICS, PAIN_DURATIONS, type ImpactLevel, type PainDraft, type PainEntry } from "@/data/models";
import { prefs } from "@/storage";
import { useSpeech } from "@/hooks/useSpeech";
import { fromLocalInput, formatTime, toLocalInput } from "@/lib/dates";
import { cx } from "@/lib/cx";

type Values = Omit<PainEntry, "id" | "createdAt" | "updatedAt">;
const blank = (): Values => ({ timestamp: new Date().toISOString(), intensity: undefined as unknown as number, locations: [], characteristics: [], triggers: [], notes: "" });

export default function LogPain() {
  const { id } = useParams();
  const { data, save, remove, settings } = useStore();
  const toast = useToast();
  const nav = useNavigate();
  const existing = id ? data.pain.find((p) => p.id === id) : undefined;
  const initial = useMemo<Values>(() => (existing ? { ...existing } : blank()), [existing]);
  const [v, setV] = useState<Values>(initial);
  const [touched, setTouched] = useState(false);
  const [err, setErr] = useState<string | undefined>();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveChoice, setLeaveChoice] = useState<"save" | "draft">("save");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [customTrigger, setCustomTrigger] = useState("");
  const [draft, setDraft] = useState<PainDraft | null>(() => (id ? null : prefs.get<PainDraft | null>("pain-draft", null)));
  const scaleRef = useRef<HTMLDivElement>(null);
  const speech = useSpeech((text) => setV((cur) => ({ ...cur, notes: cur.notes ? `${cur.notes} ${text}` : text })));

  useEffect(() => { setV(initial); setTouched(false); }, [initial]);

  const set = <K extends keyof Values>(k: K, val: Values[K]) => { setV((cur) => ({ ...cur, [k]: val })); setTouched(true); if (k === "intensity") setErr(undefined); };

  if (id && !existing) {
    return <Page title="Entry not found" back="/history"><EmptyState icon={AlertCircle} title="This entry no longer exists" action={<button className="btn-primary" onClick={() => nav("/history")}>Back to history</button>}>It may have been deleted on this device.</EmptyState></Page>;
  }

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (v.intensity == null) {
      setErr("Choose a number from 0 to 10 — it's the only thing needed to save.");
      scaleRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      scaleRef.current?.querySelector<HTMLButtonElement>('[role="radio"]')?.focus();
      return false;
    }
    const rec: Values & { id?: string; createdAt?: string } = { ...v, notes: v.notes?.trim() || undefined, id: existing?.id, createdAt: existing?.createdAt };
    try {
      await save("pain", rec);
    } catch {
      return false;
    }
    if (!existing) prefs.remove("pain-draft");
    toast.show(existing ? "Entry updated" : `Pain ${v.intensity} saved`);
    nav(existing ? "/history" : "/", { replace: true });
    return true;
  };

  const close = () => (touched ? setLeaveOpen(true) : nav(-1));
  const saveDraft = () => {
    prefs.set("pain-draft", { savedAt: new Date().toISOString(), values: v } satisfies PainDraft);
    toast.show("Draft saved. Open Add Log to continue.", { tone: "info" });
    nav("/", { replace: true });
  };
  const discard = () => { if (!existing) prefs.remove("pain-draft"); setLeaveOpen(false); nav(-1); };

  const detailCount = [v.characteristics.length, v.duration, v.triggers.length, v.sleepImpact, v.activityImpact, v.notes].filter(Boolean).length;

  return (
    <Page title={existing ? "Edit pain entry" : "Log Pain"} mobileTitle={existing ? "Edit Entry" : "Log Pain"} close={close} action={<HeaderSave form="pain-form" />} wide>
      {draft && (
        <div className="card card-pad mb-4 flex flex-wrap items-center gap-3 border-primary bg-accent-wash" role="region" aria-label="Unfinished draft">
          <Pencil className="text-primary" size={20} aria-hidden />
          <p className="flex-1 min-w-[12rem]">You have an unfinished draft from {formatTime(draft.savedAt)}.</p>
          <button type="button" className="btn-primary btn-sm" onClick={() => { setV({ ...blank(), ...draft.values } as Values); setTouched(true); setDraft(null); }}>Resume draft</button>
          <button type="button" className="btn-ghost btn-sm" onClick={() => { prefs.remove("pain-draft"); setDraft(null); }}>Discard</button>
        </div>
      )}
      <form id="pain-form" onSubmit={submit} noValidate className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
          <section className="card card-pad lg:col-start-2 lg:row-start-1" aria-labelledby="int-h" ref={scaleRef}>
            <h2 id="int-h" className="flex items-center gap-3 font-bold italic text-ink text-lg mb-2"><Ruler size={22} className="text-primary" aria-hidden /> Pain Intensity <span className="not-italic text-xs font-semibold text-danger-ink ml-auto">Required</span></h2>
            <PainScale value={v.intensity} onChange={(n) => set("intensity", n)} sub="Choose the number that fits best" error={err} />
          </section>

          <section className="card card-pad lg:col-start-1 lg:row-start-1 lg:row-span-3 lg:self-start lg:sticky lg:top-8" aria-labelledby="loc-h">
          <h2 id="loc-h" className="flex items-center gap-3 font-bold italic text-ink text-lg mb-3"><MapPin size={22} className="text-primary" aria-hidden /> Pain Location <span className="not-italic text-xs font-normal text-ink-muted ml-auto">Optional</span></h2>
          <BodyMap value={v.locations} onChange={(x) => set("locations", x)} />
        </section>

          <section className="card card-pad lg:col-start-2" aria-labelledby="time-h">
            <h2 id="time-h" className="flex items-center gap-3 font-bold italic text-ink mb-3"><Clock size={20} className="text-primary" aria-hidden /> Time &amp; Date</h2>
            <label htmlFor="ts" className="field-label">When did you feel this?</label>
            <input id="ts" type="datetime-local" className="input" value={toLocalInput(v.timestamp)} max={toLocalInput(new Date(Date.now() + 60_000))} onChange={(e) => e.target.value && set("timestamp", fromLocalInput(e.target.value))} />
          </section>

        <div className="grid gap-4 lg:col-start-2">
          <p className="text-sm text-ink-muted px-1 flex items-center gap-2"><Sparkles size={16} className="text-primary" aria-hidden /> Everything below is optional{detailCount ? ` · ${detailCount} added` : ""}.</p>

          <Collapsible title="Pain characteristics" icon={Flame} summary={v.characteristics.join(", ") || "How does it feel?"}>
            <ChipGroup label="How does the pain feel?" multiple options={PAIN_CHARACTERISTICS} value={v.characteristics} onChange={(x: string[]) => set("characteristics", x)} />
          </Collapsible>
          <Collapsible title="Duration" icon={Hourglass} summary={v.duration ?? "How long has it lasted?"}>
            <ChipGroup label="How long has it lasted?" options={PAIN_DURATIONS} value={v.duration} onChange={(x: string | undefined) => set("duration", x)} />
          </Collapsible>
          <Collapsible title="Triggers" icon={Flame} summary={v.triggers.join(", ") || "What might have triggered your pain?"}>
            <ChipGroup label="What might have triggered your pain?" multiple options={[...new Set([...COMMON_TRIGGERS, ...v.triggers])]} value={v.triggers} onChange={(x: string[]) => set("triggers", x)} />
            <div className="flex gap-2 mt-3">
              <label htmlFor="ctrig" className="sr-only">Add another trigger</label>
              <input id="ctrig" className="input" placeholder="Add another trigger" value={customTrigger} onChange={(e) => setCustomTrigger(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const t = customTrigger.trim(); if (t && !v.triggers.includes(t)) set("triggers", [...v.triggers, t]); setCustomTrigger(""); } }} />
              <button type="button" className="btn-secondary" onClick={() => { const t = customTrigger.trim(); if (t && !v.triggers.includes(t)) set("triggers", [...v.triggers, t]); setCustomTrigger(""); }}>Add</button>
            </div>
            <p className="field-hint">Possible triggers you notice. They're observations, not proven causes.</p>
          </Collapsible>
          <Collapsible title="Sleep impact" icon={BedDouble} summary={v.sleepImpact ? `${v.sleepImpact} effect on sleep` : "Did pain affect your sleep?"}>
            <ChipGroup label="How much did pain affect your sleep?" options={IMPACT_LEVELS} value={v.sleepImpact} onChange={(x: ImpactLevel | undefined) => set("sleepImpact", x)} />
          </Collapsible>
          <Collapsible title="Activity at time of pain" icon={Footprints} summary={v.activityImpact ? `${v.activityImpact} effect on daily activity` : "Did pain limit what you could do?"}>
            <ChipGroup label="How much did pain limit your daily activities?" options={IMPACT_LEVELS} value={v.activityImpact} onChange={(x: ImpactLevel | undefined) => set("activityImpact", x)} />
          </Collapsible>
          <Collapsible title="Notes" icon={NotebookPen} summary={v.notes ? v.notes : "Anything else to remember?"} defaultOpen={Boolean(existing?.notes)}>
            <TextArea label="Notes" optional value={v.notes ?? ""} onChange={(e) => set("notes", e.target.value)} placeholder="What were you doing? What helped?" rows={4}
              hint={settings.voiceInputEnabled ? (speech.listening ? "Listening… tap Stop when you're done." : undefined) : "Voice input is off. Turn it on in Settings, or use your keyboard's dictation."}>
              {settings.voiceInputEnabled && (
                <button type="button" onClick={speech.listening ? speech.stop : speech.start} className={cx("btn-sm btn mb-1.5", speech.listening ? "bg-danger-soft text-danger-ink" : "btn-ghost")} aria-pressed={speech.listening}>
                  {speech.listening ? <><MicOff size={16} aria-hidden /> Stop</> : <><Mic size={16} aria-hidden /> Dictate</>}
                </button>
              )}
            </TextArea>
            {speech.error && <p role="alert" className="text-sm text-danger-ink mt-2">{speech.error}</p>}
          </Collapsible>
        </div>



        <div className="lg:col-span-2 flex flex-col-reverse sm:flex-row gap-3 sm:justify-between pt-2">
          {existing ? <button type="button" className="btn-danger" onClick={() => setDeleteOpen(true)}><Trash2 size={18} aria-hidden /> Delete entry</button> : <span />}
          <button type="submit" className="btn-primary btn-lg sm:min-w-[14rem]"><Check size={20} aria-hidden /> {existing ? "Save changes" : "Save log"}</button>
        </div>
      </form>

      {/* Prototype "Save before closing?" dialog */}
      <Dialog open={leaveOpen} onClose={() => setLeaveOpen(false)} title="Save before closing?" description="You have unsaved information. What would you like to do?"
        icon={<span className="w-16 h-16 rounded-full bg-[#D1ECF8] flex items-center justify-center"><span className="w-9 h-9 rounded-full bg-danger text-white flex items-center justify-center"><AlertCircle size={22} aria-hidden /></span></span>}>
        <fieldset>
          <legend className="sr-only">Choose what to do with this entry</legend>
          {([
            { k: "save", t: existing ? "Save changes" : "Complete & Save", d: "Finish and add to your records", icon: Check },
            ...(!existing ? [{ k: "draft", t: "Save Draft", d: "Continue editing later", icon: Pencil }] : []),
          ] as const).map((o) => (
            <label key={o.k} className={cx("flex items-start gap-3 rounded-md border-2 p-4 mb-3 cursor-pointer", leaveChoice === o.k ? "border-primary bg-accent-wash" : "border-line")}>
              <input type="radio" name="leave" className="mt-1 w-5 h-5 accent-[rgb(var(--primary))]" checked={leaveChoice === o.k} onChange={() => setLeaveChoice(o.k as "save" | "draft")} />
              <span className="flex-1"><span className="block font-bold">{o.t}</span><span className="block text-ink-muted text-sm">{o.d}</span></span>
              <span className={cx("w-9 h-9 rounded-sm flex items-center justify-center", leaveChoice === o.k ? "bg-primary text-white" : "bg-accent-soft text-primary")}><o.icon size={18} aria-hidden /></span>
            </label>
          ))}
        </fieldset>
        <button type="button" className="btn-primary w-full" onClick={async () => { if (leaveChoice === "draft") saveDraft(); else { setLeaveOpen(false); await submit(); } }}>Continue</button>
        <button type="button" className="btn-danger w-full mt-3 justify-start" onClick={discard}><Trash2 size={18} aria-hidden /> <span className="flex-1 text-left">Discard</span></button>
        <button type="button" className="btn-ghost w-full mt-2 text-ink-muted" onClick={() => setLeaveOpen(false)}>Cancel</button>
        <p className="text-center text-sm italic text-ink-muted mt-2">Your progress will be lost if you discard</p>
      </Dialog>
      <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete this pain entry?" description="It will be removed from your history, insights and future reports. You can undo right after." onConfirm={async () => { await remove("pain", existing!.id, { undoLabel: "Pain entry deleted" }); nav("/history", { replace: true }); }} />
    </Page>
  );
}
