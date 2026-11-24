import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { BedDouble, Check, Lightbulb, LineChart, Lock, Pill, ShieldCheck, Stethoscope, Syringe } from "lucide-react";
import { useStore } from "@/app/AppStore";
import { BrandMark } from "@/components/Brand";
import { GOALS } from "@/data/models";
import { cx } from "@/lib/cx";

const GOAL_ICONS = { "Track Pain": LineChart, "Share with Doctor": Stethoscope, "Manage Meds": Pill, "Understand Triggers": Lightbulb, Injection: Syringe, "Monitor Sleep": BedDouble } as const;

function Check2({ id, checked, onChange, children, required }: { id: string; checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={id} className={cx("flex gap-3 items-start rounded-md border p-4 cursor-pointer transition-colors", checked ? "border-primary bg-accent-wash" : "border-line-strong bg-surface-raised")}>
      <input id={id} type="checkbox" className="mt-0.5 w-6 h-6 accent-[rgb(var(--primary))] shrink-0" checked={checked} onChange={(e) => onChange(e.target.checked)} required={required} />
      <span className="text-[0.95rem] text-ink">{children}</span>
    </label>
  );
}

export default function Onboarding() {
  const { completeOnboarding } = useStore();
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [goals, setGoals] = useState<string[]>(["Track Pain"]);
  const [c, setC] = useState({ demoAcknowledged: false, storageOnDevice: false, notMedicalAdvice: false, voiceDictation: false });
  const [withDemo, setWithDemo] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => { document.title = step === 1 ? "Welcome · Bay State Pain Tracker" : "Privacy & consent · Bay State Pain Tracker"; if (step === 2) heading.current?.focus(); }, [step]);

  const required = c.demoAcknowledged && c.storageOnDevice && c.notMedicalAdvice;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!required) { setErr("Please confirm the three statements above to continue."); return; }
    setBusy(true);
    try {
      await completeOnboarding({ name: name.trim(), goals, consent: c, withDemo });
      nav("/", { replace: true });
      window.scrollTo(0, 0);
    } catch {
      setErr("Setup could not be saved on this device. Check that browser storage is allowed and try again.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-navy pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-center h-[120px]"><BrandMark size={60} /></div>
      </header>
      <main id="main" className="max-w-xl mx-auto px-5 pb-12">
        {step === 1 ? (
          <form onSubmit={(e) => { e.preventDefault(); setStep(2); window.scrollTo(0, 0); }}>
            <h1 className="text-[1.9rem] md:text-4xl font-bold text-center mt-8">Welcome to Bay State Pain Tracker</h1>
            <p className="text-center text-ink-muted text-lg mt-3">Your companion for understanding and managing your pain journey</p>

            <label htmlFor="name" className="block text-lg font-bold text-navy mt-10 mb-3">What should we call you?</label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" placeholder="First name or nickname" maxLength={40} />

            <fieldset className="mt-9">
              <legend className="text-lg font-bold text-navy">What are your main goals?</legend>
              <p className="text-ink-muted mt-1 mb-4">Select all that apply to customize your app.</p>
              <div className="grid grid-cols-2 gap-3">
                {GOALS.map((g) => {
                  const I = GOAL_ICONS[g];
                  const on = goals.includes(g);
                  return (
                    <button key={g} type="button" aria-pressed={on} onClick={() => setGoals(on ? goals.filter((x) => x !== g) : [...goals, g])}
                      className={cx("relative flex flex-col items-center justify-center gap-3 rounded-md border-2 min-h-[120px] p-3 text-center font-semibold transition-colors", on ? "border-primary bg-accent-wash text-navy" : "border-line bg-surface-raised text-ink hover:border-line-strong")}>
                      {on && <Check size={18} className="absolute top-2 right-2 text-primary" aria-hidden />}
                      <span className="icon-tile w-12 h-12 rounded-sm"><I size={24} aria-hidden /></span>
                      {g}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <p className="flex items-center justify-center gap-2 text-ink-muted mt-8"><Lock size={16} aria-hidden /> Your entries stay on this device</p>
            <button type="submit" className="btn-primary btn-lg w-full mt-4">Get Started</button>
          </form>
        ) : (
          <form onSubmit={submit} noValidate>
            <h1 ref={heading} tabIndex={-1} className="text-3xl font-bold mt-8 outline-none flex items-center gap-3"><ShieldCheck className="text-primary" size={30} aria-hidden /> Privacy &amp; consent</h1>
            <p className="text-ink-muted mt-3">Before you start, here is exactly how Pain Tracker handles your information.</p>
            <ul className="mt-5 space-y-2 text-[0.95rem] list-disc pl-5 text-ink">
              <li>This is a <strong>demonstration</strong> for Bay State Pain Associates. It is not connected to the clinic or your medical record.</li>
              <li>Everything you enter is stored <strong>only in this browser on this device</strong>. It is not encrypted, so anyone using this device and browser could see it.</li>
              <li>Nothing is sent to Pain Tracker, the clinic or any analytics service. You can export or delete everything at any time in Settings.</li>
              <li>Pain Tracker records what you report. It doesn't diagnose, and it never suggests changing your medication. <strong>In an emergency, call 911.</strong></li>
            </ul>
            <div className="mt-6 space-y-3">
              <Check2 id="c1" checked={c.demoAcknowledged} onChange={(v) => setC({ ...c, demoAcknowledged: v })} required>I understand this is a demo and I should not enter real health information.</Check2>
              <Check2 id="c2" checked={c.storageOnDevice} onChange={(v) => setC({ ...c, storageOnDevice: v })} required>I agree that my entries are stored on this device only.</Check2>
              <Check2 id="c3" checked={c.notMedicalAdvice} onChange={(v) => setC({ ...c, notMedicalAdvice: v })} required>I understand Pain Tracker does not provide medical advice.</Check2>
            </div>
            <h2 className="text-lg font-bold mt-8">Optional</h2>
            <div className="mt-3">
              <Check2 id="c4" checked={c.voiceDictation} onChange={(v) => setC({ ...c, voiceDictation: v })}>
                Turn on voice-to-text for notes. <span className="text-ink-muted">Your browser's speech service may process the audio on its servers (for example, Google in Chrome). You can change this later.</span>
              </Check2>
            </div>
            <fieldset className="mt-8">
              <legend className="text-lg font-bold text-navy mb-3">How would you like to start?</legend>
              <div className="grid gap-3">
                {[{ v: true, t: "Explore with demo data", d: "Fictional records for “Sarah” so every screen has something to show. Recommended." }, { v: false, t: "Start empty", d: "No records. Begin logging your own (fictional) entries." }].map((o) => (
                  <label key={String(o.v)} className={cx("flex gap-3 rounded-md border-2 p-4 cursor-pointer", withDemo === o.v ? "border-primary bg-accent-wash" : "border-line bg-surface-raised")}>
                    <input type="radio" name="start" className="mt-1 w-5 h-5 accent-[rgb(var(--primary))]" checked={withDemo === o.v} onChange={() => setWithDemo(o.v)} />
                    <span><span className="block font-semibold">{o.t}</span><span className="block text-sm text-ink-muted">{o.d}</span></span>
                  </label>
                ))}
              </div>
            </fieldset>
            {err && <p role="alert" className="mt-5 rounded-md bg-danger-soft text-danger-ink p-3 font-medium">{err}</p>}
            <div className="flex flex-col-reverse sm:flex-row gap-3 mt-8">
              <button type="button" className="btn-ghost" onClick={() => setStep(1)}>Back</button>
              <button type="submit" className="btn-primary btn-lg flex-1" disabled={busy}>{busy ? "Setting up…" : "Agree and continue"}</button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
