import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, CalendarDays, ChevronRight, Dumbbell, FileText, MapPin, Pill, Plus, Syringe, TrendingDown, TrendingUp, Utensils } from "lucide-react";
import { Page } from "@/app/AppShell";
import { useStore } from "@/app/AppStore";
import { useToast } from "@/components/Toast";
import { Card, EmptyState, SeeAll, Stat } from "@/components/ui";
import { BarChart } from "@/components/charts";
import { PainBadge, PainScale, PAIN_WORDS } from "@/features/pain/PainScale";
import { PainEntryRow } from "@/features/pain/PainEntryRow";
import { regionLabel } from "@/features/pain/bodyRegions";
import { DoseRow } from "@/features/meds/DoseRow";
import { dosesForDay } from "@/logic/medications";
import { dailySeries, exerciseSummary, inRange, loggingStreak, weekComparison } from "@/logic/insights";
import { addDays, formatDateLong, formatTime, formatWeekday, greeting, isSameDay, relativeDay, startOfWeek } from "@/lib/dates";

export default function Home() {
  const { data, profile, save, remove } = useStore();
  const toast = useToast();
  const nav = useNavigate();
  const now = new Date();
  const [justLogged, setJustLogged] = useState<{ id: string; value: number } | null>(null);

  const pain = useMemo(() => [...data.pain].sort((a, b) => b.timestamp.localeCompare(a.timestamp)), [data.pain]);
  const today = pain.filter((p) => isSameDay(p.timestamp, now));
  const latest = today[0];
  const doses = dosesForDay(data.medications, data.doses, now, now);
  const pendingDoses = doses.filter((d) => d.state === "due" || d.state === "overdue");
  const shownDoses = [...pendingDoses, ...doses.filter((d) => d.state === "upcoming")].slice(0, 3);
  const upcoming = data.appointments.filter((a) => new Date(a.date) > now).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 2);
  const week = weekComparison(data.pain, now);
  const streak = loggingStreak(data.pain, now);
  const last7 = dailySeries(data.pain, 7, now);
  const weekEx = exerciseSummary(inRange(data.exercise, (e) => e.date, startOfWeek(now), addDays(now, 1)));
  const lastEx = [...data.exercise].sort((a, b) => b.date.localeCompare(a.date))[0];

  const quickLog = async (n: number) => {
    const ts = new Date().toISOString();
    const rec = await save("pain", { timestamp: ts, intensity: n, locations: [], characteristics: [], triggers: [] }).catch(() => null);
    if (!rec) return;
    setJustLogged({ id: rec.id, value: n });
    toast.show(`Pain ${n} logged at ${formatTime(ts)}`, { action: { label: "Undo", run: () => { remove("pain", rec.id); setJustLogged(null); } } });
  };

  return (
    <Page title="Home" mobileTitle="Pain Tracker" wide>
      <p className="text-ink-muted">{formatDateLong(now)}</p>
      <h2 className="text-2xl md:text-3xl font-bold text-navy mt-0.5 mb-4">{greeting(now)}, {profile?.displayName ?? "there"}</h2>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Primary action: visible without scrolling on every screen size */}
        <section className="card card-pad lg:col-span-2" aria-labelledby="today-h">
          <div className="flex items-start gap-4">
            <PainBadge value={latest?.intensity} size="lg" />
            <div className="flex-1 min-w-0">
              <h2 id="today-h" className="section-title">Today's pain</h2>
              {latest ? (
                <p className="text-ink-muted text-[0.95rem]">
                  {PAIN_WORDS[latest.intensity]} · last logged {formatTime(latest.timestamp)}
                  {latest.locations.length > 0 && <><br /><span className="inline-flex items-center gap-1"><MapPin size={14} aria-hidden />{latest.locations.map(regionLabel).join(", ")}</span></>}
                </p>
              ) : <p className="text-ink-muted">No log yet today.</p>}
              {today.length > 1 && <p className="text-sm text-ink-subtle mt-0.5">{today.length} logs today · range {Math.min(...today.map((t) => t.intensity))}–{Math.max(...today.map((t) => t.intensity))}</p>}
            </div>
          </div>
          <div className="mt-4 rounded-md bg-accent-wash p-3 md:p-4">
            <PainScale compact value={undefined} onChange={quickLog} label="Tap a number to log your pain now" />
            {justLogged && (
              <p className="text-center text-sm -mt-1" role="status">
                Saved. <Link className="font-semibold text-primary underline" to={`/log/${justLogged.id}`}>Add location and details</Link>
              </p>
            )}
          </div>
          <Link to="/log" className="btn-primary btn-lg w-full mt-3"><Plus size={22} aria-hidden /> Log pain with details</Link>
        </section>

        <Card title="This week" icon={Activity} action={<SeeAll to="/insights" label="See all insights" />}>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Avg pain" value={week.current ?? "–"} />
            <Stat label="Logs" value={week.currentCount} />
            <Stat label="Day streak" value={streak} />
          </div>
          {week.change != null && (
            <p className="text-sm mt-3 flex items-center gap-1.5 text-ink">
              {week.change <= 0 ? <TrendingDown size={16} className="text-success-ink" aria-hidden /> : <TrendingUp size={16} className="text-warning-ink" aria-hidden />}
              {week.change === 0 ? "Same as" : `${Math.abs(week.change)} ${week.change < 0 ? "lower" : "higher"} than`} the same days last week ({week.previous})
            </p>
          )}
          <div className="mt-3">
            <BarChart height={120} max={10} bars={last7.map((d) => ({ label: formatWeekday(d.date).slice(0, 2), value: d.avg ?? 0, display: d.avg == null ? "" : String(d.avg), color: d.avg == null ? "rgb(var(--line))" : `var(--pain-${Math.round(d.avg)})` }))} />
            <p className="sr-only">Daily average pain for the last 7 days: {last7.map((d) => `${formatWeekday(d.date)} ${d.avg ?? "no log"}`).join(", ")}.</p>
          </div>
        </Card>

        <Card title="Medications today" icon={Pill} action={<SeeAll to="/medications" label="Manage medications" />} className="lg:col-span-1">
          {shownDoses.length ? (
            <ul className="divide-y divide-line">{shownDoses.map((d) => <DoseRow key={`${d.medication.id}-${d.time}`} dose={d} compact />)}</ul>
          ) : (
            <EmptyState icon={Pill} title={doses.length ? "All of today's doses are recorded" : "No scheduled medications"} action={!data.medications.length ? <Link to="/medications?new=1" className="btn-secondary">Add medication</Link> : undefined} />
          )}
          {doses.length > 0 && <p className="text-sm text-ink-muted mt-3">{doses.filter((d) => d.record).length} of {doses.length} scheduled doses recorded today</p>}
        </Card>

        <Card title="Recent entries" icon={Activity} action={<SeeAll to="/history" label="See all pain entries" />}>
          {pain.length ? <ul>{pain.slice(0, 3).map((p) => <PainEntryRow key={p.id} entry={p} />)}</ul> : <EmptyState icon={Activity} title="No pain entries yet" >Tap a number above to log in one step.</EmptyState>}
        </Card>

        <Card title="Upcoming appointments" icon={CalendarDays} action={<SeeAll to="/appointments" label="See all appointments" />}>
          {upcoming.length ? (
            <ul className="space-y-3">
              {upcoming.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <div className="w-14 shrink-0 rounded-sm bg-primary-soft text-navy text-center py-1.5">
                    <p className="text-xs font-semibold uppercase">{new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(a.date))}</p>
                    <p className="text-xl font-bold leading-none">{new Date(a.date).getDate()}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{a.purpose}</p>
                    <p className="text-sm text-ink-muted">{relativeDay(a.date, now)} at {formatTime(a.date)} · {a.provider}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : <EmptyState icon={CalendarDays} title="No upcoming appointments" action={<Link to="/appointments?new=1" className="btn-secondary">Add appointment</Link>} />}
          {upcoming.length > 0 && <Link to="/report" className="btn-ghost w-full mt-3 border border-line"><FileText size={18} aria-hidden /> Prepare a report for your visit</Link>}
        </Card>

        <Card title="Exercise activity" icon={Dumbbell} action={<SeeAll to="/exercise" label="See exercise history" />}>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Minutes this week" value={weekEx.minutes} />
            <Stat label="Sessions this week" value={weekEx.sessions} />
          </div>
          {lastEx && <p className="text-sm text-ink-muted mt-3">Last: {lastEx.type}, {lastEx.durationMin} min, {relativeDay(lastEx.date, now).toLowerCase()}{lastEx.painBefore != null && lastEx.painAfter != null ? ` · pain ${lastEx.painBefore} → ${lastEx.painAfter}` : ""}</p>}
          <button type="button" className="btn-secondary w-full mt-3" onClick={() => nav("/exercise?new=1")}><Plus size={18} aria-hidden /> Log exercise</button>
        </Card>
      </div>

      <h2 className="section-title mt-8 mb-3">More tracking</h2>
      <ul className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: "/treatments", label: "Injections", sub: `${data.injections.length} recorded`, icon: Syringe },
          { to: "/meals", label: "Meals", sub: `${data.meals.filter((m) => isSameDay(m.date, now)).length} today`, icon: Utensils },
          { to: "/medications", label: "Medication history", sub: `${data.medications.filter((m) => m.active).length} active`, icon: Pill },
          { to: "/report", label: "Patient report", sub: "Export a PDF", icon: FileText },
        ].map(({ to, label, sub, icon: I }) => (
          <li key={to}>
            <Link to={to} className="card flex items-center gap-3 p-3 min-h-[72px] hover:border-primary transition-colors">
              <span className="icon-tile"><I size={20} aria-hidden /></span>
              <span className="flex-1 min-w-0"><span className="block font-semibold text-ink text-[0.95rem]">{label}</span><span className="block text-xs text-ink-muted">{sub}</span></span>
              <ChevronRight size={16} className="text-ink-subtle hidden sm:block" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Page>
  );
}
