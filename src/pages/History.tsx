import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Plus } from "lucide-react";
import { Page } from "@/app/AppShell";
import { useStore } from "@/app/AppStore";
import { EmptyState, Segmented } from "@/components/ui";
import { PainEntryRow } from "@/features/pain/PainEntryRow";
import { addDays, dayKey, formatDateLong, startOfDay } from "@/lib/dates";
import { mean, round1 } from "@/logic/insights";

const RANGES = [{ value: "7", label: "7 days" }, { value: "30", label: "30 days" }, { value: "all", label: "All" }] as const;

export default function History() {
  const { data } = useStore();
  const [range, setRange] = useState<(typeof RANGES)[number]["value"]>("30");
  const groups = useMemo(() => {
    const from = range === "all" ? 0 : addDays(startOfDay(new Date()), -Number(range) + 1).getTime();
    const list = data.pain.filter((p) => new Date(p.timestamp).getTime() >= from).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const m = new Map<string, typeof list>();
    for (const p of list) m.set(dayKey(p.timestamp), [...(m.get(dayKey(p.timestamp)) ?? []), p]);
    return [...m.entries()];
  }, [data.pain, range]);
  const count = groups.reduce((a, [, l]) => a + l.length, 0);

  return (
    <Page title="Pain history" back="/" action={<Link to="/log" className="btn min-h-[40px] px-3 bg-white/15 text-white lg:bg-primary lg:min-h-[44px]" aria-label="Add pain log"><Plus size={18} aria-hidden /> Add</Link>}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <Segmented label="Time range" value={range} onChange={setRange} options={RANGES} />
        <p className="text-sm text-ink-muted" aria-live="polite">{count} entries</p>
      </div>
      {groups.length === 0 ? (
        <div className="card"><EmptyState icon={Activity} title="No entries in this range" action={<Link className="btn-primary" to="/log">Log pain</Link>} /></div>
      ) : (
        <div className="space-y-4">
          {groups.map(([k, list]) => (
            <section key={k} className="card card-pad" aria-labelledby={`d-${k}`}>
              <div className="flex items-baseline justify-between mb-1">
                <h2 id={`d-${k}`} className="font-semibold text-ink">{formatDateLong(list[0].timestamp)}</h2>
                <p className="text-sm text-ink-muted">avg {round1(mean(list.map((p) => p.intensity)))}</p>
              </div>
              <ul className="divide-y divide-line">{list.map((p) => <PainEntryRow key={p.id} entry={p} />)}</ul>
            </section>
          ))}
        </div>
      )}
    </Page>
  );
}
