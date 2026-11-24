import type { CollectionName, PatientData } from "@/data/models";
import { EMPTY_DATA, StorageError, type DataAdapter } from "./types";

/**
 * Integration-ready Supabase adapter (PostgREST over fetch, no SDK dependency).
 *
 * NOT CONNECTED in the demo. It is only constructed when VITE_DATA_BACKEND=supabase.
 * Before any real patient data is stored it needs: real Supabase Auth sign-in (the
 * access token below), the schema + row-level-security policies in supabase/schema.sql,
 * a signed BAA with the hosting provider, and a full security/compliance review.
 *
 * Each row stores the record as JSONB in `payload`, keyed by (patient_id, id), so the
 * model can evolve without migrations during the pilot.
 */
const TABLES: Record<CollectionName, string> = {
  pain: "pain_entries",
  medications: "medications",
  doses: "dose_records",
  injections: "injection_records",
  exercise: "exercise_sessions",
  meals: "meal_entries",
  appointments: "appointments",
  reminders: "reminders",
};

export class SupabaseAdapter implements DataAdapter {
  readonly kind = "supabase" as const;
  constructor(
    private readonly url: string,
    private readonly anonKey: string,
    private readonly getAccessToken: () => Promise<string | null>,
  ) {
    if (!url || !anonKey) throw new StorageError("Supabase is selected but VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing.");
  }

  private async request(path: string, init: RequestInit = {}) {
    const token = await this.getAccessToken();
    if (!token) throw new StorageError("You need to sign in before your records can sync.");
    const res = await fetch(`${this.url}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: this.anonKey,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal,resolution=merge-duplicates",
        ...init.headers,
      },
    });
    if (!res.ok) throw new StorageError(`Sync failed (${res.status}).`);
    return res;
  }

  async load(patientId: string) {
    const data: PatientData = structuredClone(EMPTY_DATA);
    await Promise.all(
      (Object.keys(TABLES) as CollectionName[]).map(async (c) => {
        const res = await this.request(`${TABLES[c]}?patient_id=eq.${encodeURIComponent(patientId)}&select=payload`, { headers: { Prefer: "" } });
        const rows = (await res.json()) as Array<{ payload: never }>;
        (data[c] as unknown[]) = rows.map((r) => r.payload);
      }),
    );
    return data;
  }

  async upsert<C extends CollectionName>(patientId: string, collection: C, record: PatientData[C][number]) {
    const r = record as { id: string; updatedAt: string };
    await this.request(TABLES[collection], {
      method: "POST",
      body: JSON.stringify({ id: r.id, patient_id: patientId, payload: record, updated_at: r.updatedAt }),
    });
  }

  async remove(patientId: string, collection: CollectionName, id: string) {
    await this.request(`${TABLES[collection]}?patient_id=eq.${encodeURIComponent(patientId)}&id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  async replaceAll(patientId: string, data: PatientData) {
    await this.clear(patientId);
    for (const c of Object.keys(TABLES) as CollectionName[]) {
      for (const rec of data[c]) await this.upsert(patientId, c, rec as never);
    }
  }

  async clear(patientId: string) {
    await Promise.all(
      (Object.values(TABLES)).map((t) => this.request(`${t}?patient_id=eq.${encodeURIComponent(patientId)}`, { method: "DELETE" })),
    );
  }
}
