import type { CollectionName, Role } from "@/data/models";

/**
 * Role-based access rules, mirrored by the row-level-security policies in
 * supabase/schema.sql. The client check is for UX only; the server is the authority.
 */
export type Action = "read" | "write" | "delete" | "export";

const MATRIX: Record<Role, Record<Action, boolean>> = {
  patient: { read: true, write: true, delete: true, export: true },
  // A caregiver the patient invited may view and help record, but not delete or export.
  caregiver: { read: true, write: true, delete: false, export: false },
  // Clinicians see only what the patient shares in a report; they never edit patient-reported entries.
  clinician: { read: true, write: false, delete: false, export: false },
};

export function can(role: Role, action: Action, _collection?: CollectionName): boolean {
  return MATRIX[role][action];
}
