/**
 * Arogya Relay — Care Plan safety & authorization (Problem Statement 4).
 *
 * Enforces the authoritative clinician workflow and medication-safety controls
 * from the brief. These functions are pure and unit-tested; the UI/API layer
 * calls them before mutating state.
 *
 * PROTOTYPE / SYNTHETIC DATA ONLY.
 */

import type {
  CaregiverGrant,
  MedicationOrder,
  PatientRef,
  Role,
} from "./types.ts";
import { DEFAULT_MISSED_DOSE_ADVICE } from "./scheduling.ts";

/** Roles allowed to create/approve/modify/discontinue a MedicationRequest. */
const PRESCRIBER_ROLES: Role[] = ["doctor", "admin"];

export function canPrescribe(actor: { role: Role }): boolean {
  return PRESCRIBER_ROLES.includes(actor.role);
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Throw unless the actor may author/modify a prescription instruction. */
export function assertCanPrescribe(actor: { id: string; role: Role }): void {
  if (!canPrescribe(actor)) {
    throw new AuthorizationError(
      "Only an authorised doctor may create, approve, change, pause or discontinue a prescription instruction.",
    );
  }
}

/** The chatbot/assistant is NEVER allowed to mutate a MedicationRequest. */
export function assertNotAssistant(actor: { role: Role }): void {
  if (actor.role === "patient" || actor.role === "caregiver" || actor.role === "health_worker") {
    throw new AuthorizationError("The assistant cannot create or modify a MedicationRequest.");
  }
}

// ---------------------------------------------------------------------------
// Completeness & ambiguity (block unclear schedules, return to clinician)

export function validateOrderCompleteness(order: MedicationOrder): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!order.medicine?.trim()) errors.push("Medicine name required");
  if (!order.dose?.trim()) errors.push("Dose required");
  if (!order.route?.trim()) errors.push("Route required");
  if (order.frequency.kind === "ambiguous") errors.push("Ambiguous frequency not allowed");
  if (!order.startDate || !order.endDate) errors.push("Start and end date required");
  return { valid: errors.length === 0, errors };
}

export function isSignable(order: MedicationOrder): boolean {
  return validateOrderCompleteness(order).valid && order.status === "draft";
}

export function findDuplicateActiveOrders(orders: MedicationOrder[]): MedicationOrder[] {
  const seen = new Set<string>();
  const duplicates: MedicationOrder[] = [];
  for (const o of orders) {
    if (o.status !== "active") continue;
    const key = o.medicine.toLowerCase().trim();
    if (seen.has(key)) {
      duplicates.push(o);
    } else {
      seen.add(key);
    }
  }
  return duplicates;
}

export function allergyConflict(order: MedicationOrder, patient: PatientRef): string | null {
  const med = order.medicine.toLowerCase();
  for (const allergy of patient.allergies || []) {
    if (med.includes(allergy.toLowerCase()) || allergy.toLowerCase().includes(med)) {
      return `Potential allergy conflict: ${order.medicine} matches recorded allergy ${allergy}`;
    }
  }
  return null;
}

export function missedDoseAdviceFor(order: MedicationOrder): string {
  return order.missedDoseAdvice || DEFAULT_MISSED_DOSE_ADVICE;
}

export function caregiverCanReceive(grant: CaregiverGrant): boolean {
  return grant.status === "active";
}

export function signOrderPayload(
  order: MedicationOrder,
  doctor: { id: string }
): { signedByDoctorId: string; signedAt: string; signature: string; status: "active" } {
  const signedAt = new Date().toISOString();
  return {
    signedByDoctorId: doctor.id,
    signedAt,
    signature: `sig-${doctor.id}-${order.id}`,
    status: "active",
  };
}
