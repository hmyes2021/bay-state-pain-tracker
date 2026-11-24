import { useCallback, useState, type ReactNode } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Page } from "@/app/AppShell";
import { useStore } from "@/app/AppStore";
import { ConfirmDialog, Dialog, EmptyState, type Icon } from "@/components/ui";
import { useNewParam } from "@/hooks/useNewParam";
import type { PatientData } from "@/data/models";

type C = "injections" | "exercise" | "meals" | "appointments";
type R<K extends C> = PatientData[K][number];

export interface RecordPageProps<K extends C> {
  title: string;
  noun: string;
  collection: K;
  icon: Icon;
  dateOf: (r: R<K>) => string;
  row: (r: R<K>) => { title: ReactNode; sub?: ReactNode; side?: ReactNode; body?: ReactNode };
  Form: (p: { initial: Partial<R<K>>; onDone: () => void }) => ReactNode;
  blank: () => Partial<R<K>>;
  summary?: ReactNode;
  emptyText: string;
  upcomingFirst?: boolean;
}

/** List + add/edit dialog + delete-with-undo, shared by the lighter trackers. */
export function RecordPage<K extends C>({ title, noun, collection, icon: I, dateOf, row, Form, blank, summary, emptyText, upcomingFirst }: RecordPageProps<K>) {
  const { data, remove } = useStore();
  const [editing, setEditing] = useState<Partial<R<K>> | null>(null);
  const [deleting, setDeleting] = useState<R<K> | null>(null);
  const openNew = useCallback(() => setEditing(blank()), [blank]);
  useNewParam(openNew);
  const now = Date.now();
  const list = [...(data[collection] as R<K>[])].sort((a, b) => dateOf(b).localeCompare(dateOf(a)));
  const upcoming = upcomingFirst ? list.filter((r) => new Date(dateOf(r)).getTime() > now).reverse() : [];
  const past = upcomingFirst ? list.filter((r) => new Date(dateOf(r)).getTime() <= now) : list;

  const renderList = (items: R<K>[]) => (
    <ul className="divide-y divide-line">
      {items.map((r) => {
        const v = row(r);
        return (
          <li key={r.id} className="py-3 first:pt-0 last:pb-0 flex gap-3 items-start">
            {v.side}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-ink">{v.title}</p>
              {v.sub && <p className="text-sm text-ink-muted">{v.sub}</p>}
              {v.body}
            </div>
            <button type="button" className="icon-btn text-primary" aria-label={`Edit ${noun}`} onClick={() => setEditing(r)}><Pencil size={18} aria-hidden /></button>
            <button type="button" className="icon-btn text-danger-ink" aria-label={`Delete ${noun}`} onClick={() => setDeleting(r)}><Trash2 size={18} aria-hidden /></button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <Page title={title} back="/" action={<button type="button" onClick={openNew} className="btn min-h-[40px] px-3 bg-white/15 text-white lg:bg-primary lg:min-h-[44px]"><Plus size={18} aria-hidden /> Add</button>}>
      {summary}
      {list.length === 0 ? (
        <div className="card"><EmptyState icon={I} title={`No ${noun}s yet`} action={<button className="btn-primary" onClick={openNew}><Plus size={18} aria-hidden /> Add {noun}</button>}>{emptyText}</EmptyState></div>
      ) : (
        <div className="space-y-4">
          {upcoming.length > 0 && <section className="card card-pad" aria-labelledby="up-h"><h2 id="up-h" className="section-title mb-3">Upcoming</h2>{renderList(upcoming)}</section>}
          {past.length > 0 && <section className="card card-pad" aria-labelledby="past-h"><h2 id="past-h" className="section-title mb-3">{upcomingFirst ? "Past" : "History"}</h2>{renderList(past)}</section>}
        </div>
      )}
      <Dialog open={!!editing} onClose={() => setEditing(null)} title={editing && "id" in editing && editing.id ? `Edit ${noun}` : `Add ${noun}`} size="lg">
        {editing && <Form initial={editing} onDone={() => setEditing(null)} />}
      </Dialog>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title={`Delete this ${noun}?`} description="You can undo right after." onConfirm={() => deleting && remove(collection, deleting.id, { undoLabel: `${noun[0].toUpperCase()}${noun.slice(1)} deleted` })} />
    </Page>
  );
}

export function PainSelect({ label, value, onChange, id }: { label: string; value: number | undefined; onChange: (n: number | undefined) => void; id: string }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">{label} <span className="font-normal text-ink-muted">(0–10, optional)</span></label>
      <select id={id} className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}>
        <option value="">Not recorded</option>
        {Array.from({ length: 11 }, (_, n) => <option key={n} value={n}>{n}</option>)}
      </select>
    </div>
  );
}

export function FormActions({ onCancel, label }: { onCancel: () => void; label: string }) {
  return <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button><button className="btn-primary">{label}</button></div>;
}
