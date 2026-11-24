import { useId, useRef, type KeyboardEvent } from "react";
import { cx } from "@/lib/cx";

export const PAIN_WORDS = ["No pain", "Very mild", "Mild", "Mild", "Moderate", "Moderate", "Moderately severe", "Severe", "Very severe", "Very severe", "Worst imaginable"];

/** Text color that keeps ≥4.5:1 on each scale color. */
export const painInk = (n: number) => (n >= 9 ? "#FFFFFF" : "#10263B");
export const painColor = (n: number) => `var(--pain-${Math.max(0, Math.min(10, Math.round(n)))})`;

export function PainBadge({ value, size = "md" }: { value: number | null | undefined; size?: "sm" | "md" | "lg" }) {
  if (value == null) return <span className={cx("inline-flex items-center justify-center rounded-sm bg-surface-sunken text-ink-muted font-bold", size === "lg" ? "w-16 h-16 text-2xl" : size === "sm" ? "w-8 h-8 text-sm" : "w-11 h-11 text-lg")}>–</span>;
  return (
    <span className={cx("inline-flex items-center justify-center rounded-sm font-bold shrink-0 tabular-nums", size === "lg" ? "w-16 h-16 text-3xl" : size === "sm" ? "w-8 h-8 text-sm" : "w-11 h-11 text-lg")}
      style={{ background: painColor(value), color: painInk(Math.round(value)) }} role="img" aria-label={`Pain ${value} out of 10`}>
      {Number.isInteger(value) ? value : value.toFixed(1)}
    </span>
  );
}

/**
 * 0–10 intensity scale from the prototype ("How is your pain right now?"), as a radiogroup:
 * one tap to choose, arrow keys to move, Home/End to jump.
 */
export function PainScale({ value, onChange, label = "How is your pain right now?", sub, compact = false, error }: { value: number | undefined; onChange: (n: number) => void; label?: string; sub?: string; compact?: boolean; error?: string }) {
  const lid = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const focusIdx = value ?? 0;
  const onKey = (e: KeyboardEvent) => {
    let n: number | null = null;
    // Move from the focused option (not only the selected one), as native radio groups do.
    const focused = refs.current.findIndex((el) => el === document.activeElement);
    const cur = focused >= 0 ? focused : value ?? 0;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") n = Math.min(10, cur + 1);
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") n = Math.max(0, cur - 1);
    if (e.key === "Home") n = 0;
    if (e.key === "End") n = 10;
    if (n == null) return;
    e.preventDefault();
    onChange(n);
    refs.current[n]?.focus();
  };
  return (
    <div>
      <p id={lid} className={cx("font-semibold text-primary text-center", compact ? "text-base" : "text-lg md:text-xl")}>{label}</p>
      {sub && <p className="text-sm text-ink-muted text-center mt-0.5">{sub}</p>}
      <div role="radiogroup" aria-labelledby={lid} aria-describedby={error ? `${lid}-e` : undefined} aria-required="true" className="grid grid-cols-11 gap-[3px] mt-4" onKeyDown={onKey}>
        {Array.from({ length: 11 }, (_, n) => {
          const on = value === n;
          return (
            <button key={n} ref={(el) => (refs.current[n] = el)} type="button" role="radio" aria-checked={on} aria-label={`${n}, ${PAIN_WORDS[n]}`} tabIndex={n === focusIdx ? 0 : -1} onClick={() => onChange(n)}
              className={cx("group relative flex flex-col items-center justify-end rounded-xs transition-transform", compact ? "h-[52px]" : "h-[64px]", on && "-translate-y-1")}>
              <span className={cx("text-base md:text-lg tabular-nums mb-1", on ? "font-extrabold text-ink" : "text-primary")}>{n}</span>
              <span className={cx("block w-full rounded-[3px] transition-all", on ? "h-5 ring-2 ring-navy ring-offset-1" : "h-3")} style={{ background: painColor(n) }} aria-hidden />
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-sm text-ink-muted mt-2" aria-hidden>
        <span>No pain</span>
        <span>Worst ever</span>
      </div>
      <p className="text-center mt-2 min-h-[1.5rem] font-semibold text-ink" aria-live="polite">{value != null ? `${value} — ${PAIN_WORDS[value]}` : ""}</p>
      {error && <p id={`${lid}-e`} className="text-center text-danger-ink font-medium text-sm">{error}</p>}
    </div>
  );
}
