import { useMemo, useState } from "react";
import { Download, FileText, Loader2, Share2 } from "lucide-react";
import { Page } from "@/app/AppShell";
import { useStore } from "@/app/AppStore";
import { useToast } from "@/components/Toast";
import { Card, Segmented, TextArea, TextField } from "@/components/ui";
import { REPORT_SECTIONS, buildReport, generateReportPdf, type SectionId } from "@/logic/report";
import { addDays, dayKey, startOfDay } from "@/lib/dates";
import { can } from "@/auth/permissions";

const RANGES = [{ value: "14", label: "2 weeks" }, { value: "30", label: "30 days" }, { value: "90", label: "90 days" }, { value: "custom", label: "Custom" }] as const;

export default function Report() {
  const { data, profile } = useStore();
  const toast = useToast();
  const [range, setRange] = useState<(typeof RANGES)[number]["value"]>("30");
  const [cFrom, setCFrom] = useState(dayKey(addDays(new Date(), -30)));
  const [cTo, setCTo] = useState(dayKey(new Date()));
  const [sections, setSections] = useState<SectionId[]>(["summary", "pain", "medications", "treatments", "exercise", "observations"]);
  const [questions, setQuestions] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { from, to } = useMemo(() => {
    const end = addDays(startOfDay(new Date()), 1);
    if (range !== "custom") return { from: addDays(end, -Number(range)), to: end };
    return { from: startOfDay(`${cFrom}T00:00`), to: addDays(startOfDay(`${cTo}T00:00`), 1) };
  }, [range, cFrom, cTo]);
  const valid = from < to;
  const preview = useMemo(() => (valid ? buildReport(data, { from, to, sections }) : null), [data, from, to, sections, valid]);
  const fileName = `Pain-Tracker-report-${dayKey(new Date())}.pdf`;
  const allowed = can(profile?.role ?? "patient", "export");

  const generate = async () => {
    if (!valid || !sections.length) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await generateReportPdf(data, profile, { from, to, sections, questions });
      setLastBlob(blob);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast.show("Report downloaded");
    } catch {
      setError("The PDF couldn't be created. Please try again; if you're offline, open the app online once so the report tool is saved for offline use.");
    } finally {
      setBusy(false);
    }
  };

  const file = lastBlob ? new File([lastBlob], fileName, { type: "application/pdf" }) : null;
  const canShare = file && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });

  return (
    <Page title="Patient report" back="/" wide>
      <p className="text-ink-muted mb-5 max-w-reading">Create a PDF of the records you choose to bring to your next appointment. It's generated on this device and nothing is uploaded — you decide who to share it with.</p>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-4">
          <Card title="Time period" icon={FileText}>
            <Segmented label="Report time period" value={range} onChange={setRange} options={RANGES} />
            {range === "custom" && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                <TextField label="From" type="date" value={cFrom} max={cTo} onChange={(e) => setCFrom(e.target.value)} />
                <TextField label="To" type="date" value={cTo} min={cFrom} max={dayKey(new Date())} onChange={(e) => setCTo(e.target.value)} error={!valid ? "End date must be after the start date" : undefined} />
              </div>
            )}
          </Card>
          <Card title="Include">
            <fieldset>
              <legend className="sr-only">Sections to include</legend>
              <ul className="space-y-1">
                {REPORT_SECTIONS.map((s) => (
                  <li key={s.id}>
                    <label className="flex items-center gap-3 min-h-[48px] rounded-sm px-2 -mx-2 hover:bg-surface cursor-pointer">
                      <input type="checkbox" className="w-5 h-5 accent-[rgb(var(--primary))]" checked={sections.includes(s.id)} onChange={(e) => setSections(e.target.checked ? [...sections, s.id] : sections.filter((x) => x !== s.id))} />
                      <span>{s.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          </Card>
          <Card title="Questions for my appointment">
            <TextArea label="Questions or topics to raise" optional value={questions} onChange={(e) => setQuestions(e.target.value)} placeholder="e.g. Is the drowsiness from gabapentin expected?" />
          </Card>
        </div>

        <section className="card card-pad lg:sticky lg:top-8" aria-labelledby="prev-h">
          <h2 id="prev-h" className="section-title mb-3">Preview</h2>
          {preview && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div><dt className="text-ink-muted">Pain logs</dt><dd className="text-lg font-semibold">{preview.summary.count}</dd></div>
              <div><dt className="text-ink-muted">Average pain</dt><dd className="text-lg font-semibold">{preview.summary.avg ?? "–"}</dd></div>
              <div><dt className="text-ink-muted">Dose records</dt><dd className="text-lg font-semibold">{preview.doses.length}</dd></div>
              <div><dt className="text-ink-muted">Injections</dt><dd className="text-lg font-semibold">{preview.injections.length}</dd></div>
              <div><dt className="text-ink-muted">Exercise sessions</dt><dd className="text-lg font-semibold">{preview.exercise.length}</dd></div>
              <div><dt className="text-ink-muted">Notes</dt><dd className="text-lg font-semibold">{preview.observations.length}</dd></div>
            </dl>
          )}
          <p className="text-sm text-ink-muted mt-4">{sections.length} section{sections.length === 1 ? "" : "s"} selected. The report is labelled as patient-reported, not a medical record.</p>
          {error && <p role="alert" className="mt-3 rounded-sm bg-danger-soft text-danger-ink p-3 text-sm font-medium">{error}</p>}
          {!allowed && <p role="alert" className="mt-3 text-sm text-danger-ink">Your role can't export reports.</p>}
          <button type="button" className="btn-primary btn-lg w-full mt-4" onClick={generate} disabled={busy || !valid || !sections.length || !allowed} aria-busy={busy}>
            {busy ? <><Loader2 size={20} className="animate-spin" aria-hidden /> Creating PDF…</> : <><Download size={20} aria-hidden /> Download PDF</>}
          </button>
          {canShare && <button type="button" className="btn-secondary w-full mt-2" onClick={() => navigator.share({ files: [file!], title: "Pain Tracker report" }).catch(() => {})}><Share2 size={18} aria-hidden /> Share…</button>}
        </section>
      </div>
    </Page>
  );
}
