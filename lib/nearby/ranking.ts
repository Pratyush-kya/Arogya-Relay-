import type { Facility, RankedFacilityResult } from "./types.ts";
import { haversineKm } from "./geo.ts";

export interface RankingOptions {
  origin: { lat: number; lng: number };
  requiredCapabilities?: Array<keyof Facility["capabilities"]>;
  capabilityFirst?: boolean;
}

export function rankFacilities(
  facilities: Facility[],
  options: RankingOptions,
  _now?: Date
): RankedFacilityResult[] {
  const { origin, requiredCapabilities = [], capabilityFirst = true } = options;

  const results: RankedFacilityResult[] = [];

  for (const f of facilities) {
    const d = haversineKm(origin, f.coordinates);
    const capabilityMet = requiredCapabilities.every((cap) => Boolean(f.capabilities[cap]));

    if (capabilityFirst && !capabilityMet) {
      continue;
    }

    results.push({
      facility: f,
      distanceKm: d,
      score: capabilityMet ? 100 - d : 10 - d,
      capabilityMet,
    });
  }

  // Sort by capability first, then by distance
  return results.sort((a, b) => {
    if (a.capabilityMet !== b.capabilityMet) {
      return a.capabilityMet ? -1 : 1;
    }
    return a.distanceKm - b.distanceKm;
  });
}

export function pickEmergencyFacility(
  facilities: Facility[],
  origin: { lat: number; lng: number },
  _now?: Date
): Facility | null {
  const emergencyCapable = facilities.filter(
    (f) => f.capabilities.emergency && f.verification === "verified"
  );

  if (emergencyCapable.length === 0) {
    return facilities.find((f) => f.capabilities.emergency) || null;
  }

  let closest = emergencyCapable[0];
  let minD = haversineKm(origin, closest.coordinates);

  for (let i = 1; i < emergencyCapable.length; i++) {
    const d = haversineKm(origin, emergencyCapable[i].coordinates);
    if (d < minD) {
      minD = d;
      closest = emergencyCapable[i];
    }
  }

  return closest;
}
