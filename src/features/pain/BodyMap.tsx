import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import type { BodyView } from "@/data/models";
import { Segmented } from "@/components/ui";
import { REGIONS, regionLabel, type Region } from "./bodyRegions";

/**
 * Interactive body map from the prototype ("Tap on body parts to select pain locations").
 * Each region is a focusable checkbox: tap/click, or Tab + Enter/Space on a keyboard.
 * Front/Back views; sided regions are labelled from the patient's perspective.
 */
export function BodyMap({ value, onChange, size = "md" }: { value: string[]; onChange: (v: string[]) => void; size?: "sm" | "md" }) {
  const [view, setView] = useState<BodyView>("front");
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  const onKey = (e: KeyboardEvent, id: string) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(id); }
  };
  const shape = (r: Region, on: boolean) => {
    const common = {
      className: "cursor-pointer transition-colors outline-none focus-visible:stroke-[3] focus-visible:stroke-navy hover:fill-[rgb(var(--primary-soft))]",
      fill: on ? "#E8522B" : "#DBDBDB",
      stroke: on ? "#B42318" : "#A6AFB8",
      strokeWidth: 1.2,
      role: "checkbox",
      "aria-checked": on,
      "aria-label": r.label,
      tabIndex: 0,
      onClick: () => toggle(r.id),
      onKeyDown: (e: KeyboardEvent) => onKey(e, r.id),
    } as const;
    const s = r.shape;
    return s.kind === "rect" ? <rect key={r.id} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} {...common} /> : <ellipse key={r.id} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...common} />;
  };

  return (
    <div>
      <div className="rounded-md bg-accent-wash py-4 flex flex-col items-center">
        <div className="flex w-full justify-between px-4 text-xs font-semibold text-ink-muted" aria-hidden>
          <span>{view === "front" ? "Right" : "Left"}</span>
          <span>{view === "front" ? "Front" : "Back"}</span>
          <span>{view === "front" ? "Left" : "Right"}</span>
        </div>
        <svg viewBox="0 0 200 420" className={size === "sm" ? "h-[300px] w-auto" : "h-[340px] md:h-[400px] w-auto"} role="group" aria-label={`Body map, ${view} view. ${value.length} area${value.length === 1 ? "" : "s"} selected.`}>
          {REGIONS[view].map((r) => shape(r, value.includes(r.id)))}
        </svg>
      </div>
      <p className="text-center text-ink-muted mt-3 text-[0.95rem]">Tap on body parts to select pain locations.</p>
      <div className="flex justify-center mt-3">
        <Segmented label="Body map view" value={view} onChange={setView} options={[{ value: "front", label: "Front" }, { value: "back", label: "Back" }]} />
      </div>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2 mt-4" aria-label="Selected pain locations">
          {value.map((id) => (
            <li key={id}>
              <button type="button" className="chip chip-active pr-2" onClick={() => toggle(id)} aria-label={`Remove ${regionLabel(id)}`}>
                {regionLabel(id)} <X size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
