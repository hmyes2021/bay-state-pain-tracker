import { useEffect, useRef } from "react";
import { useStore } from "@/app/AppStore";
import { useToast } from "@/components/Toast";
import { dueReminders } from "@/logic/reminders";
import type { Reminder } from "@/data/models";

export function notificationPermission(): NotificationPermission | "unsupported" {
  return typeof Notification === "undefined" ? "unsupported" : Notification.permission;
}

export async function requestNotifications(): Promise<NotificationPermission | "unsupported"> {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.requestPermission();
}

function chime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = 660;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.65);
  } catch {
    /* audio unavailable */
  }
}

/** Show a reminder: system notification when permitted, otherwise an in-app banner. */
export async function deliverReminder(r: Pick<Reminder, "title" | "detail" | "sound" | "vibration" | "kind">, toast: (m: string) => void) {
  const body = r.detail ?? "";
  if (r.sound) chime();
  if (r.vibration && "vibrate" in navigator) navigator.vibrate?.([120, 60, 120]);
  if (notificationPermission() === "granted") {
    const opts: NotificationOptions = { body, icon: `${import.meta.env.BASE_URL}icons/icon-192.png`, badge: `${import.meta.env.BASE_URL}icons/icon-192.png`, tag: `pain-tracker-${r.kind}`, data: { url: r.kind === "pain-log" ? "log" : "reminders" } };
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) { await reg.showNotification(r.title, opts); return; }
      new Notification(r.title, opts);
      return;
    } catch {
      /* fall through to in-app */
    }
  }
  toast(`${r.title}${body ? ` — ${body}` : ""}`);
}

/**
 * In-app reminder scheduler. Checks every 20 s while Pain Tracker is open (foreground or
 * a backgrounded tab/PWA the OS keeps alive). Reliable delivery when the app is closed
 * needs server push (Web Push + VAPID) — listed under production integrations.
 */
export function useReminderRunner() {
  const { data, save, status } = useStore();
  const toast = useToast();
  const last = useRef(new Date());
  const ref = useRef(data.reminders);
  ref.current = data.reminders;

  useEffect(() => {
    if (status !== "ready") return;
    const tick = () => {
      const now = new Date();
      const due = dueReminders(ref.current, last.current, now);
      last.current = now;
      for (const { reminder, slot } of due) {
        deliverReminder(reminder, (m) => toast.show(m, { tone: "info", duration: 8000 }));
        save("reminders", { ...reminder, lastFiredKey: slot }).catch(() => {});
      }
    };
    const t = window.setInterval(tick, 20_000);
    const vis = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", vis);
    return () => { window.clearInterval(t); document.removeEventListener("visibilitychange", vis); };
  }, [status, save, toast]);
}
