import type { Facility, RankedFacilityResult } from "./types.ts";
import { haversineKm } from "./geo.ts";

export interface RankingOptions {
  origin: { lat: number; lng: number };
  requiredCapabilities?: Array<keyof Facility["capabilities"]>;
  capabilityFirst?: boolean;
}

export interface TransitEstimate {
  roadDistanceKm: number;
  roadEtaMin: number;
  trafficCondition: "highway_flow" | "urban_congestion" | "normal";
  detourFactor: number;
}

/**
 * Dynamic, traffic and corridor-aware road transit calculator.
 * Accounts for:
 * 1. Highway corridors (NH-16, Bypass) vs. Dense urban grids (City Center, Old Town)
 * 2. Time-of-day traffic shifts (Peak hours 9-11:30 AM & 5-8:30 PM vs. Night flow 10 PM - 6 AM)
 * 3. Physical detour index instead of naive straight-line haversine.
 */
export function estimateRoadTransit(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
  facility: Facility,
  now: Date = new Date()
): TransitEstimate {
  const d = haversineKm(origin, dest);
  const hour = now.getHours();
  const isNight = hour >= 22 || hour < 6;
  const isPeak = (hour >= 9 && hour <= 11) || (hour >= 17 && hour <= 20);

  const address = (facility.address || "").toLowerCase();
  const name = (facility.name || "").toLowerCase();

  const isHighway =
    facility.corridorType === "highway_corridor" ||
    address.includes("nh-16") ||
    address.includes("national highway") ||
    address.includes("bypass") ||
    address.includes("patrapada") ||
    name.includes("nh-16") ||
    name.includes("dhh");

  const isUrbanCore =
    facility.corridorType === "urban_core" ||
    address.includes("unit 6") ||
    address.includes("ganga nagar") ||
    address.includes("master canteen") ||
    address.includes("old town") ||
    address.includes("rajmahal");

  let detourFactor = 1.25;
  let speedKmH = 35;
  let trafficCondition: "highway_flow" | "urban_congestion" | "normal" = "normal";

  if (isHighway) {
    detourFactor = 1.15;
    speedKmH = isNight ? 65 : 52;
    trafficCondition = "highway_flow";
  } else if (isUrbanCore) {
    detourFactor = 1.45;
    speedKmH = isNight ? 38 : (isPeak ? 18 : 26);
    trafficCondition = isNight ? "normal" : "urban_congestion";
  } else {
    detourFactor = 1.28;
    speedKmH = isNight ? 45 : 34;
    trafficCondition = "normal";
  }

  const roadDistanceKm = Number((d * detourFactor).toFixed(1));
  const roadEtaMin = Math.max(2, Math.round((roadDistanceKm / speedKmH) * 60));

  return { roadDistanceKm, roadEtaMin, trafficCondition, detourFactor };
}

export function rankFacilities(
  facilities: Facility[],
  options: RankingOptions,
  _now?: Date
): RankedFacilityResult[] {
  const { origin, requiredCapabilities = [], capabilityFirst = true } = options;
  const now = _now || new Date();

  const results: RankedFacilityResult[] = [];

  for (const f of facilities) {
    const d = haversineKm(origin, f.coordinates);
    const capabilityMet = requiredCapabilities.every((cap) => Boolean(f.capabilities[cap]));

    if (capabilityFirst && !capabilityMet) {
      continue;
    }

    const transit = estimateRoadTransit(origin, f.coordinates, f, now);
    const isEmergency = Boolean(f.capabilities.emergency);
    const isStabilizationTier =
      f.emergencyTier === "trauma_stabilization" || f.type === "hospital" || f.type === "chc";

    let score = 100 - transit.roadEtaMin;
    if (capabilityMet) score += 20;
    if (isEmergency && isStabilizationTier) score += 15;
    if (transit.trafficCondition === "urban_congestion") score -= 10;

    results.push({
      facility: f,
      distanceKm: d,
      straightLineKm: d,
      roadDistanceKm: transit.roadDistanceKm,
      roadEtaMin: transit.roadEtaMin,
      score,
      capabilityMet,
      emergencyTier:
        f.emergencyTier ||
        (f.capabilities.surgery || f.capabilities.icu ? "apex_tertiary" : "trauma_stabilization"),
      trafficCondition: transit.trafficCondition,
    });
  }

  // Sort by capability first, then by true road ETA ascending (fastest real response time)
  return results.sort((a, b) => {
    if (a.capabilityMet !== b.capabilityMet) {
      return a.capabilityMet ? -1 : 1;
    }
    const etaA = a.roadEtaMin ?? 999;
    const etaB = b.roadEtaMin ?? 999;
    if (etaA !== etaB) {
      return etaA - etaB;
    }
    return a.distanceKm - b.distanceKm;
  });
}

export function pickEmergencyFacility(
  facilities: Facility[],
  origin: { lat: number; lng: number },
  _now?: Date
): Facility | null {
  const now = _now || new Date();
  const emergencyCapable = facilities.filter(
    (f) => f.capabilities.emergency && f.verification === "verified"
  );

  const pool = emergencyCapable.length > 0 ? emergencyCapable : facilities.filter((f) => f.capabilities.emergency);
  if (pool.length === 0) return null;

  // Pick the facility with the shortest true road ETA
  let best = pool[0];
  let bestEta = estimateRoadTransit(origin, best.coordinates, best, now).roadEtaMin;

  for (let i = 1; i < pool.length; i++) {
    const eta = estimateRoadTransit(origin, pool[i].coordinates, pool[i], now).roadEtaMin;
    if (eta < bestEta) {
      bestEta = eta;
      best = pool[i];
    }
  }

  return best;
}

export function pickEmergencyTriage(
  facilities: Facility[],
  origin: { lat: number; lng: number },
  _now?: Date
): {
  primaryStabilization: Facility | null;
  apexReferral: Facility | null;
  fastest: Facility | null;
} {
  const now = _now || new Date();
  const pool = facilities.filter((f) => f.capabilities.emergency);
  if (pool.length === 0) {
    return { primaryStabilization: null, apexReferral: null, fastest: null };
  }

  const withEta = pool.map((f) => ({
    facility: f,
    transit: estimateRoadTransit(origin, f.coordinates, f, now),
  }));

  withEta.sort((a, b) => a.transit.roadEtaMin - b.transit.roadEtaMin);

  const fastest = withEta[0]?.facility || null;

  const stabilizationPool = withEta.filter(
    (item) =>
      item.facility.emergencyTier === "trauma_stabilization" ||
      item.facility.type === "hospital" ||
      item.facility.type === "chc"
  );
  const primaryStabilization = stabilizationPool[0]?.facility || fastest;

  const apexPool = withEta.filter(
    (item) =>
      item.facility.emergencyTier === "apex_tertiary" ||
      (item.facility.capabilities.icu && item.facility.capabilities.surgery)
  );
  const apexReferral = apexPool[0]?.facility || fastest;

  return { primaryStabilization, apexReferral, fastest };
}
