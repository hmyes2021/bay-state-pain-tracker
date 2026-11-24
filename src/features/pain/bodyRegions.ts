import type { BodyView } from "@/data/models";

/**
 * Tappable regions for the body map (viewBox 0 0 200 420).
 * Front view is drawn facing the viewer, so the patient's right side is on the viewer's left,
 * matching how clinicians read body diagrams. The back view mirrors sided regions.
 * Shared ids (head, neck, shoulders, arms, hands, feet) highlight on both views.
 */
export type Shape =
  | { kind: "rect"; x: number; y: number; w: number; h: number; r?: number }
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number };

export interface Region {
  id: string;
  label: string;
  shape: Shape;
}

type Side = "right" | "left";
const sided = (base: string, label: string, right: Shape, left: Shape): Region[] => [
  { id: `right-${base}`, label: `Right ${label}`, shape: right },
  { id: `left-${base}`, label: `Left ${label}`, shape: left },
];
const rect = (x: number, y: number, w: number, h: number, r = 10): Shape => ({ kind: "rect", x, y, w, h, r });
const ell = (cx: number, cy: number, rx: number, ry: number): Shape => ({ kind: "ellipse", cx, cy, rx, ry });
const mirror = (s: Shape): Shape => (s.kind === "rect" ? { ...s, x: 200 - s.x - s.w } : { ...s, cx: 200 - s.cx });

// Limbs and shared parts, positioned for the FRONT view (patient's right = viewer's left).
const shared: Array<{ base: string; label: string; right: Shape }> = [
  { base: "shoulder", label: "shoulder", right: ell(63, 90, 15, 12) },
  { base: "upper-arm", label: "upper arm", right: rect(40, 100, 18, 62, 9) },
  { base: "forearm", label: "forearm / elbow", right: rect(33, 164, 17, 60, 8) },
  { base: "hand", label: "hand / wrist", right: ell(40, 240, 11, 15) },
  { base: "foot", label: "foot / ankle", right: ell(86, 398, 14, 9) },
];

const front: Region[] = [
  { id: "head", label: "Head", shape: ell(100, 36, 22, 26) },
  { id: "neck", label: "Neck", shape: rect(89, 62, 22, 16, 6) },
  { id: "chest", label: "Chest", shape: rect(74, 80, 52, 52, 12) },
  { id: "abdomen", label: "Abdomen", shape: rect(76, 134, 48, 44, 10) },
  ...sided("hip", "hip / groin", rect(74, 180, 25, 32, 10), rect(101, 180, 25, 32, 10)),
  ...sided("thigh", "thigh (front)", rect(76, 214, 23, 80, 11), rect(101, 214, 23, 80, 11)),
  ...sided("knee", "knee", ell(87, 306, 12, 12), ell(113, 306, 12, 12)),
  ...sided("shin", "shin", rect(77, 320, 20, 66, 10), rect(103, 320, 20, 66, 10)),
];

const back: Region[] = [
  { id: "head", label: "Head", shape: ell(100, 36, 22, 26) },
  { id: "neck", label: "Neck", shape: rect(89, 62, 22, 16, 6) },
  { id: "upper-back", label: "Upper back", shape: rect(74, 80, 52, 36, 12) },
  { id: "mid-back", label: "Mid back", shape: rect(76, 118, 48, 30, 8) },
  { id: "lower-back", label: "Lower back", shape: rect(76, 150, 48, 30, 10) },
  // Back view: patient's left is on the viewer's left.
  ...sided("buttock", "buttock", rect(101, 182, 25, 32, 10), rect(74, 182, 25, 32, 10)),
  ...sided("hamstring", "back of thigh", rect(101, 216, 23, 92, 11), rect(76, 216, 23, 92, 11)),
  ...sided("calf", "calf", rect(103, 312, 20, 74, 10), rect(77, 312, 20, 74, 10)),
];

function withShared(view: BodyView, list: Region[]): Region[] {
  const extra = shared.flatMap(({ base, label, right }) => {
    const r = view === "front" ? right : mirror(right);
    const l = mirror(r);
    return sided(base, label, r, l);
  });
  return [...list, ...extra];
}

export const REGIONS: Record<BodyView, Region[]> = {
  front: withShared("front", front),
  back: withShared("back", back),
};

const LABELS = new Map<string, string>();
for (const r of [...REGIONS.front, ...REGIONS.back]) LABELS.set(r.id, r.label);

export function regionLabel(id: string): string {
  return LABELS.get(id) ?? id;
}
export function sideOf(id: string): Side | null {
  return id.startsWith("right-") ? "right" : id.startsWith("left-") ? "left" : null;
}
