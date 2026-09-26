/**
 * Arogya Spandan — Geospatial Syndromic Outbreak Radar
 *
 * Computes localized cluster density, symptom convergence, and outbreak risk scores
 * from real field screening records. Generates GeoJSON for MapLibre layers.
 */

import type { ScreeningRecord } from "@/lib/supabase/screenings";

export interface VillageCluster {
  village: string;
  lat: number;
  lng: number;
  totalScreenings: number;
  urgentCount: number;
  reviewCount: number;
  clearedCount: number;
  dominantSymptom: string;
  symptomFrequency: Record<string, number>;
  outbreakStatus: "outbreak_warning" | "elevated" | "normal";
  riskScore: number; // 0 to 100
  radiusMeters: number;
  recommendedAction: string;
}

export const VILLAGE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Mawlynnong: { lat: 25.2014, lng: 91.9163 },
  Pynursla: { lat: 25.3092, lng: 91.8973 },
  Umroi: { lat: 25.6883, lng: 91.9304 },
  Mawlong: { lat: 25.2289, lng: 91.8546 },
  Cherrapunji: { lat: 25.2702, lng: 91.7323 },
  Sonapur: { lat: 25.0864, lng: 92.3614 },
  Nongpoh: { lat: 25.9016, lng: 91.8804 },
  Shillong: { lat: 25.5788, lng: 91.8933 },
};

export const DEFAULT_COORDS = { lat: 25.2014, lng: 91.9163 };

export function analyzeOutbreakClusters(records: ScreeningRecord[]): VillageCluster[] {
  const groups: Record<string, ScreeningRecord[]> = {};

  for (const r of records) {
    const v = r.village || "Mawlynnong";
    if (!groups[v]) groups[v] = [];
    groups[v].push(r);
  }

  // Ensure known surveillance villages exist even with 0 records
  for (const vName of Object.keys(VILLAGE_COORDINATES)) {
    if (!groups[vName]) groups[vName] = [];
  }

  const clusters: VillageCluster[] = [];

  for (const [village, vRecords] of Object.entries(groups)) {
    const coords = VILLAGE_COORDINATES[village] || DEFAULT_COORDS;
    const total = vRecords.length;
    const urgent = vRecords.filter((r) => r.urgency_tier === "urgent" || r.urgency_tier === "emergency").length;
    const review = vRecords.filter((r) => r.urgency_tier === "review").length;
    const cleared = total - urgent - review;

    // Count symptom frequencies
    const symCounts: Record<string, number> = {};
    for (const r of vRecords) {
      for (const s of r.symptoms) {
        symCounts[s] = (symCounts[s] || 0) + 1;
      }
    }

    const sortedSyms = Object.entries(symCounts).sort((a, b) => b[1] - a[1]);
    const dominant = sortedSyms[0] ? `${sortedSyms[0][0]} (${sortedSyms[0][1]})` : "None flagged";
    const maxSymClusterCount = sortedSyms[0] ? sortedSyms[0][1] : 0;

    // Outbreak detection threshold:
    // If >= 3 patients report the same symptom or >= 2 urgent cases in the village
    let status: "outbreak_warning" | "elevated" | "normal" = "normal";
    let risk = Math.min(100, total * 5 + urgent * 25 + review * 10);
    let radius = 400;
    let action = "Routine community surveillance active.";

    if (maxSymClusterCount >= 3 || urgent >= 2) {
      status = "outbreak_warning";
      risk = Math.max(75, risk);
      radius = 1200;
      action = `Potential cluster outbreak detected (${dominant}). Dispatch rapid response field team and alert CHC.`;
    } else if (urgent >= 1 || review >= 2 || total >= 3) {
      status = "elevated";
      risk = Math.max(45, risk);
      radius = 800;
      action = "Elevated syndromic signals. Active door-to-door monitoring recommended.";
    }

    clusters.push({
      village,
      lat: coords.lat,
      lng: coords.lng,
      totalScreenings: total,
      urgentCount: urgent,
      reviewCount: review,
      clearedCount: cleared,
      dominantSymptom: dominant,
      symptomFrequency: symCounts,
      outbreakStatus: status,
      riskScore: risk,
      radiusMeters: radius,
      recommendedAction: action,
    });
  }

  // Sort by highest risk first
  return clusters.sort((a, b) => b.riskScore - a.riskScore);
}

/** Convert clusters into a GeoJSON FeatureCollection for MapLibre circle and radar rendering */
export function clustersToGeoJSON(clusters: VillageCluster[]) {
  return {
    type: "FeatureCollection" as const,
    features: clusters.map((c) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [c.lng, c.lat],
      },
      properties: {
        village: c.village,
        total: c.totalScreenings,
        urgent: c.urgentCount,
        status: c.outbreakStatus,
        riskScore: c.riskScore,
        radius: c.radiusMeters,
        dominant: c.dominantSymptom,
        action: c.recommendedAction,
      },
    })),
  };
}
