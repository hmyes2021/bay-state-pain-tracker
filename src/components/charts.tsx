import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(320);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => setW(Math.max(200, el.clientWidth));
    set();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Chart wrapper: caption, visual, and an equivalent data table for screen readers / precise reading. */
export function ChartFigure({ title, caption, table, children }: { title: string; caption?: ReactNode; table: { head: string[]; rows: Array<Array<string | number>> }; children: ReactNode }) {
  return (
    <figure className="m-0">
      <div aria-hidden="true">{children}</div>
      <figcaption className="sr-only">{title}</figcaption>
      {caption && <p className="text-sm text-ink-muted mt-2">{caption}</p>}
      <details className="mt-2">
        <summary className="text-sm font-semibold text-primary cursor-pointer min-h-[44px] inline-flex items-center">Show data table</summary>
        <div className="overflow-x-auto mt-1">
          <table className="w-full text-sm">
            <caption className="sr-only">{title}</caption>
            <thead><tr>{table.head.map((h) => <th key={h} scope="col" className="text-left font-semibold text-ink-muted py-1.5 pr-3 border-b border-line">{h}</th>)}</tr></thead>
            <tbody>{table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => j === 0 ? <th key={j} scope="row" className="text-left font-normal py-1.5 pr-3 border-b border-line">{c}</th> : <td key={j} className="py-1.5 pr-3 border-b border-line tabular-nums">{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

export interface LinePoint { label: string; a: number | null; b?: number | null }

/** Pain trend (0–10). `b` (e.g. daily peak) is drawn only in the detailed (desktop) variant. */
export function LineChart({ points, detailed, height = 200, aLabel = "Average", bLabel = "Peak" }: { points: LinePoint[]; detailed: boolean; height?: number; aLabel?: string; bLabel?: string }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const pad = { l: 28, r: 8, t: 10, b: 24 };
  const iw = w - pad.l - pad.r, ih = height - pad.t - pad.b;
  const x = (i: number) => pad.l + (points.length <= 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / 10) * ih;
  const path = (get: (p: LinePoint) => number | null | undefined) => {
    let d = "", pen = false;
    points.forEach((p, i) => {
      const v = get(p);
      if (v == null) { pen = false; return; }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };
  const ticks = detailed ? [0, 2, 4, 6, 8, 10] : [0, 5, 10];
  const every = Math.max(1, Math.ceil(points.length / (detailed ? 10 : 5)));
  return (
    <div ref={ref} className="w-full">
      {detailed && (
        <div className="flex gap-4 text-xs text-ink-muted mb-1">
          <span className="inline-flex items-center gap-1.5"><span className="w-4 h-[3px] rounded bg-primary" />{aLabel}</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-4 h-[3px] rounded bg-[#E8522B]" style={{ backgroundImage: "repeating-linear-gradient(90deg,#E8522B 0 4px,transparent 4px 7px)" }} />{bLabel}</span>
        </div>
      )}
      <svg width={w} height={height} className="block">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke="rgb(var(--line))" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="rgb(var(--ink-muted))">{t}</text>
          </g>
        ))}
        {points.map((p, i) => i % every === 0 && <text key={i} x={x(i)} y={height - 6} textAnchor="middle" fontSize="11" fill="rgb(var(--ink-muted))">{p.label}</text>)}
        {detailed && <path d={path((p) => p.b)} fill="none" stroke="#E8522B" strokeWidth="1.5" strokeDasharray="4 3" />}
        <path d={path((p) => p.a)} fill="none" stroke="rgb(var(--primary))" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => p.a != null && (detailed || points.length <= 14) && <circle key={i} cx={x(i)} cy={y(p.a)} r={detailed ? 3 : 3.5} fill="rgb(var(--surface-raised))" stroke="rgb(var(--primary))" strokeWidth="2" />)}
      </svg>
    </div>
  );
}

export interface Bar { label: string; value: number; display?: string; color?: string }

export function BarChart({ bars, max, height = 180, unit = "" }: { bars: Bar[]; max?: number; height?: number; unit?: string }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const pad = { l: 8, r: 8, t: 18, b: 24 };
  const ih = height - pad.t - pad.b;
  const m = Math.max(max ?? 0, ...bars.map((b) => b.value), 1);
  const slot = (w - pad.l - pad.r) / Math.max(1, bars.length);
  const bw = Math.min(42, slot * 0.62);
  return (
    <div ref={ref} className="w-full">
      <svg width={w} height={height} className="block">
        <line x1={pad.l} x2={w - pad.r} y1={pad.t + ih} y2={pad.t + ih} stroke="rgb(var(--line-strong))" />
        {bars.map((b, i) => {
          const h = (b.value / m) * ih;
          const cxp = pad.l + slot * i + slot / 2;
          return (
            <g key={i}>
              <rect x={cxp - bw / 2} y={pad.t + ih - h} width={bw} height={Math.max(h, b.value ? 2 : 0)} rx="4" fill={b.color ?? "rgb(var(--primary))"} />
              <text x={cxp} y={pad.t + ih - h - 5} textAnchor="middle" fontSize="11" fontWeight="600" fill="rgb(var(--ink))">{b.display ?? `${b.value}${unit}`}</text>
              <text x={cxp} y={height - 6} textAnchor="middle" fontSize="11" fill="rgb(var(--ink-muted))">{b.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Horizontal bars for ranked lists (body locations, triggers) — readable at any width. */
export function RankBars({ items, total }: { items: Array<{ label: string; value: number }>; total?: number }) {
  const m = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i.label}>
          <div className="flex justify-between text-sm mb-1"><span className="text-ink">{i.label}</span><span className="text-ink-muted tabular-nums">{i.value}{total ? ` of ${total}` : ""}</span></div>
          <div className="h-2.5 rounded-full bg-surface-sunken overflow-hidden"><div className={cx("h-full rounded-full bg-primary")} style={{ width: `${(i.value / m) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

/** Stacked proportion bar (medication status). */
export function StackBar({ parts }: { parts: Array<{ label: string; value: number; color: string }> }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  return (
    <div>
      <div className="flex h-4 rounded-full overflow-hidden bg-surface-sunken">
        {parts.map((p) => p.value > 0 && <div key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />)}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
        {parts.map((p) => <li key={p.label} className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: p.color }} aria-hidden />{p.label}: <span className="font-semibold tabular-nums">{p.value}</span></li>)}
      </ul>
    </div>
  );
}
