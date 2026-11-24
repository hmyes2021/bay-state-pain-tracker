import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CalendarDays, ChevronRight, Database, Download, Dumbbell, FileJson, FileText, Mic, Pill, RotateCcw, Share, ShieldCheck, Smartphone, Syringe, Trash2, UserRound, Utensils, Activity } from "lucide-react";
import { Page } from "@/app/AppShell";
import { useStore } from "@/app/AppStore";
import { useToast } from "@/components/Toast";
import { Card, ConfirmDialog, Dialog, Switch, TextField } from "@/components/ui";
import { useInstall } from "@/hooks/useInstall";
import { notificationPermission, requestNotifications } from "@/hooks/useReminderRunner";
import { speechSupported } from "@/hooks/useSpeech";
import { loggingStreak } from "@/logic/insights";
import { dayKey, formatDateYear } from "@/lib/dates";

export default function Settings() {
  const { data, profile, consent, settings, updateProfile, updateSettings, updateConsent, resetDemo, deleteAll, exportJSON, adapterKind } = useStore();
  const toast = useToast();
  const { state: installState, install } = useInstall();
  const [nameOpen, setNameOpen] = useState(false);
  const [name, setName] = useState(profile?.displayName ?? "");
  const [confirm, setConfirm] = useState<"reset" | "delete" | null>(null);
  const [perm, setPerm] = useState(notificationPermission());
  const [voiceInfo, setVoiceInfo] = useState(false);
  const records = data.pain.length + data.doses.length + data.injections.length + data.exercise.length + data.meals.length;

  const exportData = () => {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Pain-Tracker-data-${dayKey(new Date())}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    toast.show("Your data was exported");
  };

  const row = (to: string, label: string, Icon: typeof Pill, sub?: string) => (
    <li key={to}>
      <Link to={to} className="flex items-center gap-3 min-h-[56px] px-1 hover:bg-surface rounded-sm">
        <Icon size={20} className="text-primary" aria-hidden />
        <span className="flex-1"><span className="block text-ink">{label}</span>{sub && <span className="block text-xs text-ink-muted">{sub}</span>}</span>
        <ChevronRight size={18} className="text-ink-subtle" aria-hidden />
      </Link>
    </li>
  );

  return (
    <Page title="Settings" wide>
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
          {/* Profile card from the prototype */}
          <section className="card overflow-hidden" aria-labelledby="prof-h">
            <div className="flex flex-col items-center p-6">
              <span className="w-20 h-20 rounded-full flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg, rgb(var(--primary)), #7FC8C8)" }}><UserRound size={40} aria-hidden /></span>
              <h2 id="prof-h" className="text-xl font-bold text-ink mt-3">{profile?.displayName}</h2>
              <p className="text-ink-muted text-sm">Demo patient · on this device</p>
              <button type="button" className="btn-secondary mt-3 rounded-full" onClick={() => { setName(profile?.displayName ?? ""); setNameOpen(true); }}>Edit Profile</button>
            </div>
            <dl className="grid grid-cols-3 border-t border-line text-center py-4">
              <div><dd className="text-xl font-bold text-ink">{records}</dd><dt className="text-sm text-ink-muted">Records</dt></div>
              <div><dd className="text-xl font-bold text-ink">{loggingStreak(data.pain)}</dd><dt className="text-sm text-ink-muted">Day Streak</dt></div>
              <div><dd className="text-xl font-bold text-ink">{data.medications.filter((m) => m.active).length}</dd><dt className="text-sm text-ink-muted">Active meds</dt></div>
            </dl>
          </section>

          <Card title="Your records">
            <ul className="divide-y divide-line">
              {row("/history", "Pain history", Activity, `${data.pain.length} entries`)}
              {row("/medications", "Medications", Pill, `${data.medications.length} medications`)}
              {row("/treatments", "Therapeutic injections", Syringe, `${data.injections.length} recorded`)}
              {row("/exercise", "Exercise", Dumbbell, `${data.exercise.length} sessions`)}
              {row("/meals", "Meals", Utensils, `${data.meals.length} meals`)}
              {row("/appointments", "Appointments", CalendarDays, `${data.appointments.length} appointments`)}
              {row("/report", "Patient report (PDF)", FileText)}
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Notifications & input" icon={Bell}>
            <div className="space-y-2">
              <Switch label="Reminder notifications" icon={Bell} checked={perm === "granted" && settings.notificationsEnabled}
                description={perm === "denied" ? "Blocked in your browser's site settings. Reminders still appear inside the app." : perm === "unsupported" ? "Not supported in this browser. Reminders appear inside the app." : "System notifications for your reminders."}
                onChange={async (v) => {
                  if (!v) return updateSettings({ notificationsEnabled: false });
                  const p = perm === "granted" ? "granted" : await requestNotifications();
                  setPerm(p);
                  updateSettings({ notificationsEnabled: p === "granted" });
                  if (p !== "granted") toast.show("Notifications weren't allowed. Reminders will show inside the app.", { tone: "info" });
                }} />
              <Switch label="Voice-to-text for notes" icon={Mic} checked={settings.voiceInputEnabled}
                description={speechSupported() ? "Your browser's speech service may process audio off-device." : "Not supported in this browser — use your keyboard's dictation."}
                onChange={(v) => { if (v) setVoiceInfo(true); else { updateSettings({ voiceInputEnabled: false }); updateConsent({ voiceDictation: false }); } }} />
            </div>
          </Card>

          <Card title="Install Pain Tracker" icon={Smartphone}>
            {installState === "installed" && <p className="text-ink">Pain Tracker is installed on this device. Open it from your home screen or app list.</p>}
            {installState === "available" && (<><p className="text-ink-muted mb-3">Add Pain Tracker to your home screen for quick, full-screen access that works offline.</p><button type="button" className="btn-primary" onClick={async () => { const o = await install(); if (o === "accepted") toast.show("Pain Tracker installed"); }}><Download size={18} aria-hidden /> Install app</button></>)}
            {installState === "ios" && <ol className="list-decimal pl-5 space-y-1 text-ink"><li>Open Pain Tracker in Safari.</li><li>Tap <Share size={16} className="inline -mt-1" role="img" aria-label="Share icon" /> Share.</li><li>Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li></ol>}
            {installState === "unsupported" && <p className="text-ink-muted">Your browser hasn't offered installation yet. In Chrome or Edge, use the install icon in the address bar or the menu's “Install app”. On Android, use the menu's “Add to Home screen”.</p>}
          </Card>

          <Card title="Privacy & data" icon={ShieldCheck}>
            <ul className="text-[0.95rem] space-y-1.5 text-ink list-disc pl-5">
              <li>Demo mode: fictional data, stored only in this browser ({adapterKind === "local" ? "on-device storage" : "secure backend"}).</li>
              <li>Not encrypted on this device and not connected to Bay State Pain Associates.</li>
              <li>No analytics, advertising or third-party data sharing.</li>
              {consent && <li>Consent given {formatDateYear(consent.acceptedAt)} (version {consent.version}). Voice dictation: {consent.voiceDictation ? "allowed" : "off"}.</li>}
            </ul>
            <div className="grid gap-2 mt-4">
              <button type="button" className="btn-secondary justify-start" onClick={exportData}><FileJson size={18} aria-hidden /> Export all my data (JSON)</button>
              <button type="button" className="btn-secondary justify-start" onClick={() => setConfirm("reset")}><RotateCcw size={18} aria-hidden /> Reset demo data</button>
              <button type="button" className="btn-danger justify-start" onClick={() => setConfirm("delete")}><Trash2 size={18} aria-hidden /> Delete all data and consent</button>
            </div>
          </Card>

          <Card title="About" icon={Database}>
            <p className="text-sm text-ink-muted">Bay State Pain Tracker 1.0, a working demo for Bay State Pain Associates, evolved from the PainTrack prototype. It records what you report; it doesn't diagnose or give medical advice and never suggests medication changes. <strong className="text-ink">If you have a medical emergency, call 911.</strong></p>
          </Card>
        </div>
      </div>

      <Dialog open={nameOpen} onClose={() => setNameOpen(false)} title="Edit profile">
        <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) { updateProfile({ displayName: name.trim() }); toast.show("Profile updated"); setNameOpen(false); } }}>
          <TextField label="What should we call you?" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus />
          <div className="flex justify-end gap-2 mt-4"><button type="button" className="btn-ghost" onClick={() => setNameOpen(false)}>Cancel</button><button className="btn-primary">Save</button></div>
        </form>
      </Dialog>
      <Dialog open={voiceInfo} onClose={() => setVoiceInfo(false)} title="Turn on voice-to-text?" description="Dictation uses your browser's built-in speech recognition. Some browsers, such as Chrome, send the audio to the browser maker's servers to convert it to text. Pain Tracker itself never sends or stores audio.">
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setVoiceInfo(false)}>Keep off</button><button type="button" className="btn-primary" onClick={() => { updateSettings({ voiceInputEnabled: true }); updateConsent({ voiceDictation: true }); setVoiceInfo(false); }}>Turn on</button></div>
      </Dialog>
      <ConfirmDialog open={confirm === "reset"} onClose={() => setConfirm(null)} tone="primary" confirmLabel="Reset" title="Reset demo data?" description="All entries are replaced with fresh fictional demo records. Your profile and consent stay." onConfirm={async () => { await resetDemo(); toast.show("Demo data reset"); }} />
      <ConfirmDialog open={confirm === "delete"} onClose={() => setConfirm(null)} confirmLabel="Delete everything" title="Delete all Pain Tracker data?" description="This permanently removes every entry, reminder, your profile and consent from this device. Export first if you want a copy. This can't be undone." onConfirm={async () => { await deleteAll(); }} />
    </Page>
  );
}
