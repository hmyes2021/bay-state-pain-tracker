/** Small local-time date helpers (no dependency). */
export const DAY = 86_400_000;

export function startOfDay(d: Date | string | number): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export function isSameDay(a: Date | string, b: Date | string): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}
/** Monday-based week start. */
export function startOfWeek(d: Date | string): Date {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7;
  return addDays(x, -day);
}
export function startOfMonth(d: Date | string): Date {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}
export function dayKey(d: Date | string): string {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}
export function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
export function atTime(day: Date, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const x = new Date(day);
  x.setHours(h, m, 0, 0);
  return x;
}
/** Value for <input type="datetime-local">. */
export function toLocalInput(iso: string | Date): string {
  const d = new Date(iso);
  return `${dayKey(d)}T${hhmm(d)}`;
}
export function fromLocalInput(v: string): string {
  return new Date(v).toISOString();
}

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", o);
export const formatTime = (d: Date | string) => fmt({ hour: "numeric", minute: "2-digit" }).format(new Date(d));
export const formatDate = (d: Date | string) => fmt({ month: "short", day: "numeric" }).format(new Date(d));
export const formatDateLong = (d: Date | string) => fmt({ weekday: "long", month: "long", day: "numeric" }).format(new Date(d));
export const formatDateYear = (d: Date | string) => fmt({ month: "short", day: "numeric", year: "numeric" }).format(new Date(d));
export const formatWeekday = (d: Date | string) => fmt({ weekday: "short" }).format(new Date(d));
export function formatTime12(t: string): string {
  return formatTime(atTime(new Date(), t));
}

export function relativeDay(d: Date | string, now = new Date()): string {
  const diff = Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / DAY);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  if (diff > 1 && diff < 7) return `In ${diff} days`;
  return formatDate(d);
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
