import type { CampEvent, Coordinates, Facility, VerificationStatus } from "./types.ts";
import { isValidCoordinate } from "./geo.ts";
import { SYNTHETIC_FACILITIES, SYNTHETIC_CAMPS, activeCamps } from "./synthetic-data.ts";

/**
 * Source adapters + verification model for Nearby Care.
 *
 * Priority order (per the brief):
 *   1. ABDM Health Facility Registry      (verified facility identity)
 *   2. State/UT NHM directories
 *   3. PM-JAY empanelled hospitals
 *   4. District health administration feeds
 *   5. data.gov.in datasets
 *   6. OpenStreetMap (geometry/road context only)
 *
 * In this prototype, adapters return the SYNTHETIC dataset so the system is
 * fully exercisable offline with no live calls. Each adapter records source,
 * external ID, fetched/verified time, expiry and per-field provenance. HFR
 * registration is NOT treated as proof a facility is open or has beds — the UI
 * shows "call to confirm" unless verified-live information exists (it does not
 * in the demo).
 *
 * Ingestion is SSRF-protected: only allow-listed hosts may be contacted, and
 * any coordinate/phone/URL is validated. In the prototype no external fetch is
 * performed by default.
 */

export const FACILITY_SOURCE_PRIORITY = [
  "abdm_hfr",
  "state_nhm",
  "pmjay",
  "district",
  "data_gov",
  "openstreetmap",
] as const;

/** An adapter returns facilities for a bounding box. */
export type FacilityAdapter = (box: BoundingBox) => Promise<Facility[]>;

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export function inBoundingBox(c: Coordinates, box: BoundingBox): boolean {
  return (
    c.lat >= box.minLat && c.lat <= box.maxLat && c.lng >= box.minLng && c.lng <= box.maxLng
  );
}

/** Clamp a bounding box to a sane radius so we never fetch all-India data. */
export function clampBox(center: Coordinates, radiusDeg = 0.5): BoundingBox {
  return {
    minLat: center.lat - radiusDeg,
    maxLat: center.lat + radiusDeg,
    minLng: center.lng - radiusDeg,
    maxLng: center.lng + radiusDeg,
  };
}

/**
 * Verify a fetched facility record. HFR registration alone is "verified" only
 * for identity, not for live open/beds — callers must show "call to confirm".
 */
export function assessVerification(
  fetchedAt: string,
  maxAgeDays = 365,
  now: Date = new Date(),
): VerificationStatus {
  const ageDays = (now.getTime() - new Date(fetchedAt).getTime()) / 86400000;
  if (ageDays > maxAgeDays) return "stale";
  return "verified";
}

/**
 * Default facility adapter — returns synthetic facilities inside the box.
 * A production adapter would call the allow-listed source and validate every
 * field; the shape returned is identical so the rest of the system is unchanged.
 */
export const syntheticFacilityAdapter: FacilityAdapter = async (box) =>
  SYNTHETIC_FACILITIES.filter((f) => inBoundingBox(f.coordinates, box));

/**
 * Default camp adapter — returns active (non-expired, non-cancelled) synthetic
 * camps. Expired/cancelled camps are hidden automatically.
 */
export async function getCamps(now: Date = new Date()): Promise<CampEvent[]> {
  return activeCamps(SYNTHETIC_CAMPS, now.toISOString());
}

/** Validate an external facility record before it enters storage. */
export function validateFacilityRecord(rec: Partial<Facility>): rec is Facility {
  if (!rec.id || !rec.name || !rec.type) return false;
  if (!rec.coordinates || !isValidCoordinate(rec.coordinates.lat, rec.coordinates.lng)) return false;
  if (!rec.capabilities) return false;
  if (rec.phone && !/^[+\d][\d\s-]{6,15}$/.test(rec.phone)) return false;
  if (rec.sourceUrl && !/^https?:\/\//i.test(rec.sourceUrl)) return false;
  return true;
}
