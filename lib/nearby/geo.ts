export interface GeoPoint {
  lat: number;
  lng: number;
  accuracyMeters?: number;
  source?: "gps" | "manual" | "approximate";
}

export function haversineKm(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
  const R = 6371; // Earth radius in km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function classifyLocation(point: GeoPoint): "accurate" | "approximate" | "stale" | "denied" | "unavailable" {
  if (point.source === "manual" || (point.accuracyMeters && point.accuracyMeters > 50)) {
    return "approximate";
  }
  return "accurate";
}

export function coarseGrid(point: { lat: number; lng: number }): string {
  return `${point.lat.toFixed(2)},${point.lng.toFixed(2)}`;
}

export function buildConsentSnapshot(
  point: GeoPoint,
  _opts?: { retentionDays?: number }
) {
  return {
    latitude: point.lat,
    longitude: point.lng,
    accuracy: point.accuracyMeters || 10,
    timestamp: new Date().toISOString(),
    retentionWindow: "30_days",
  };
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

export function formatEta(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

