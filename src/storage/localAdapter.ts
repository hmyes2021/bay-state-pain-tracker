import type { CollectionName, PatientData } from "@/data/models";
import { EMPTY_DATA, StorageError, type DataAdapter } from "./types";

const key = (patientId: string) => `pain-tracker:v1:data:${patientId}`;

/**
 * On-device demo storage (localStorage). Data never leaves the browser.
 * Not encrypted at rest — suitable for fictional demo data only.
 */
export class LocalAdapter implements DataAdapter {
  readonly kind = "local" as const;
  constructor(private readonly storage: Storage = window.localStorage) {}

  private read(patientId: string): PatientData | null {
    try {
      const raw = this.storage.getItem(key(patientId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<PatientData>;
      return { ...EMPTY_DATA, ...parsed };
    } catch (e) {
      throw new StorageError("Saved data on this device could not be read.", e);
    }
  }

  private write(patientId: string, data: PatientData) {
    try {
      this.storage.setItem(key(patientId), JSON.stringify(data));
    } catch (e) {
      throw new StorageError("This device is out of storage space for Pain Tracker. Export and delete older records, then try again.", e);
    }
  }

  async load(patientId: string) {
    return this.read(patientId);
  }

  async upsert<C extends CollectionName>(patientId: string, collection: C, record: PatientData[C][number]) {
    const data = this.read(patientId) ?? structuredClone(EMPTY_DATA);
    const list = data[collection] as Array<{ id: string }>;
    const i = list.findIndex((r) => r.id === (record as { id: string }).id);
    if (i >= 0) list[i] = record as { id: string };
    else list.push(record as { id: string });
    this.write(patientId, data);
  }

  async remove(patientId: string, collection: CollectionName, id: string) {
    const data = this.read(patientId);
    if (!data) return;
    (data[collection] as Array<{ id: string }>) = (data[collection] as Array<{ id: string }>).filter((r) => r.id !== id);
    this.write(patientId, data);
  }

  async replaceAll(patientId: string, data: PatientData) {
    this.write(patientId, data);
  }

  async clear(patientId: string) {
    this.storage.removeItem(key(patientId));
  }
}
