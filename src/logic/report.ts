import type { PatientData, Profile } from "@/data/models";
import { regionLabel } from "@/features/pain/bodyRegions";
import { adherence, dailySeries, inRange, locationCounts, mean, round1, triggerCounts } from "./insights";
import { DAY, formatDateYear, formatTime, startOfDay } from "@/lib/dates";

export const REPORT_SECTIONS = [
  { id: "summary", label: "Pain summary and trend chart" },
  { id: "pain", label: "Pain log entries" },
  { id: "medications", label: "Medications and dose records" },
  { id: "treatments", label: "Therapeutic injections" },
  { id: "exercise", label: "Exercise sessions" },
  { id: "meals", label: "Meals and hydration" },
  { id: "observations", label: "My notes and observations" },
] as const;
export type SectionId = (typeof REPORT_SECTIONS)[number]["id"];

export interface ReportOptions {
  from: Date;
  to: Date; // exclusive
  sections: SectionId[];
  questions?: string;
}

/** Pure selection of what goes into the report (also used for the on-screen preview and tests). */
export function buildReport(data: PatientData, opts: ReportOptions) {
  const pain = inRange(data.pain, (p) => p.timestamp, opts.from, opts.to).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const doses = inRange(data.doses, (d) => d.scheduledFor ?? d.recordedAt, opts.from, opts.to);
  const vals = pain.map((p) => p.intensity);
  const days = Math.max(1, Math.round((opts.to.getTime() - opts.from.getTime()) / DAY));
  return {
    pain,
    doses,
    injections: inRange(data.injections, (i) => i.date, opts.from, opts.to),
    exercise: inRange(data.exercise, (e) => e.date, opts.from, opts.to),
    meals: inRange(data.meals, (m) => m.date, opts.from, opts.to),
    summary: {
      count: pain.length,
      avg: round1(mean(vals)),
      min: vals.length ? Math.min(...vals) : null,
      max: vals.length ? Math.max(...vals) : null,
      daysLogged: new Set(pain.map((p) => startOfDay(p.timestamp).getTime())).size,
      days,
      locations: locationCounts(pain).slice(0, 5).map((l) => `${regionLabel(l.id)} (${l.count})`),
      triggers: triggerCounts(pain).slice(0, 5).map((t) => `${t.label} (${t.count})`),
      adherence: adherence(doses),
    },
    series: dailySeries(pain, days, new Date(opts.to.getTime() - 1)),
    observations: [
      ...pain.filter((p) => p.notes).map((p) => ({ when: p.timestamp, text: p.notes!, source: `Pain log (${p.intensity}/10)` })),
      ...doses.filter((d) => d.sideEffects).map((d) => ({ when: d.recordedAt, text: d.sideEffects!, source: `Side effect: ${data.medications.find((m) => m.id === d.medicationId)?.name ?? "medication"}` })),
      ...inRange(data.meals, (m) => m.date, opts.from, opts.to).filter((m) => m.symptoms).map((m) => ({ when: m.date, text: m.symptoms!, source: `After ${m.mealType.toLowerCase()}` })),
    ].sort((a, b) => a.when.localeCompare(b.when)),
  };
}

const NAVY: [number, number, number] = [15, 69, 106];
const PRIMARY: [number, number, number] = [20, 98, 151];
const MUTED: [number, number, number] = [75, 90, 107];

/** Generates the PDF entirely in the browser. Nothing is uploaded. */
export async function generateReportPdf(data: PatientData, profile: Profile | null, opts: ReportOptions): Promise<Blob> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const r = buildReport(data, opts);
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  let y = 0;
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const ensure = (h: number) => { if (y + h > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = M; } };
  const heading = (t: string) => { ensure(60); y += 26; doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(...NAVY).text(t, M, y); y += 8; };
  const table = (head: string[], body: Array<Array<string | number>>) => {
    autoTable(doc, { startY: y + 4, head: [head], body, margin: { left: M, right: M }, styles: { fontSize: 9, cellPadding: 4, textColor: [16, 38, 59] }, headStyles: { fillColor: PRIMARY, textColor: 255 }, alternateRowStyles: { fillColor: [247, 249, 250] } });
    y = lastY();
  };
  const para = (t: string, size = 10, color = MUTED) => { doc.setFont("helvetica", "normal").setFontSize(size).setTextColor(...color); const lines = doc.splitTextToSize(t, W - 2 * M); ensure(lines.length * size * 1.3); doc.text(lines, M, y + size); y += lines.length * size * 1.3 + 2; };

  // Header band
  doc.setFillColor(...NAVY).rect(0, 0, W, 86, "F");
  doc.setTextColor(255).setFont("helvetica", "bold").setFontSize(20).text("Bay State Pain Tracker · patient report", M, 40);
  doc.setFont("helvetica", "normal").setFontSize(10).text("Patient-reported information to discuss with your care team · Bay State Pain Associates", M, 60);
  y = 112;
  const toIncl = new Date(opts.to.getTime() - 1);
  para(`Patient: ${profile?.displayName ?? "—"}    Period: ${formatDateYear(opts.from)} – ${formatDateYear(toIncl)}    Generated: ${formatDateYear(new Date())} ${formatTime(new Date())}`, 10, [16, 38, 59]);
  para("This report contains information entered by the patient in the Bay State Pain Tracker demo app. It is not a medical record, diagnosis or treatment recommendation. Patterns shown are descriptive and do not establish causes.", 9);

  const s = opts.sections;
  if (s.includes("summary")) {
    heading("Pain summary");
    table(["Measure", "Value"], [
      ["Logs recorded", `${r.summary.count} on ${r.summary.daysLogged} of ${r.summary.days} days`],
      ["Average reported pain (0–10)", r.summary.avg ?? "—"],
      ["Lowest / highest", r.summary.min == null ? "—" : `${r.summary.min} / ${r.summary.max}`],
      ["Most reported locations", r.summary.locations.join(", ") || "—"],
      ["Possible triggers noted", r.summary.triggers.join(", ") || "—"],
    ]);
    // Trend chart
    const pts = r.series;
    if (pts.some((p) => p.avg != null)) {
      ensure(170);
      y += 18;
      doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...NAVY).text("Daily average reported pain", M, y);
      const cx = M + 18, cy = y + 12, cw = W - 2 * M - 24, ch = 120;
      doc.setDrawColor(224, 231, 235).setLineWidth(0.5);
      for (const t of [0, 5, 10]) { const ty = cy + ch - (t / 10) * ch; doc.line(cx, ty, cx + cw, ty); doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...MUTED).text(String(t), cx - 12, ty + 2); }
      doc.setDrawColor(...PRIMARY).setLineWidth(1.6);
      let prev: [number, number] | null = null;
      pts.forEach((p, i) => {
        const px = cx + (pts.length <= 1 ? cw / 2 : (i / (pts.length - 1)) * cw);
        if (p.avg == null) { prev = null; return; }
        const py = cy + ch - (p.avg / 10) * ch;
        if (prev) doc.line(prev[0], prev[1], px, py);
        doc.setFillColor(...PRIMARY).circle(px, py, 1.6, "F");
        prev = [px, py];
      });
      doc.setFontSize(7).setTextColor(...MUTED).text(formatDateYear(pts[0].date), cx, cy + ch + 12).text(formatDateYear(pts[pts.length - 1].date), cx + cw, cy + ch + 12, { align: "right" });
      y = cy + ch + 18;
    }
  }
  if (s.includes("pain")) {
    heading(`Pain log entries (${r.pain.length})`);
    r.pain.length ? table(["Date", "Pain", "Location", "Character / duration", "Triggers", "Sleep / activity impact"], r.pain.map((p) => [`${formatDateYear(p.timestamp)} ${formatTime(p.timestamp)}`, p.intensity, p.locations.map(regionLabel).join(", ") || "—", [p.characteristics.join(", "), p.duration].filter(Boolean).join(" · ") || "—", p.triggers.join(", ") || "—", `${p.sleepImpact ?? "—"} / ${p.activityImpact ?? "—"}`])) : para("No pain logs in this period.");
  }
  if (s.includes("medications")) {
    heading("Medications (as entered by the patient)");
    data.medications.length ? table(["Medication", "Prescribed dosage", "Schedule", "Status"], data.medications.map((m) => [m.name, m.dosage, m.frequency === "As needed" ? "As needed" : `${m.frequency}: ${m.times.join(", ")}`, m.active ? "Taking" : "Stopped"])) : para("No medications entered.");
    const a = r.summary.adherence;
    para(`Dose records in period: ${a.taken} taken, ${a.skipped} skipped, ${a.missed} missed (recorded doses only).`, 9);
    const byMed = data.medications.map((m) => { const d = r.doses.filter((x) => x.medicationId === m.id); const c = adherence(d); return [m.name, c.taken, c.skipped, c.missed]; }).filter((row) => Number(row[1]) + Number(row[2]) + Number(row[3]) > 0);
    if (byMed.length) table(["Medication", "Taken", "Skipped", "Missed"], byMed);
  }
  if (s.includes("treatments")) {
    heading("Therapeutic injections");
    r.injections.length ? table(["Date", "Type", "Location", "Provider", "Pain before → after", "Patient-rated effect", "Notes"], r.injections.map((i) => [formatDateYear(i.date), i.type, i.location, i.provider, `${i.painBefore ?? "—"} → ${i.painAfter ?? "—"}`, i.effectiveness ?? "—", i.notes ?? ""])) : para("No injections recorded in this period.");
  }
  if (s.includes("exercise")) {
    heading("Exercise sessions");
    r.exercise.length ? table(["Date", "Type", "Minutes", "Pain before → after", "Difficulty"], r.exercise.map((e) => [formatDateYear(e.date), e.type, e.durationMin, `${e.painBefore ?? "—"} → ${e.painAfter ?? "—"}`, e.difficulty ?? "—"])) : para("No exercise logged in this period.");
  }
  if (s.includes("meals")) {
    heading("Meals and hydration");
    r.meals.length ? table(["Date", "Meal", "Description", "Water (glasses)", "Symptoms noted"], r.meals.map((m) => [`${formatDateYear(m.date)} ${formatTime(m.date)}`, m.mealType, m.description, m.waterGlasses ?? "—", m.symptoms ?? ""])) : para("No meals logged in this period.");
  }
  if (s.includes("observations")) {
    heading("My notes and observations");
    r.observations.length ? table(["Date", "Context", "Note"], r.observations.map((o) => [formatDateYear(o.when), o.source, o.text])) : para("No notes in this period.");
  }
  if (opts.questions?.trim()) {
    heading("Questions for my appointment");
    para(opts.questions.trim(), 10, [16, 38, 59]);
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...MUTED).text(`Pain Tracker · patient-reported · page ${i} of ${pages}`, M, doc.internal.pageSize.getHeight() - 28);
  }
  return doc.output("blob");
}
