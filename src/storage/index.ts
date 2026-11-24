import { LocalAdapter } from "./localAdapter";
import { SupabaseAdapter } from "./supabaseAdapter";
import type { DataAdapter } from "./types";
import { auth } from "@/auth/auth";

export function createAdapter(): DataAdapter {
  if (import.meta.env.VITE_DATA_BACKEND === "supabase") {
    return new SupabaseAdapter(import.meta.env.VITE_SUPABASE_URL ?? "", import.meta.env.VITE_SUPABASE_ANON_KEY ?? "", () => auth.getAccessToken());
  }
  return new LocalAdapter();
}

/** Small device-preference store (profile, consent, settings, drafts). */
export const prefs = {
  get<T>(name: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(`pain-tracker:v1:${name}`);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(name: string, value: unknown) {
    try {
      localStorage.setItem(`pain-tracker:v1:${name}`, JSON.stringify(value));
    } catch {
      /* storage full or disabled — preferences fall back to defaults */
    }
  },
  remove(name: string) {
    try {
      localStorage.removeItem(`pain-tracker:v1:${name}`);
    } catch {
      /* ignore */
    }
  },
};

export * from "./types";
