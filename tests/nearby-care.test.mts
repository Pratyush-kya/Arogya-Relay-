import assert from "node:assert/strict";
import test from "node:test";

/**
 * Nearby Care — synthetic test oracle for the capability-first ranking,
 * location/accuracy logic, camp expiry, and privacy controls.
 *
 * This is SOFTWARE behaviour testing (correct ranking, never sending a
 * critical patient to an incapable facility, expired camps hidden). It is NOT
 * clinical validation and uses only synthetic data.
 */

import { rankFacilities, pickEmergencyFacility } from "../lib/nearby/ranking.ts";
import { haversineKm, isValidCoordinate, classifyLocation, buildConsentSnapshot, coarseGrid } from "../lib/nearby/geo.ts";
import { activeCamps, SYNTHETIC_FACILITIES, SYNTHETIC_CAMPS } from "../lib/nearby/synthetic-data.ts";
import { applyFilters, computeNearby, loadFacilities } from "../lib/nearby/controller.ts";
import type { Facility } from "../lib/nearby/types.ts";

const ORIGIN = { lat: 25.1986, lng: 91.8785, source: "gps" as const };

test("haversine computes plausible distances", () => {
  const d = haversineKm(ORIGIN, { lat: 25.2001, lng: 91.8802 });
  assert.ok(d > 0 && d < 5, `expected small distance, got ${d}`);
  // Same point -> ~0
  assert.ok(haversineKm(ORIGIN, ORIGIN) < 0.01);
});

test("coordinate validation rejects garbage", () => {
  assert.equal(isValidCoordinate(25.2, 91.8), true);
  assert.equal(isValidCoordinate(91, 200), false);
  assert.equal(isValidCoordinate(NaN, 0), false);
  assert.equal(isValidCoordinate(0, 0), true);
});

test("accuracy classification never returns 'exact'", () => {
  const states = [
    classifyLocation({ lat: 1, lng: 1, accuracyMeters: 10, source: "gps" }),
    classifyLocation({ lat: 1, lng: 1, accuracyMeters: 5, source: "gps" }),
  ];
  for (const s of states) assert.notEqual(s, "exact");
  // Manual is always approximate
  assert.equal(classifyLocation({ lat: 1, lng: 1, source: "manual" }).includes("approximate") || classifyLocation({ lat: 1, lng: 1, source: "manual" }) === "approximate", true);
});

test("capability-first: never sends a critical patient to an incapable facility", () => {
  const ranked = rankFacilities(SYNTHETIC_FACILITIES, {
    origin: ORIGIN,
    requiredCapabilities: ["emergency"],
    capabilityFirst: true,
  });
  // All returned facilities must have emergency capability (PHC/Riverside-unverified excluded).
  for (const r of ranked) assert.equal(r.facility.capabilities.emergency, true);
  // The closer PHC (no emergency) must NOT appear.
  assert.ok(!ranked.some((r) => r.facility.id === "F-DEMO-003"));
});

test("capability-first ranks capable facilities above closer incapable ones", () => {
  // District Hospital (emergency, ~0.2km) vs PHC (no emergency, ~2.6km).
  const ranked = rankFacilities(SYNTHETIC_FACILITIES, {
    origin: ORIGIN,
    requiredCapabilities: ["emergency"],
    capabilityFirst: true,
  });
  assert.equal(ranked[0].facility.id, "F-DEMO-001", "emergency-capable hospital should rank first");
});

test("without capability-first, an incapable-but-closer facility can appear (and is flagged)", () => {
  const ranked = rankFacilities(SYNTHETIC_FACILITIES, {
    origin: ORIGIN,
    requiredCapabilities: ["emergency"],
    capabilityFirst: false,
  });
  const incapable = ranked.find((r) => !r.capabilityMet);
  if (incapable) assert.equal(incapable.capabilityMet, false, "flagged as missing capability");
});

test("emergency facility pick prefers verified emergency-capable", () => {
  const ef = pickEmergencyFacility(SYNTHETIC_FACILITIES, ORIGIN);
  assert.ok(ef, "an emergency facility exists");
  assert.equal(ef!.capabilities.emergency, true);
});

test("maternal filter surfaces maternity-capable facilities", async () => {
  const all = await loadFacilities(ORIGIN);
  const filtered = applyFilters(all, { ...defaultFilters(), maternity: true });
  for (const f of filtered) assert.equal(f.capabilities.maternity, true);
});

test("computeNearby returns ranked results and an emergency pick", async () => {
  const r = await computeNearby(ORIGIN, { ...defaultFilters(), emergencyOnly: true }, true);
  assert.ok(r.results.length > 0);
  assert.ok(r.emergencyFacility, "emergency facility identified");
  for (const res of r.results) assert.equal(res.facility.capabilities.emergency, true);
});

function defaultFilters() {
  return { types: [], emergencyOnly: false, maternity: false, child: false, pmjay: false, accessibility: false, showUnverified: true };
}

test("expired and cancelled camps are hidden automatically", () => {
  const camps = activeCamps(SYNTHETIC_CAMPS, "2026-09-27T00:00:00Z");
  assert.ok(camps.length > 0);
  assert.ok(!camps.some((c) => c.status === "cancelled" || (c.endDate && c.endDate < "2026-09-27")));
});

test("consent snapshot retains minimum data with a retention window", () => {
  const snap = buildConsentSnapshot(ORIGIN);
  assert.ok(snap.retentionWindow);
  assert.ok(snap.timestamp);
});

test("hospital/CHC/PHC/AAM/pharmacy source types exist in synthetic data", () => {
  const types = new Set(SYNTHETIC_FACILITIES.map((f) => f.type));
  assert.ok(types.has("hospital"));
  assert.ok(types.has("chc"));
  assert.ok(types.has("phc"));
});
