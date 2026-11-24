import type { Role } from "@/data/models";

/**
 * Authentication boundary.
 * The demo uses a single on-device patient session (no credentials, no network).
 * A production provider (e.g. Supabase Auth with MFA) implements the same interface.
 */
export interface Session {
  patientId: string;
  role: Role;
  mode: "demo" | "authenticated";
}

export interface AuthProvider {
  getSession(): Session | null;
  getAccessToken(): Promise<string | null>;
  signOut(): Promise<void>;
}

export const DEMO_PATIENT_ID = "demo-patient";

class DemoAuth implements AuthProvider {
  getSession(): Session {
    return { patientId: DEMO_PATIENT_ID, role: "patient", mode: "demo" };
  }
  async getAccessToken() {
    return null; // demo never talks to a server
  }
  async signOut() {
    /* nothing to revoke on-device */
  }
}

export const auth: AuthProvider = new DemoAuth();
