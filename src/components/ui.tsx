import { forwardRef, useEffect, useId, useRef, type ComponentType, type InputHTMLAttributes, type KeyboardEvent, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, Minus, Plus, X } from "lucide-react";
import type { LucideProps } from "lucide-react";
import { cx } from "@/lib/cx";

export type Icon = ComponentType<LucideProps>;

/* ---------- Card ---------- */
export function Card({ title, icon: I, action, children, className, titleId, as: As = "section" }: { title?: ReactNode; icon?: Icon; action?: ReactNode; children: ReactNode; className?: string; titleId?: string; as?: "section" | "div" | "article" }) {
  const gen = useId();
  const hid = titleId ?? gen;
  return (
    <As className={cx("card card-pad", className)} aria-labelledby={title ? hid : undefined}>
      {title && (
        <div className="flex items-center gap-3 mb-3">
          {I && <span className="icon-tile w-9 h-9"><I size={18} aria-hidden /></span>}
          <h2 id={hid} className="section-title flex-1">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </As>
  );
}

export function SeeAll({ to, children = "See all", label }: { to: string; children?: ReactNode; label?: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-0.5 text-sm font-semibold text-primary min-h-[44px] px-1 hover:underline" aria-label={label}>
      {children} <ChevronRight size={16} aria-hidden />
    </Link>
  );
}

/* ---------- Collapsible section (prototype "Activity at Time of Pain ⌄") ---------- */
export function Collapsible({ title, icon: I, summary, defaultOpen = false, children }: { title: string; icon?: Icon; summary?: string; defaultOpen?: boolean; children: ReactNode }) {
  return (
    <details className="card group" open={defaultOpen}>
      <summary className="flex items-center gap-3 cursor-pointer list-none px-4 md:px-5 min-h-[64px] [&::-webkit-details-marker]:hidden rounded-md">
        {I && <I size={22} className="text-primary shrink-0" aria-hidden />}
        <span className="flex-1">
          <span className="block font-bold italic text-ink">{title}</span>
          {summary && <span className="block text-sm text-ink-muted truncate">{summary}</span>}
        </span>
        <ChevronDown size={20} className="text-primary transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="px-4 md:px-5 pb-5">{children}</div>
    </details>
  );
}

/* ---------- Form fields ---------- */
interface FieldProps { label: string; hint?: string; error?: string; optional?: boolean }

export const TextField = forwardRef<HTMLInputElement, FieldProps & InputHTMLAttributes<HTMLInputElement>>(function TextField({ label, hint, error, optional, className, id, ...rest }, ref) {
  const gen = useId();
  const fid = id ?? gen;
  return (
    <div className={className}>
      <label htmlFor={fid} className="field-label">{label}{optional && <span className="font-normal text-ink-muted"> (optional)</span>}</label>
      <input ref={ref} id={fid} className={cx("input", error && "border-danger")} aria-invalid={error ? true : undefined} aria-describedby={hint || error ? `${fid}-d` : undefined} {...rest} />
      {(hint || error) && <p id={`${fid}-d`} className={cx("field-hint", error && "text-danger-ink font-medium")}>{error ?? hint}</p>}
    </div>
  );
});

export function TextArea({ label, hint, optional, className, id, children, ...rest }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement> & { children?: ReactNode }) {
  const gen = useId();
  const fid = id ?? gen;
  return (
    <div className={className}>
      <div className="flex items-end justify-between gap-2">
        <label htmlFor={fid} className="field-label">{label}{optional && <span className="font-normal text-ink-muted"> (optional)</span>}</label>
        {children}
      </div>
      <textarea id={fid} className="input" aria-describedby={hint ? `${fid}-d` : undefined} {...rest} />
      {hint && <p id={`${fid}-d`} className="field-hint">{hint}</p>}
    </div>
  );
}

export function SelectField({ label, hint, optional, className, id, options, ...rest }: FieldProps & SelectHTMLAttributes<HTMLSelectElement> & { options: readonly string[] | Array<{ value: string; label: string }> }) {
  const gen = useId();
  const fid = id ?? gen;
  return (
    <div className={className}>
      <label htmlFor={fid} className="field-label">{label}{optional && <span className="font-normal text-ink-muted"> (optional)</span>}</label>
      <select id={fid} className="input" {...rest}>
        {options.map((o) => typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

/* ---------- Chips ---------- */
export function ChipGroup<T extends string>({ label, options, value, onChange, multiple = false, hideLabel, describedBy }: { label: string; options: readonly T[]; value: T[] | T | undefined; onChange: (v: never) => void; multiple?: boolean; hideLabel?: boolean; describedBy?: string }) {
  const sel = Array.isArray(value) ? value : value ? [value] : [];
  const gid = useId();
  const toggle = (o: T) => {
    if (multiple) (onChange as (v: T[]) => void)(sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o]);
    else (onChange as (v: T | undefined) => void)(sel.includes(o) ? undefined : o);
  };
  return (
    <div role="group" aria-labelledby={gid} aria-describedby={describedBy}>
      <p id={gid} className={hideLabel ? "sr-only" : "field-label"}>{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o} type="button" className="chip" aria-pressed={sel.includes(o)} onClick={() => toggle(o)}>{o}</button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Segmented (single choice, radiogroup with arrow keys) ---------- */
export function Segmented<T extends string>({ label, options, value, onChange, hideLabel = true, size = "md" }: { label: string; options: ReadonlyArray<{ value: T; label: string }>; value: T; onChange: (v: T) => void; hideLabel?: boolean; size?: "sm" | "md" }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const idx = options.findIndex((o) => o.value === value);
  const onKey = (e: KeyboardEvent) => {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (idx + d + options.length) % options.length;
    onChange(options[n].value);
    refs.current[n]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={hideLabel ? label : undefined} className="inline-flex rounded-sm border border-line-strong bg-surface-raised p-1 gap-1" onKeyDown={onKey}>
      {options.map((o, i) => (
        <button key={o.value} ref={(el) => (refs.current[i] = el)} type="button" role="radio" aria-checked={o.value === value} tabIndex={o.value === value ? 0 : -1}
          onClick={() => onChange(o.value)}
          className={cx("rounded-xs font-semibold transition-colors", size === "sm" ? "min-h-[36px] px-3 text-sm" : "min-h-[40px] px-4 text-[0.95rem]", o.value === value ? "bg-primary text-white" : "text-ink-muted hover:text-ink")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Switch (prototype reminder toggles) ---------- */
export function Switch({ label, checked, onChange, description, icon: I }: { label: string; checked: boolean; onChange: (v: boolean) => void; description?: string; icon?: Icon }) {
  const id = useId();
  return (
    <div className="flex items-center gap-3 rounded-md bg-surface px-4 py-3 min-h-[60px]">
      {I && <I size={22} className="text-primary shrink-0" aria-hidden />}
      <div className="flex-1">
        <label htmlFor={id} className="block text-ink">{label}</label>
        {description && <p id={`${id}-d`} className="text-sm text-ink-muted">{description}</p>}
      </div>
      <button id={id} type="button" role="switch" aria-checked={checked} aria-describedby={description ? `${id}-d` : undefined} onClick={() => onChange(!checked)}
        className={cx("relative w-[52px] h-[30px] rounded-full transition-colors shrink-0 border-2", checked ? "bg-primary border-primary" : "bg-line-strong border-line-strong")}>
        <span className={cx("absolute top-[2px] left-[2px] w-[22px] h-[22px] rounded-full bg-white shadow transition-transform", checked && "translate-x-[22px]")} aria-hidden />
      </button>
    </div>
  );
}

/* ---------- Stepper ---------- */
export function Stepper({ label, value, onChange, min = 0, max = 20, unit }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number; unit?: string }) {
  const id = useId();
  return (
    <div>
      <p id={id} className="field-label">{label}</p>
      <div className="inline-flex items-center gap-2" role="group" aria-labelledby={id}>
        <button type="button" className="btn-secondary w-12 px-0" aria-label={`Decrease ${label}`} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}><Minus size={18} aria-hidden /></button>
        <output className="min-w-[4.5rem] text-center text-lg font-semibold" aria-live="polite">{value}{unit ? ` ${unit}` : ""}</output>
        <button type="button" className="btn-secondary w-12 px-0" aria-label={`Increase ${label}`} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}><Plus size={18} aria-hidden /></button>
      </div>
    </div>
  );
}

/* ---------- Dialog (native <dialog>: focus trap + Esc built in) ---------- */
export function Dialog({ open, onClose, title, description, children, icon, size = "md" }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; icon?: ReactNode; size?: "md" | "lg" }) {
  const ref = useRef<HTMLDialogElement>(null);
  const tid = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { d.showModal?.(); if (!d.showModal) d.setAttribute("open", ""); }
    if (!open && d.open) d.close?.();
  }, [open]);
  return (
    <dialog ref={ref} aria-labelledby={tid} onCancel={(e) => { e.preventDefault(); onClose(); }} onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className={cx("rounded-lg p-0 w-[calc(100%-2rem)] bg-surface-raised text-ink shadow-raised", size === "lg" ? "max-w-2xl" : "max-w-md")}>
      {open && (
        <div className="p-6 relative max-h-[85vh] overflow-y-auto">
          <button type="button" className="icon-btn absolute right-3 top-3 text-ink-muted" aria-label="Close dialog" onClick={onClose}><X size={22} aria-hidden /></button>
          {icon && <div className="flex justify-center mb-3">{icon}</div>}
          <h2 id={tid} className={cx("text-xl font-bold text-ink pr-10", !!icon && "text-center pr-0")}>{title}</h2>
          {description && <p className={cx("text-ink-muted mt-2", !!icon && "text-center")}>{description}</p>}
          <div className="mt-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = "Delete", tone = "danger" }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; description?: string; confirmLabel?: string; tone?: "danger" | "primary" }) {
  return (
    <Dialog open={open} onClose={onClose} title={title} description={description}>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
        <button type="button" className={tone === "danger" ? "btn bg-danger-ink text-white hover:bg-danger-ink/90" : "btn-primary"} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
      </div>
    </Dialog>
  );
}

/* ---------- Misc ---------- */
export function EmptyState({ icon: I, title, children, action }: { icon: Icon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="text-center py-8 px-4">
      <span className="icon-tile w-14 h-14 rounded-md mb-3"><I size={26} aria-hidden /></span>
      <p className="font-semibold text-ink">{title}</p>
      {children && <p className="text-ink-muted text-sm mt-1 max-w-xs mx-auto">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "success" | "warning" | "danger" | "info"; children: ReactNode }) {
  const t = { neutral: "bg-surface-sunken text-ink-muted", success: "bg-success-soft text-success-ink", warning: "bg-warning-soft text-warning-ink", danger: "bg-danger-soft text-danger-ink", info: "bg-primary-soft text-navy" }[tone];
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", t)}>{children}</span>;
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-2xl font-bold text-ink leading-tight">{value}</p>
      <p className="text-sm text-ink-muted">{label}</p>
      {sub && <p className="text-xs text-ink-subtle mt-0.5">{sub}</p>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-md bg-surface-sunken", className)} aria-hidden />;
}
