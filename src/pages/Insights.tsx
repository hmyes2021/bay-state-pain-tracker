import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, BedDouble, Dumbbell, FileText, Info, MapPin, Pill, Syringe, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Page } from "@/app/AppShell";
import { useStore } from "@/app/AppStore";
import { Card, EmptyState, Segmented, Stat } from "@/components/ui";
import { BarChart, ChartFigure, LineChart, RankBars, StackBar } from "@/components/charts";
import { regionLabel } from "@/features/pain/bodyRegions";
import { adherence, aroundInjection, dailySeries, exerciseMinutesByWeek, exerciseSummary, inRange, locationCounts, monthComparison, painBySleep, triggerCounts, weekComparison, weeklySeries, type Comparison } from "@/logic/insights";
import { useIsDesktop } from "@/hooks/useMedia";
import { addDays, formatDate, formatDateYear, formatWeekday, startOfDay } from "@/lib/dates";

const RANGES = [{ value: "7", label: "7 days" }, { value: "30", label: "30 days" }, { value: "90", label: "90 days" }] as const;
type RangeV = (typeof RANGES)[number]["value"];

function CompareCard({ title, c, curLabel, prevLabel }: { title: string; c: Comparison; curLabel: string; prevLabel: string }) {
  const Icon = c.change == null ? Minus : c.change < 0 ? TrendingDown : c.change > 0 ? TrendingUp : Minus;
  return (
    <div className="card card-pad">
      <h3 className="font-semibold text-ink">{title}</h3>
      <div className="grid grid-cols-2 gap-3 mt-2">
        <Stat label={curLabel} value={c.current ?? "–"} sub={`${c.currentCount} logs`} />
        <Stat label={prevLabel} value={c.previous ?? "–"} sub={`${c.previousCount} logs`} />
      </div>
      <p className="text-sm mt-3 flex items-center gap-1.5">
        <Icon size={16} className={c.change == null ? "text-ink-muted" : c.change <= 0 ? "text-success-ink" : "text-warning-ink"} aria-hidden />
        {c.change == null ? "Not enough logs to compare" : c.change === 0 ? "No change in average reported pain" : `Average reported pain ${Math.abs(c.change)} point${Math.abs(c.change) === 1 ? "" : "s"} ${c.change < 0 ? "lower" : "higher"}`}
      </p>
    </div>
  );
}

export default function Insights() {
  const { data } = useStore();
  const detailed = useIsDesktop();
  const [range, setRange] = useState<RangeV>("30");
  const days = Number(range);
  const now = new Date();
  const from = addDays(startOfDay(now), -days + 1);
  const to = addDays(startOfDay(now), 1);

  const pain = useMemo(() => inRange(data.pain, (p) => p.timestamp, from, to), [data.pain, range]); // eslint-disable-line react-hooks/exhaustive-deps
  const series = days <= 30 ? dailySeries(data.pain, days, now) : weeklySeries(data.pain, 13, now);
  const points = series.map((d) => ({ label: days <= 7 ? formatWeekday(d.date) : formatDate(d.date), a: d.avg, b: d.max }));
  const locs = locationCounts(pain).slice(0, detailed ? 8 : 5);
  const trig = triggerCounts(pain).slice(0, detailed ? 8 : 5);
  const sleep = painBySleep(pain);
  const doseRange = inRange(data.doses, (d) => d.scheduledFor ?? d.recordedAt, from, to);
  const adh = adherence(doseRange);
  const exRange = inRange(data.exercise, (e) => e.date, from, to);
  const ex = exerciseSummary(exRange);
  const exWeeks = exerciseMinutesByWeek(data.exercise, days <= 7 ? 4 : days <= 30 ? 5 : 13, now);
  const injections = [...data.injections].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Page title="Insights" wide>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <Segmented label="Insights time range" value={range} onChange={setRange} options={RANGES} />
        <Link to="/report" className="btn-secondary"><FileText size={18} aria-hidden /> Export report</Link>
      </div>
      <p className="text-sm text-ink-muted mb-5 flex gap-2 max-w-reading"><Info size={16} className="shrink-0 mt-0.5" aria-hidden /> These summaries describe what you logged. Patterns can be useful to discuss with your care team, but they don't show what causes your pain.</p>

      {data.pain.length === 0 ? (
        <div className="card"><EmptyState icon={Activity} title="Log a few entries to see insights" action={<Link to="/log" className="btn-primary">Log pain</Link>} /></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Pain trend" icon={Activity} className="lg:col-span-2">
            <ChartFigure title={`Average reported pain per ${days <= 30 ? "day" : "week"}, last ${days} days`} caption={`${days <= 30 ? "Daily" : "Weekly"} average${detailed ? " and peak" : ""} of ${pain.length} logs. Gaps are days without a log.`}
              table={{ head: [days <= 30 ? "Day" : "Week of", "Average", "Peak", "Logs"], rows: series.map((d) => [formatDate(d.date), d.avg ?? "–", d.max ?? "–", d.count]) }}>
              <LineChart points={points} detailed={detailed} height={detailed ? 240 : 190} />
            </ChartFigure>
          </Card>

          <CompareCard title="This week vs last week" c={weekComparison(data.pain, now)} curLabel="This week" prevLabel="Same days last week" />
          <CompareCard title="This month vs last month" c={monthComparison(data.pain, now)} curLabel="This month" prevLabel="Same days last month" />

          <Card title="Where it hurt" icon={MapPin}>
            {locs.length ? <RankBars items={locs.map((l) => ({ label: regionLabel(l.id), value: l.count }))} /> : <p className="text-ink-muted">No locations added in this range.</p>}
            <p className="text-sm text-ink-muted mt-3">Number of logs that included each area.</p>
          </Card>
          <Card title="Possible triggers you noted" icon={Activity}>
            {trig.length ? <RankBars items={trig.map((t) => ({ label: t.label, value: t.count }))} /> : <p className="text-ink-muted">No triggers added in this range.</p>}
            <p className="text-sm text-ink-muted mt-3">How often you tagged each one — not proof it caused the pain.</p>
          </Card>

          <Card title="Sleep and reported pain" icon={BedDouble}>
            <ChartFigure title="Average reported pain by how much pain affected sleep" caption="Average pain in logs grouped by the sleep impact you reported. Pain and sleep can affect each other, so this shows a pattern, not a cause."
              table={{ head: ["Sleep impact", "Average pain", "Logs"], rows: sleep.map((s) => [s.level, s.avg ?? "–", s.count]) }}>
              <BarChart max={10} height={170} bars={sleep.map((s) => ({ label: s.level, value: s.avg ?? 0, display: s.avg == null ? "–" : String(s.avg), color: s.avg == null ? "rgb(var(--line))" : `var(--pain-${Math.round(s.avg)})` }))} />
            </ChartFigure>
          </Card>

          <Card title="Medication records" icon={Pill}>
            {doseRange.length ? (
              <>
                <StackBar parts={[{ label: "Taken", value: adh.taken, color: "rgb(var(--success-ink))" }, { label: "Skipped", value: adh.skipped, color: "rgb(var(--ink-subtle))" }, { label: "Missed", value: adh.missed, color: "rgb(var(--danger))" }]} />
                {detailed && (
                  <ul className="mt-4 space-y-1 text-sm">
                    {data.medications.map((m) => { const a = adherence(doseRange.filter((d) => d.medicationId === m.id)); const t = a.taken + a.missed + a.skipped; return t ? <li key={m.id} className="flex justify-between"><span>{m.name}</span><span className="text-ink-muted tabular-nums">{a.taken} taken · {a.skipped} skipped · {a.missed} missed</span></li> : null; })}
                  </ul>
                )}
              </>
            ) : <p className="text-ink-muted">No dose records in this range.</p>}
            <p className="text-sm text-ink-muted mt-3">Recorded doses only. Doses you didn't record aren't counted.</p>
          </Card>

          <Card title="Exercise history" icon={Dumbbell}>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <Stat label="Sessions" value={ex.sessions} />
              <Stat label="Minutes" value={ex.minutes} />
              <Stat label="Pain before → after" value={ex.avgBefore != null ? `${ex.avgBefore}→${ex.avgAfter}` : "–"} />
            </div>
            <ChartFigure title="Exercise minutes per week" table={{ head: ["Week of", "Minutes", "Sessions"], rows: exWeeks.map((w) => [formatDate(w.date), w.minutes, w.count]) }}>
              <BarChart height={150} bars={exWeeks.map((w) => ({ label: detailed ? formatDate(w.date) : `${w.date.getMonth() + 1}/${w.date.getDate()}`, value: w.minutes }))} />
            </ChartFigure>
          </Card>

          <Card title="Treatment history" icon={Syringe}>
            {injections.length ? (
              <ul className="divide-y divide-line">
                {injections.slice(0, detailed ? 6 : 3).map((i) => {
                  const a = aroundInjection(data.pain, i);
                  return (
                    <li key={i.id} className="py-2.5 first:pt-0">
                      <p className="font-semibold text-ink">{i.type}</p>
                      <p className="text-sm text-ink-muted">{formatDateYear(i.date)} · {i.location}</p>
                      <p className="text-sm mt-0.5">At visit: {i.painBefore ?? "–"} → {i.painAfter ?? "–"}{i.effectiveness ? ` · ${i.effectiveness}` : ""}</p>
                      {(a.beforeCount > 0 || a.afterCount > 0) && <p className="text-sm text-ink-muted">Logged average: {a.before ?? "–"} two weeks before, {a.after ?? "–"} two weeks after</p>}
                    </li>
                  );
                })}
              </ul>
            ) : <p className="text-ink-muted">No injections recorded.</p>}
            <Link to="/treatments" className="btn-ghost w-full mt-2">View all treatments</Link>
          </Card>
        </div>
      )}
    </Page>
  );
}
