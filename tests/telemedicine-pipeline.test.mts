import test from "node:test";
import assert from "node:assert/strict";
import { generateQRCodeMatrix } from "../lib/qr/qr-encoder.ts";
import {
  getAvailableDoctors,
  setDoctorAvailability,
  routeCaseToAvailableDoctor,
} from "../lib/telemedicine/doctor-pool.ts";
import {
  createConsultationEscrow,
  settleDoctorEscrow,
  settleChemistEscrow,
  getLocalEscrows,
} from "../lib/payments/escrow-engine.ts";
import { hasRole } from "../lib/auth.ts";

test("generateQRCodeMatrix produces valid square matrix with finder patterns", () => {
  const payload = JSON.stringify({ p: "PT-1001", a: 34, t: 37.2, o: 98 });
  const matrix = generateQRCodeMatrix(payload);

  assert.ok(Array.isArray(matrix), "QR matrix should be an array");
  assert.ok(matrix.length >= 21, "QR matrix minimum dimension is 21x21 (Version 1)");
  assert.strictEqual(matrix.length, matrix[0].length, "QR matrix must be perfectly square");

  // Top-left finder pattern verification (7x7 outer square, 3x3 inner square)
  assert.strictEqual(matrix[0][0], true, "Top-left outer corner must be dark");
  assert.strictEqual(matrix[0][6], true, "Top-left outer corner must be dark");
  assert.strictEqual(matrix[6][0], true, "Top-left outer corner must be dark");
  assert.strictEqual(matrix[6][6], true, "Top-left outer corner must be dark");
  assert.strictEqual(matrix[3][3], true, "Top-left center must be dark");
  assert.strictEqual(matrix[1][1], false, "Finder separator must be light");
});

test("Doctor pool tracks availability and routes cases with 90s TTL", async () => {
  const doctors = await getAvailableDoctors();
  assert.ok(doctors.length > 0, "At least one verified doctor should be available in pool");

  const routeRes = await routeCaseToAvailableDoctor("SCR-TEST-001", "PT-1001", "urgent");
  assert.strictEqual(routeRes.success, true, "Routing must succeed for available doctor");
  assert.ok(routeRes.assignedDoctor, "Doctor must be assigned");

  // Check 90s TTL expiration timestamp
  const now = Date.now();
  const expireTime = new Date(routeRes.expiresAt).getTime();
  const diffSec = Math.round((expireTime - now) / 1000);
  assert.ok(diffSec >= 85 && diffSec <= 95, `TTL should be ~90 seconds, got ${diffSec}s`);
});

test("Escrow ledger enforces zero-loss platform fee and single-use settlement", () => {
  const escrow = createConsultationEscrow({
    caseId: "CASE-999",
    patientRef: "PT-999",
    doctorId: "doc-rajesh-01",
    doctorFeeInr: 50,
    medicineEstimateInr: 40,
  });

  assert.strictEqual(escrow.doctorFeeInr, 50);
  assert.strictEqual(escrow.platformConvenienceFeeInr, 10, "Platform fee must be ₹10 buffer");
  assert.strictEqual(escrow.totalPaidByPatientInr, 100);
  assert.strictEqual(escrow.status, "held_in_escrow");

  // Doctor consultation sign-off
  const settledDoctor = settleDoctorEscrow("CASE-999");
  assert.ok(settledDoctor);
  assert.strictEqual(settledDoctor?.status, "doctor_settled");

  // Chemist dispensation
  const firstDispense = settleChemistEscrow("CASE-999", "CHEM-JAN-AUSHADHI-01");
  assert.strictEqual(firstDispense.success, true);
  assert.strictEqual(firstDispense.tx?.status, "dispensed_completed");

  // Second dispensation attempt must be blocked (Burn token protection)
  const secondDispense = settleChemistEscrow("CASE-999", "CHEM-ROGUE-02");
  assert.strictEqual(secondDispense.success, false, "Duplicate dispensation must be rejected");
});

test("Auth RBAC: Non-clinician admin cannot sign doctor prescriptions", () => {
  const adminActor = { role: "admin" as const, actorId: "admin-1" };
  const doctorActor = { role: "doctor" as const, actorId: "doc-1" };
  const healthWorkerActor = { role: "health_worker" as const, actorId: "hw-1" };

  // Only doctor role may sign medical orders
  assert.strictEqual(hasRole(doctorActor, "doctor"), true, "Doctor can sign");
  assert.strictEqual(hasRole(adminActor, "doctor"), false, "Admin without medical license CANNOT sign");
  assert.strictEqual(hasRole(healthWorkerActor, "doctor"), false, "Health worker CANNOT sign");

  // Admin gates are accessible to admin
  assert.strictEqual(hasRole(adminActor, "admin"), true);
  assert.strictEqual(hasRole(doctorActor, "admin"), false);
});
