/**
 * Arogya Relay — Care Plan & Reminder domain types (Problem Statement 4).
 *
 * FHIR R4-aligned (ABDM-compatible) concepts: MedicationRequest, Medication,
 * CarePlan, Appointment, ServiceRequest, Task, Observation, Patient,
 * Practitioner. These are DEMO TYPES for a frontend prototype; they mirror the
 * shape of FHIR resources but are NOT a conformant FHIR server.
 *
 * SAFETY BOUNDARY (from the brief, non-negotiable):
 *  - Only an authorised doctor may create/approve/change/pause/discontinue a
 *    MedicationRequest. The assistant/Chatbot MAY explain a signed instruction
 *    but NEVER create or modify one.
 *  - The system does not prescribe, change doses, or present a reminder as proof
 *    that medicine was taken.
 *  - PRN/as-needed medicines get NO ordinary scheduled-dose reminders unless the
 *    prescriber explicitly defines safe conditions and limits.
 *  - Ambiguous schedules are BLOCKED and returned to the clinician; the system
 *    never infers a schedule from unclear free text.
 *
 * PROTOTYPE / SYNTHETIC DATA ONLY.
 */

import type { LanguageCode, SafetyTier } from "../i18n/types";

/** Roles permitted in the care-plan workflow. Mirrors `users.role`. */
export type Role = "admin" | "doctor" | "health_worker" | "reviewer" | "patient" | "caregiver";

/** A doctor-signed order is the only authoritative source of a reminder. */
export interface Practitioner {
  id: string;
  role: "doctor" | "admin";
  displayName: string;
  /** Synthetic registration reference only. */
  regNo: string;
}

/** Minimal patient reference (no names/precise location). */
export interface PatientRef {
  id: string;
  reference: string; // e.g. "NR-1049"
  ageGroup: "infant" | "child" | "adolescent" | "adult" | "older_adult";
  pregnant?: boolean;
  allergies: string[]; // active allergy statements (free list, clinician-entered)
}

/** Food relationship for a dose (Tier 1 — preserved exactly). */
export type FoodRelation = "before_food" | "after_food" | "with_food" | "empty_stomach" | "any";

/**
 * Frequency model. `ambiguous` is a deliberate reject state — the clinician must
 * re-author an explicit schedule; the engine never infers one.
 */
export type Frequency =
  | { kind: "once" } // one-time dose
  | { kind: "times_per_day"; times: number } // e.g. 2x/day
  | { kind: "every_hours"; hours: number }
  | { kind: "weekdays"; days: Weekday[] } // specific weekdays
  | { kind: "interval"; everyDays: number } // e.g. every 3 days
  | { kind: "prn"; maxPerDay?: number; condition?: string } // as-needed, no ordinary reminders
  | { kind: "ambiguous" }; // REJECT — never scheduled

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sun..Sat

/** An authored dose within a taper step (descending doses over time). */
export interface TaperStep {
  fromDate: string; // ISO date
  toDate: string; // ISO date
  dose: string; // e.g. "2 tablets"
  timesPerDay: number;
}

export type ReminderChannel = "in_app" | "pwa" | "web_push" | "calendar_ics" | "print";

/** A single medication order — one line of a CarePlan. FHIR MedicationRequest. */
export interface MedicationOrder {
  id: string;
  carePlanId: string;
  patientId: string;
  /** Exact prescribed medicine name/str. NEVER translated or altered. */
  medicine: string;
  strength: string; // e.g. "500 mg" — preserved exactly
  form: string; // e.g. "tablet"
  dose: string; // e.g. "1 tablet"
  route: string; // e.g. "oral"
  frequency: Frequency;
  foodRelation: FoodRelation;
  indication: string; // clinician-authored
  instructions: string; // clinician-authored (Tier 1 if safety-critical)
  startDate: string; // ISO date
  endDate: string; // ISO date
  tapers?: TaperStep[];
  highRisk?: boolean; // clinician-controlled high-risk flag
  /** Approved missed-dose advice stored per order; if absent use default. */
  missedDoseAdvice?: string;
  // Signing (authoritative workflow)
  signedByDoctorId: string | null;
  signedAt: string | null; // ISO
  signature: string | null; // prototype: hash of order payload
  status: "draft" | "active" | "paused" | "discontinued";
  discontinuedReason?: string;
}

export interface CaregiverGrant {
  id: string;
  patientId: string;
  caregiverId: string;
  relationship: string;
  status: "active" | "revoked";
  grantedAt: string;
}

export interface CareItem {
  id: string;
  carePlanId: string;
  patientId: string;
  title: string;
  description?: string;
  scheduledDate: string;
  status: "pending" | "completed" | "cancelled";
}

