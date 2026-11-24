import type { CollectionName, PatientData } from "@/data/models";

/**
 * Persistence boundary. UI and app logic only talk to this interface, so the
 * on-device demo adapter can be replaced by a secure backend without UI changes.
 */
export interface DataAdapter {
  readonly kind: "local" | "supabase";
  load(patientId: string): Promise<PatientData | null>;
  upsert<C extends CollectionName>(patientId: string, collection: C, record: PatientData[C][number]): Promise<void>;
  remove(patientId: string, collection: CollectionName, id: string): Promise<void>;
  replaceAll(patientId: string, data: PatientData): Promise<void>;
  clear(patientId: string): Promise<void>;
}

export const EMPTY_DATA: PatientData = {
  pain: [], medications: [], doses: [], injections: [], exercise: [], meals: [], appointments: [], reminders: [],
};

export class StorageError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "StorageError";
  }
}
