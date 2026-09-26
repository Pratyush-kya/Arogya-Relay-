/**
 * Arogya Relay care-plan tests (Problem Statement 4).
 * Run via: npm test
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  medicationDueTimes,
  buildReminders,
  resolveConflict,
  activeTaperStep,
  DEFAULT_MISSED_DOSE_ADVICE,
} from "../lib/careplan/scheduling.ts";
import {
  assertCanPrescribe,
  AuthorizationError,
  validateOrderCompleteness,
  isSignable,
  findDuplicateActiveOrders,
  allergyConflict,
  missedDoseAdviceFor,
  caregiverCanReceive,
  signOrderPayload,
} from "../lib/careplan/safety.ts";
import { toICS, toFhirMedicationRequest } from "../lib/careplan/fhir.ts";
import type { MedicationOrder, PatientRef } from "../lib/careplan/types.ts";

const patient: PatientRef = { id: "pt-1", reference: "NR-1", ageGroup: "adult", allergies: ["penicillin"] };
const doctor = { id: "dr-1", role: "doctor" as const };
const baseOrder = (over: Partial<MedicationOrder> = {}): MedicationOrder => ({
  id: "mo-1",
  carePlanId: "cp-1",
  patientId: "pt-1",
  medicine: "Paracetamol",
  strength: "500 mg",
  form: "tablet",
  dose: "1 tablet",
  route: "oral",
  frequency: { kind: "times_per_day", times: 2 },
  foodRelation: "after_food",
  indication: "Fever",
  instructions: "After food",
  startDate: "2026-08-20",
  endDate: "2026-08-27",
  signedByDoctorId: "dr-1",
  signedAt: "2026-08-20T08:00:00",
  signature: "sig",
  status: "active",
  createdAt: "2026-08-20T08:00:00",
  updatedAt: "2026-08-20T08:00:00",
  version: 1,
  ...over,
});
// ── Scheduling (fake clock) ───────────────────────────────────────────────
test("times_per_day produces N daily slots", () => {
  const o = baseOrder({ frequency: { kind: "times_per_day", times: 3 } });
  const due = medicationDueTimes(o, "2026-08-21T00:00:00", "2026-08-21T23:59:59");
  assert.equal(due.length, 3);
  assert.deepEqual(due.map((d) => d.slice(11, 13)), ["09", "15", "21"]);
});

test("assertCanPrescribe throws for non-prescribers", () => {
  assert.throws(() => assertCanPrescribe({ id: "pt-1", role: "patient" as const }), AuthorizationError);
  assert.doesNotThrow(() => assertCanPrescribe({ id: "dr-1", role: "doctor" as const }));
});

test("validateOrderCompleteness rejects ambiguous schedules", () => {
  const amb = baseOrder({ frequency: { kind: "ambiguous" } });
  const res = validateOrderCompleteness(amb);
  assert.equal(res.valid, false);
});

test("isSignable checks completeness and draft status", () => {
  const order = baseOrder({ status: "draft" });
  assert.equal(isSignable(order), true);
});

test("allergyConflict detects allergen match", () => {
  const badOrder = baseOrder({ medicine: "Penicillin V" });
  const conflict = allergyConflict(badOrder, patient);
  assert.ok(conflict);
  const goodOrder = baseOrder({ medicine: "Paracetamol" });
  assert.equal(allergyConflict(goodOrder, patient), null);
});

test("findDuplicateActiveOrders identifies duplicate active medicines", () => {
  const dupes = findDuplicateActiveOrders([
    baseOrder({ id: "1", medicine: "Paracetamol", status: "active" }),
    baseOrder({ id: "2", medicine: "Paracetamol", status: "active" }),
  ]);
  assert.equal(dupes.length, 1);
});

test("toFhirMedicationRequest produces valid FHIR representation", () => {
  const fhir = toFhirMedicationRequest(baseOrder());
  assert.equal(fhir.resourceType, "MedicationRequest");
  assert.equal(fhir.subject.reference, "Patient/pt-1");
});

test("toICS creates iCalendar events", () => {
  const ics = toICS([{ title: "Take Paracetamol", start: "2026-08-21T09:00:00Z" }]);
  assert.ok(ics.includes("BEGIN:VCALENDAR"));
  assert.ok(ics.includes("SUMMARY:Take Paracetamol"));
});
