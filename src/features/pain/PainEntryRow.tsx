import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { PainEntry } from "@/data/models";
import { PainBadge } from "./PainScale";
import { regionLabel } from "./bodyRegions";
import { formatTime, relativeDay } from "@/lib/dates";

export function PainEntryRow({ entry }: { entry: PainEntry }) {
  const where = entry.locations.length ? entry.locations.slice(0, 2).map(regionLabel).join(", ") + (entry.locations.length > 2 ? ` +${entry.locations.length - 2}` : "") : "No location added";
  return (
    <li>
      <Link to={`/log/${entry.id}`} className="flex items-center gap-3 py-2.5 rounded-sm hover:bg-surface -mx-2 px-2 min-h-[56px]" aria-label={`Pain ${entry.intensity} of 10, ${relativeDay(entry.timestamp)} ${formatTime(entry.timestamp)}, ${where}. Edit entry`}>
        <PainBadge value={entry.intensity} />
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-ink">{relativeDay(entry.timestamp)}, {formatTime(entry.timestamp)}</span>
          <span className="block text-sm text-ink-muted truncate">{where}{entry.characteristics.length ? ` · ${entry.characteristics.join(", ").toLowerCase()}` : ""}</span>
        </span>
        <ChevronRight size={18} className="text-ink-subtle" aria-hidden />
      </Link>
    </li>
  );
}
