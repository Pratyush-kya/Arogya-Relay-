import { rankFacilities, pickEmergencyFacility } from "./ranking.ts";
import { syntheticFacilityAdapter, getCamps, clampBox, inBoundingBox } from "./adapters.ts";
import { SYNTHETIC_FACILITIES } from "./synthetic-data.ts";
import type {
  CampEvent,
  Capabilities,
  Coordinates,
  Facility,
  FacilityType,
  ReferralQuery,
} from "./types.ts";
import { fetchLiveHealthcareFacilities, type LiveFacilityCounts } from "./overpass-adapter.ts";

/**
 * UI controller for Nearby Care. Pures out the data flow so the React component
 * stays presentational and the logic stays testable.
 *
 * In the prototype this always uses the synthetic adapter (no network, no
 * external calls). A production build swaps `loadFacilities` for the real
 * allow-listed adapter; the rest is unchanged.
 */

export interface NearbyFilters {
  types: FacilityType[];
  emergencyOnly: boolean;
  maternity: boolean;
  child: boolean;
  pmjay: boolean;
  accessibility: boolean;
  showUnverified: boolean;
}

export const DEFAULT_FILTERS: NearbyFilters = {
  types: [],
  emergencyOnly: false,
  maternity: false,
  child: false,
  pmjay: false,
  accessibility: false,
  showUnverified: true,
};

function toRequiredCaps(f: NearbyFilters, emergency: boolean): (keyof Capabilities)[] {
  const caps: (keyof Capabilities)[] = [];
  if (emergency) caps.push("emergency");
  if (f.maternity) caps.push("maternity");
  if (f.child) caps.push("paediatrics");
  return caps;
}

/** Load facilities in a box around the origin. */
export async function loadFacilities(origin: Coordinates): Promise<Facility[]> {
  const box = clampBox(origin, 0.5);
  try {
    return await syntheticFacilityAdapter(box);
  } catch {
    return SYNTHETIC_FACILITIES.filter((f) => inBoundingBox(f.coordinates, box));
  }
}

/** Load live OpenStreetMap facilities with fallback. */
export async function loadLiveFacilities(origin: Coordinates): Promise<{ facilities: Facility[]; counts: LiveFacilityCounts; isLive: boolean }> {
  try {
    const live = await fetchLiveHealthcareFacilities(origin);
    return { ...live, isLive: live.facilities.length > 0 };
  } catch {
    return { facilities: [], counts: { hospitals: 0, clinics: 0, pharmacies: 0, total: 0 }, isLive: false };
  }
}



/** Apply UI filters (type + scheme + verification) before ranking. */
export function applyFilters(facilities: Facility[], f: NearbyFilters): Facility[] {
  return facilities.filter((fac) => {
    if (f.types.length > 0 && !f.types.includes(fac.type)) return false;
    if (f.emergencyOnly && !fac.capabilities.emergency) return false;
    if (f.maternity && !fac.capabilities.maternity) return false;
    if (f.child && !fac.capabilities.paediatrics) return false;
    if (f.pmjay && !fac.schemes.includes("pmjay") && !fac.schemes.includes("ayushman")) return false;
    if (!f.showUnverified && fac.verification === "unverified") return false;
    return true;
  });
}

export interface RankedNearby {
  results: ReturnType<typeof rankFacilities>;
  emergencyFacility: Facility | null;
  counts: LiveFacilityCounts;
  isLive: boolean;
}

/** Produce ranked results + an emergency pick for the given origin/filters. */
export async function computeNearby(
  origin: Coordinates,
  filters: NearbyFilters,
  emergency: boolean,
  now: Date = new Date(),
): Promise<RankedNearby> {
  const liveData = await loadLiveFacilities(origin);
  const all = liveData.facilities.length > 0 ? liveData.facilities : await loadFacilities(origin);
  const filtered = applyFilters(all, filters);
  const query: ReferralQuery = {
    origin,
    requiredCapabilities: toRequiredCaps(filters, emergency),
    emergency,
    capabilityFirst: true,
    schemesPreferred: filters.pmjay ? ["pmjay", "ayushman"] : undefined,
  };
  const results = rankFacilities(filtered, query, now);
  const emergencyFacility = emergency ? pickEmergencyFacility(all, origin, now) : null;
  return { results, emergencyFacility, counts: liveData.counts, isLive: liveData.isLive };
}

export async function loadCamps(now: Date = new Date()): Promise<CampEvent[]> {
  return getCamps(now);
}

