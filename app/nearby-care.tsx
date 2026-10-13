"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  classifyLocation,
  formatDistance,
  formatEta,
  isValidCoordinate,
  buildConsentSnapshot,
} from "@/lib/nearby/geo";
import {
  DEFAULT_FILTERS,
  computeNearby,
  type NearbyFilters,
} from "@/lib/nearby/controller";
import {
  type Facility,
  type FacilityType,
  type LocationState,
  type ReferralResult,
} from "@/lib/nearby/types";
import type { LiveFacilityCounts } from "@/lib/nearby/overpass-adapter";
import { REGION_CENTER } from "@/lib/nearby/synthetic-data";
import { useLanguage } from "@/lib/i18n/provider";
import {
  DistrictHealthCamp,
  getRegisteredDistricts,
  searchCampsByDistrict,
} from "@/lib/nearby/district-camps";

export const LOCATION_PRESETS = [
  { id: "ganjam_berhampur", label: "Berhampur, Ganjam", sub: "MKCG Medical College & Hospitals", district: "Ganjam", lat: 19.3149, lng: 84.7941 },
  { id: "ganjam_chhatrapur", label: "Chhatrapur, Ganjam", sub: "Sub-Divisional Hospital & Coastal Area", district: "Ganjam", lat: 19.3524, lng: 84.9873 },
  { id: "bhubaneswar", label: "Bhubaneswar, Khordha", sub: "Capital Hospital & AIIMS", district: "Khordha", lat: 20.2648, lng: 85.8281 },
  { id: "cuttack", label: "Cuttack", sub: "SCB Medical College & Sishu Bhawan", district: "Cuttack", lat: 20.4780, lng: 85.8850 },
  { id: "mayurbhanj_baripada", label: "Baripada, Mayurbhanj", sub: "PRM Medical College & Rural Blocks", district: "Mayurbhanj", lat: 21.9320, lng: 86.7280 },
  { id: "pynursla", label: "Pynursla Block", sub: "Mawlynnong Community CHC Zone", district: "East Khasi Hills", lat: 25.3082, lng: 91.9022 },
  { id: "shillong", label: "Shillong", sub: "Civil Hospital & NEIGRIHMS", district: "East Khasi Hills", lat: 25.5788, lng: 91.8933 },
  { id: "delhi", label: "New Delhi", sub: "AIIMS & Safdarjung Hospital Hub", district: "New Delhi", lat: 28.5672, lng: 77.2100 },
];

export default function NearbyCare() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<"list" | "map">("list");
  const [categoryView, setCategoryView] = useState<"all" | "hospitals" | "pharmacies" | "camps">("all");
  const [locState, setLocState] = useState<LocationState>("approximate");
  const [pos, setPos] = useState<{ lat: number; lng: number; accuracy?: number } | null>({
    lat: 19.3149,
    lng: 84.7941,
    accuracy: 350,
  });
  const [selectedPreset, setSelectedPreset] = useState("ganjam_berhampur");
  const [activeDistrict, setActiveDistrict] = useState("Ganjam");
  const [customDistrictSearch, setCustomDistrictSearch] = useState("");
  const [locNote, setLocNote] = useState("Showing facilities for Berhampur, Ganjam perimeter.");
  const [consent, setConsent] = useState(true);
  const [filters, setFilters] = useState<NearbyFilters>(DEFAULT_FILTERS);
  const [emergency, setEmergency] = useState(false);
  const [results, setResults] = useState<ReferralResult[]>([]);
  const [emergencyFacility, setEmergencyFacility] = useState<Facility | null>(null);
  const [liveCounts, setLiveCounts] = useState<LiveFacilityCounts | null>(null);
  const [isLiveOnline, setIsLiveOnline] = useState(false);
  const [districtCamps, setDistrictCamps] = useState<DistrictHealthCamp[]>([]);

  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Available districts from the verified registry
  const registeredDistricts = useMemo(() => getRegisteredDistricts(), []);

  // Update district health camps whenever activeDistrict changes
  useEffect(() => {
    const matched = searchCampsByDistrict(activeDistrict, "all");
    setDistrictCamps(matched);
  }, [activeDistrict]);

  // Request browser GPS position
  const acquire = useCallback(() => {
    setConsent(true);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocState("unavailable");
      setPos({ ...REGION_CENTER });
      setLocNote("Device GPS is not supported in this browser.");
      return;
    }
    setLocState("acquiring");
    setLocNote("Acquiring high-accuracy GPS fix from device...");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const coords = {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
          capturedAt: new Date().toISOString(),
          source: "gps" as const,
        };
        setPos({ lat: coords.lat, lng: coords.lng, accuracy: coords.accuracy });
        setLocState(classifyLocation(coords));
        setSelectedPreset("custom");
        setLocNote(
          coords.accuracy && coords.accuracy > 500
            ? `Device GPS fix acquired (approx ±${Math.round(coords.accuracy)} m).`
            : `Accurate device GPS fix acquired (±${Math.round(coords.accuracy ?? 0)} m).`,
        );
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocState("denied");
          setLocNote("Location access was denied. You can select your district from the dropdown below.");
        } else {
          setLocState("unavailable");
          setLocNote("GPS location timed out. Selected district is active.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  const setPreset = useCallback((presetId: string) => {
    const p = LOCATION_PRESETS.find((x) => x.id === presetId);
    if (!p) return;
    setSelectedPreset(presetId);
    setActiveDistrict(p.district);
    setPos({ lat: p.lat, lng: p.lng, accuracy: 200 });
    setLocState("approximate");
    setLocNote(`Location set to ${p.label} (${p.district} District)`);
  }, []);

  const handleDistrictChange = useCallback((districtName: string) => {
    setActiveDistrict(districtName);
    const preset = LOCATION_PRESETS.find((p) => p.district.toLowerCase() === districtName.toLowerCase());
    if (preset) {
      setSelectedPreset(preset.id);
      setPos({ lat: preset.lat, lng: preset.lng, accuracy: 250 });
      setLocNote(`Location updated to ${preset.label}`);
    } else {
      setSelectedPreset("custom_district");
      setLocNote(`Showing health camps and care for ${districtName} District.`);
    }
  }, []);

  // Compute nearby facilities via overpass / synthetic adapters
  useEffect(() => {
    if (!pos) return;
    let cancelled = false;
    const origin = { lat: pos.lat, lng: pos.lng, accuracyMeters: pos.accuracy, source: "gps" as const };
    computeNearby(origin, filters, emergency)
      .then((r) => {
        if (cancelled) return;
        setResults(r.results);
        setEmergencyFacility(r.emergencyFacility);
        setLiveCounts(r.counts);
        setIsLiveOnline(r.isLive);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pos, filters, emergency]);

  // Split results into hospitals vs medicine stores
  const hospitalsAndClinics = useMemo(() => {
    return results.filter((r) => r.facility.type !== "pharmacy");
  }, [results]);

  const medicineStores = useMemo(() => {
    return results.filter((r) => r.facility.type === "pharmacy");
  }, [results]);

  const nearestHospital = hospitalsAndClinics[0] ?? null;
  const nearestMedicineStore = medicineStores[0] ?? null;

  // Safe MapLibre GL setup
  useEffect(() => {
    if (tab !== "map" || !mapContainer.current || mapRef.current) return;
    try {
      const center: [number, number] = pos ? [pos.lng, pos.lat] : [REGION_CENTER.lng, REGION_CENTER.lat];
      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: [
                "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
                "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
              ],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors",
            },
          },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        },
        center,
        zoom: 12,
      });

      map.addControl(new maplibregl.NavigationControl(), "top-right");

      map.on("load", () => {
        try {
          if (!map.getSource("me") && pos) {
            const acc = pos.accuracy && pos.accuracy > 0 ? pos.accuracy : 200;
            map.addSource("me", {
              type: "geojson",
              data: {
                type: "FeatureCollection",
                features: [
                  { type: "Feature", geometry: { type: "Point", coordinates: [pos.lng, pos.lat] }, properties: {} },
                  { type: "Feature", geometry: { type: "Point", coordinates: [pos.lng, pos.lat] }, properties: { radius: acc } },
                ],
              },
            });
            map.addLayer({
              id: "me-circle",
              type: "circle",
              source: "me",
              paint: {
                "circle-radius": 12,
                "circle-color": "#17644f",
                "circle-opacity": 0.25,
                "circle-stroke-width": 2,
                "circle-stroke-color": "#17644f",
              },
            });
          }
        } catch (e) {
          console.warn("MapLibre layer warning:", e);
        }
      });

      mapRef.current = map;
      return () => {
        try {
          map.remove();
        } catch {}
        mapRef.current = null;
      };
    } catch (err) {
      console.warn("MapLibre init warning:", err);
      setTab("list");
    }
  }, [tab, pos]);

  // Update map center when coordinates change
  useEffect(() => {
    if (!mapRef.current || !pos) return;
    try {
      const map = mapRef.current;
      map.setCenter([pos.lng, pos.lat]);
      if (map.isStyleLoaded() && map.getSource("me")) {
        const acc = pos.accuracy && pos.accuracy > 0 ? pos.accuracy : 200;
        const fc = {
          type: "FeatureCollection" as const,
          features: [
            { type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [pos.lng, pos.lat] }, properties: {} },
            { type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [pos.lng, pos.lat] }, properties: { radius: acc } },
          ],
        };
        (map.getSource("me") as maplibregl.GeoJSONSource).setData(fc);
      }
    } catch (e) {
      console.warn("Map position update warning:", e);
    }
  }, [pos]);

  return (
    <div className="page-content section-page" style={{ maxWidth: "1100px", margin: "0 auto", padding: "16px 20px 48px" }}>
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="page-heading" style={{ marginBottom: "20px" }}>
        <div>
          <span className="eyebrow" style={{ color: "#047857", fontWeight: 800 }}>
            📍 RURAL &amp; DISTRICT HEALTHCARE FINDER
          </span>
          <h1 style={{ fontSize: "24px", fontWeight: 800, margin: "4px 0" }}>
            Hospitals, Medicine Stores &amp; Health Camps Nearby
          </h1>
          <p style={{ color: "var(--muted, #64748b)", margin: 0, fontSize: "14px" }}>
            Identify nearest 24/7 hospitals, subsidized Jan Aushadhi medicine shops, and ongoing free health checkup camps in your area.
          </p>
        </div>
      </div>

      {/* ── Emergency 112 Banner ─────────────────────────────────────────────── */}
      <div
        className="cg-emergency"
        role="alert"
        style={{
          background: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)",
          color: "#ffffff",
          borderRadius: "14px",
          padding: "16px 20px",
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          boxShadow: "0 4px 14px rgba(153, 27, 27, 0.2)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>🚨</span>
            <strong style={{ fontSize: "16px" }}>Life-Threatening Medical Emergency?</strong>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "13px", opacity: 0.95 }}>
            National Ambulance Hotline: Dial 112 directly for immediate government dispatch.
            {nearestHospital && (
              <span style={{ display: "block", marginTop: "2px", fontWeight: 600 }}>
                Nearest Emergency Center: {nearestHospital.facility.name} ({formatDistance(nearestHospital.straightLineKm)} away)
              </span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <a
            href="tel:112"
            style={{
              background: "#ffffff",
              color: "#991b1b",
              padding: "10px 20px",
              borderRadius: "8px",
              fontWeight: 800,
              fontSize: "14px",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>📞</span> Call 112 Now
          </a>
          {nearestHospital?.facility.phone && (
            <a
              href={`tel:${nearestHospital.facility.phone}`}
              style={{
                background: "rgba(255,255,255,0.2)",
                color: "#ffffff",
                padding: "10px 16px",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "13px",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                border: "1px solid rgba(255,255,255,0.4)",
              }}
            >
              <span>🏥</span> Call Nearest Hospital
            </a>
          )}
        </div>
      </div>

      {/* ── STEP 1: Location Control (GPS + District Dropdown) ────────────────── */}
      <section
        style={{
          background: "var(--surface, #ffffff)",
          border: "1.5px solid var(--border, #e2e8f0)",
          borderRadius: "16px",
          padding: "20px",
          marginBottom: "20px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
        }}
        aria-label="Location Selection"
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "14px" }}>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "#047857", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              STEP 1 · CHOOSE YOUR LOCATION
            </span>
            <h2 style={{ fontSize: "18px", fontWeight: 800, margin: "2px 0 4px", color: "var(--foreground, #0f172a)" }}>
              📍 Where are you located right now?
            </h2>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--muted, #64748b)" }}>
              Select your district or click &quot;Auto-Detect GPS&quot; to see hospitals, pharmacies, and camps near you.
            </p>
          </div>

          <button
            type="button"
            onClick={acquire}
            style={{
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              padding: "10px 18px",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)",
            }}
          >
            <span>🎯</span> Auto-Detect My GPS
          </button>
        </div>

        {/* Quick Regional Presets */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
          {LOCATION_PRESETS.map((p) => {
            const active = selectedPreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                style={{
                  background: active ? "#047857" : "var(--surface-muted, #f8fafc)",
                  color: active ? "#ffffff" : "var(--foreground, #334155)",
                  border: active ? "1.5px solid #047857" : "1px solid var(--border, #cbd5e1)",
                  borderRadius: "20px",
                  padding: "6px 14px",
                  fontSize: "12px",
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{p.label}</span>
                {active && <span style={{ fontSize: "11px" }}>✓</span>}
              </button>
            );
          })}
        </div>

        {/* Search & Custom District Selector */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "12px",
            background: "var(--surface-muted, #f8fafc)",
            padding: "12px 16px",
            borderRadius: "12px",
            border: "1px solid var(--border, #e2e8f0)",
          }}
        >
          <div>
            <label style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
              SELECT FROM ALL REGISTERED DISTRICTS:
            </label>
            <select
              value={activeDistrict}
              onChange={(e) => handleDistrictChange(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border, #cbd5e1)",
                background: "var(--surface, #ffffff)",
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--foreground)",
                cursor: "pointer",
              }}
            >
              {registeredDistricts.map((d) => (
                <option key={d.district} value={d.district}>
                  {d.district} ({d.state})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
              OR TYPE CUSTOM DISTRICT NAME:
            </label>
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                type="text"
                placeholder="e.g. Sambalpur, Puri, Guwahati, Pune..."
                value={customDistrictSearch}
                onChange={(e) => setCustomDistrictSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customDistrictSearch.trim()) {
                    handleDistrictChange(customDistrictSearch.trim());
                  }
                }}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border, #cbd5e1)",
                  background: "var(--surface, #ffffff)",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (customDistrictSearch.trim()) {
                    handleDistrictChange(customDistrictSearch.trim());
                  }
                }}
                style={{
                  background: "#0284c7",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Telemetry Status Note */}
        <div style={{ marginTop: "10px", fontSize: "12px", color: "var(--muted)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
          <span>
            📍 <strong>Active Focus:</strong> {activeDistrict} District · <span>{locNote}</span>
          </span>
          <span style={{ fontWeight: 600, color: "#047857" }}>
            ✓ Verified Registry &amp; OpenStreetMap Synced
          </span>
        </div>
      </section>

      {/* ── STEP 2: SUMMARY AT A GLANCE (3 Big Metrics) ────────────────────── */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "14px",
          marginBottom: "20px",
        }}
        aria-label="Healthcare Facility Counts"
      >
        {/* Metric 1: Hospitals Found */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setCategoryView("hospitals")}
          onKeyDown={(e) => { if (e.key === "Enter") setCategoryView("hospitals"); }}
          style={{
            background: categoryView === "hospitals" ? "#fef2f2" : "var(--surface, #ffffff)",
            border: categoryView === "hospitals" ? "2px solid #ef4444" : "1.5px solid var(--border, #e2e8f0)",
            borderRadius: "14px",
            padding: "18px",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ fontSize: "32px", background: "#fee2e2", padding: "10px", borderRadius: "12px" }}>
            🏥
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <strong style={{ fontSize: "22px", fontWeight: 800, color: "#991b1b" }}>
                {hospitalsAndClinics.length}
              </strong>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--foreground)" }}>
                Hospitals &amp; Clinics
              </span>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted)" }}>
              {nearestHospital
                ? `Nearest: ${nearestHospital.facility.name.slice(0, 26)}... (${formatDistance(nearestHospital.straightLineKm)})`
                : "No hospitals found in perimeter."}
            </p>
          </div>
        </div>

        {/* Metric 2: Medicine Stores Found */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setCategoryView("pharmacies")}
          onKeyDown={(e) => { if (e.key === "Enter") setCategoryView("pharmacies"); }}
          style={{
            background: categoryView === "pharmacies" ? "#f0fdf4" : "var(--surface, #ffffff)",
            border: categoryView === "pharmacies" ? "2px solid #10b981" : "1.5px solid var(--border, #e2e8f0)",
            borderRadius: "14px",
            padding: "18px",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ fontSize: "32px", background: "#dcfce7", padding: "10px", borderRadius: "12px" }}>
            💊
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <strong style={{ fontSize: "22px", fontWeight: 800, color: "#166534" }}>
                {medicineStores.length}
              </strong>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--foreground)" }}>
                Jan Aushadhi &amp; Pharmacies
              </span>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted)" }}>
              {nearestMedicineStore
                ? `Nearest: ${nearestMedicineStore.facility.name.slice(0, 26)}... (${formatDistance(nearestMedicineStore.straightLineKm)})`
                : "Jan Aushadhi generic stores"}
            </p>
          </div>
        </div>

        {/* Metric 3: Health Camps Found */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setCategoryView("camps")}
          onKeyDown={(e) => { if (e.key === "Enter") setCategoryView("camps"); }}
          style={{
            background: categoryView === "camps" ? "#eff6ff" : "var(--surface, #ffffff)",
            border: categoryView === "camps" ? "2px solid #3b82f6" : "1.5px solid var(--border, #e2e8f0)",
            borderRadius: "14px",
            padding: "18px",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ fontSize: "32px", background: "#dbeafe", padding: "10px", borderRadius: "12px" }}>
            🏕️
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <strong style={{ fontSize: "22px", fontWeight: 800, color: "#1e40af" }}>
                {districtCamps.length}
              </strong>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--foreground)" }}>
                Active / Upcoming Camps
              </span>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted)" }}>
              Free OPD, eye surgery &amp; medicines in {activeDistrict}
            </p>
          </div>
        </div>
      </section>

      {/* ── STEP 3: CATEGORY FILTER TABS & VIEW TOGGLE ─────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        {/* Category Pills */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
          <button
            type="button"
            onClick={() => setCategoryView("all")}
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              border: categoryView === "all" ? "2px solid #047857" : "1px solid var(--border, #cbd5e1)",
              background: categoryView === "all" ? "#047857" : "var(--surface, #ffffff)",
              color: categoryView === "all" ? "#ffffff" : "var(--foreground)",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Show All ({results.length + districtCamps.length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryView("hospitals")}
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              border: categoryView === "hospitals" ? "2px solid #dc2626" : "1px solid var(--border, #cbd5e1)",
              background: categoryView === "hospitals" ? "#dc2626" : "var(--surface, #ffffff)",
              color: categoryView === "hospitals" ? "#ffffff" : "var(--foreground)",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            🏥 Hospitals &amp; Clinics ({hospitalsAndClinics.length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryView("pharmacies")}
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              border: categoryView === "pharmacies" ? "2px solid #16a34a" : "1px solid var(--border, #cbd5e1)",
              background: categoryView === "pharmacies" ? "#16a34a" : "var(--surface, #ffffff)",
              color: categoryView === "pharmacies" ? "#ffffff" : "var(--foreground)",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            💊 Medicine Stores ({medicineStores.length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryView("camps")}
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              border: categoryView === "camps" ? "2px solid #2563eb" : "1px solid var(--border, #cbd5e1)",
              background: categoryView === "camps" ? "#2563eb" : "var(--surface, #ffffff)",
              color: categoryView === "camps" ? "#ffffff" : "var(--foreground)",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            🏕️ Free Health Camps ({districtCamps.length})
          </button>
        </div>

        {/* List vs Map Toggle */}
        <div style={{ display: "flex", gap: "6px", background: "var(--surface-muted, #f1f5f9)", padding: "4px", borderRadius: "10px" }}>
          <button
            type="button"
            onClick={() => setTab("list")}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: "none",
              fontWeight: 700,
              fontSize: "12.5px",
              cursor: "pointer",
              background: tab === "list" ? "var(--surface, #ffffff)" : "transparent",
              color: tab === "list" ? "#047857" : "var(--muted)",
              boxShadow: tab === "list" ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
            }}
          >
            📋 List View
          </button>
          <button
            type="button"
            onClick={() => setTab("map")}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: "none",
              fontWeight: 700,
              fontSize: "12.5px",
              cursor: "pointer",
              background: tab === "map" ? "var(--surface, #ffffff)" : "transparent",
              color: tab === "map" ? "#047857" : "var(--muted)",
              boxShadow: tab === "map" ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
            }}
          >
            🗺️ Map View
          </button>
        </div>
      </div>

      {/* ── MAP CONTAINER (When Map View is Active) ─────────────────────────── */}
      {tab === "map" && (
        <div style={{ marginBottom: "24px" }}>
          <div
            ref={mapContainer}
            style={{
              width: "100%",
              height: "420px",
              borderRadius: "16px",
              overflow: "hidden",
              border: "1.5px solid var(--border, #cbd5e1)",
              boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
            }}
          />
          <span style={{ fontSize: "11.5px", color: "var(--muted)", display: "block", marginTop: "6px" }}>
            * Showing your approximate position circle. Click any facility card below to open turn-by-turn Google Maps navigation.
          </span>
        </div>
      )}

      {/* ── SECTION 1: HOSPITALS & CLINICS ─────────────────────────────────── */}
      {(categoryView === "all" || categoryView === "hospitals") && (
        <section style={{ marginBottom: "28px" }} aria-label="Hospitals List">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#dc2626", textTransform: "uppercase" }}>
                EMERGENCY &amp; CLINICAL INTAKE
              </span>
              <h2 style={{ fontSize: "18px", fontWeight: 800, margin: "2px 0 0" }}>
                🏥 Hospitals &amp; Clinics in this Area ({hospitalsAndClinics.length})
              </h2>
            </div>
            {nearestHospital && (
              <span style={{ fontSize: "12px", background: "#fef2f2", color: "#991b1b", padding: "4px 10px", borderRadius: "12px", fontWeight: 700 }}>
                Nearest: {formatDistance(nearestHospital.straightLineKm)}
              </span>
            )}
          </div>

          {hospitalsAndClinics.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px" }}>
              {hospitalsAndClinics.map((r, index) => {
                const isNearest = index === 0;
                return (
                  <article
                    key={r.facility.id}
                    style={{
                      background: "var(--surface, #ffffff)",
                      border: isNearest ? "2px solid #ef4444" : "1.5px solid var(--border, #e2e8f0)",
                      borderRadius: "14px",
                      padding: "16px",
                      boxShadow: isNearest ? "0 4px 14px rgba(239, 68, 68, 0.12)" : "0 2px 6px rgba(0,0,0,0.03)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      position: "relative",
                    }}
                  >
                    {isNearest && (
                      <span
                        style={{
                          position: "absolute",
                          top: "-10px",
                          right: "14px",
                          background: "#dc2626",
                          color: "#ffffff",
                          fontSize: "10px",
                          fontWeight: 800,
                          padding: "2px 10px",
                          borderRadius: "10px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        ⚡ CLOSEST HOSPITAL
                      </span>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                      <div>
                        <h3 style={{ fontSize: "15px", fontWeight: 800, margin: 0, color: "var(--foreground)" }}>
                          {r.facility.name}
                        </h3>
                        <span style={{ fontSize: "12px", color: "var(--muted)", display: "block", marginTop: "2px" }}>
                          {r.facility.address}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "6px",
                          background: r.facility.type === "hospital" ? "#fee2e2" : "#fef3c7",
                          color: r.facility.type === "hospital" ? "#991b1b" : "#92400e",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.facility.type.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--foreground)" }}>
                      <span>📏 <strong>{formatDistance(r.straightLineKm)}</strong></span>
                      {r.roadEtaMin != null && <span>· 🚗 <strong>~{r.roadEtaMin} mins</strong> by road</span>}
                      {r.facility.capabilities.emergency && (
                        <span style={{ color: "#dc2626", fontWeight: 700, marginLeft: "auto" }}>
                          🚨 24x7 Emergency
                        </span>
                      )}
                    </div>

                    {r.facility.schemes.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {r.facility.schemes.map((s) => (
                          <span
                            key={s}
                            style={{
                              fontSize: "10.5px",
                              fontWeight: 700,
                              background: "#f0fdf4",
                              color: "#166534",
                              padding: "1px 6px",
                              borderRadius: "4px",
                              border: "1px solid #bbf7d0",
                            }}
                          >
                            ✓ {s.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: "auto",
                        paddingTop: "8px",
                        borderTop: "1px solid var(--border, #f1f5f9)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      {r.facility.phone ? (
                        <a
                          href={`tel:${r.facility.phone}`}
                          style={{
                            background: "#047857",
                            color: "#ffffff",
                            padding: "6px 12px",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: 700,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <span>📞</span> Call
                        </a>
                      ) : (
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>In-person walk-in</span>
                      )}

                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${r.facility.coordinates.lat},${r.facility.coordinates.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: "var(--surface-muted, #f1f5f9)",
                          color: "#0284c7",
                          border: "1px solid #cbd5e1",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: 700,
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <span>🧭</span> Directions ↗
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "24px", background: "var(--surface, #ffffff)", borderRadius: "12px", border: "1px dashed var(--border)" }}>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "13px" }}>
                No hospitals found within the immediate perimeter. Try selecting another district above.
              </p>
            </div>
          )}
        </section>
      )}

      {/* ── SECTION 2: MEDICINE STORES & JAN AUSHADHI ──────────────────────── */}
      {(categoryView === "all" || categoryView === "pharmacies") && (
        <section style={{ marginBottom: "28px" }} aria-label="Medicine Stores List">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#16a34a", textTransform: "uppercase" }}>
                AFFORDABLE GENERIC DRUGS &amp; DISPENSING
              </span>
              <h2 style={{ fontSize: "18px", fontWeight: 800, margin: "2px 0 0" }}>
                💊 Medicine Stores &amp; Jan Aushadhi Kendras ({medicineStores.length})
              </h2>
            </div>
            <span style={{ fontSize: "11.5px", background: "#dcfce7", color: "#166534", padding: "3px 10px", borderRadius: "12px", fontWeight: 700 }}>
              Save up to 50%–90% on Generics
            </span>
          </div>

          {medicineStores.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px" }}>
              {medicineStores.map((r, index) => {
                const isNearest = index === 0;
                return (
                  <article
                    key={r.facility.id}
                    style={{
                      background: "var(--surface, #ffffff)",
                      border: isNearest ? "2px solid #16a34a" : "1.5px solid var(--border, #e2e8f0)",
                      borderRadius: "14px",
                      padding: "16px",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      position: "relative",
                    }}
                  >
                    {isNearest && (
                      <span
                        style={{
                          position: "absolute",
                          top: "-10px",
                          right: "14px",
                          background: "#16a34a",
                          color: "#ffffff",
                          fontSize: "10px",
                          fontWeight: 800,
                          padding: "2px 10px",
                          borderRadius: "10px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        ⚡ CLOSEST MEDICINE STORE
                      </span>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                      <div>
                        <h3 style={{ fontSize: "15px", fontWeight: 800, margin: 0, color: "var(--foreground)" }}>
                          {r.facility.name}
                        </h3>
                        <span style={{ fontSize: "12px", color: "var(--muted)", display: "block", marginTop: "2px" }}>
                          {r.facility.address}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "6px",
                          background: "#dcfce7",
                          color: "#166534",
                          whiteSpace: "nowrap",
                        }}
                      >
                        JAN AUSHADHI
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--foreground)" }}>
                      <span>📏 <strong>{formatDistance(r.straightLineKm)}</strong></span>
                      {r.roadEtaMin != null && <span>· 🚗 <strong>~{r.roadEtaMin} mins</strong></span>}
                      <span style={{ color: "#166534", fontWeight: 700, marginLeft: "auto" }}>
                        ✓ PMBJP Generic Stock
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: "auto",
                        paddingTop: "8px",
                        borderTop: "1px solid var(--border, #f1f5f9)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      {r.facility.phone ? (
                        <a
                          href={`tel:${r.facility.phone}`}
                          style={{
                            background: "#166534",
                            color: "#ffffff",
                            padding: "6px 12px",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: 700,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <span>📞</span> Check Medicine Stock
                        </a>
                      ) : (
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>Open daily for walk-in</span>
                      )}

                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${r.facility.coordinates.lat},${r.facility.coordinates.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: "var(--surface-muted, #f1f5f9)",
                          color: "#0284c7",
                          border: "1px solid #cbd5e1",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: 700,
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <span>🧭</span> Navigate ↗
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "24px", background: "var(--surface, #ffffff)", borderRadius: "12px", border: "1px dashed var(--border)" }}>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "13px" }}>
                No PMBJP generic medicine store registered in this immediate coordinate perimeter.
              </p>
            </div>
          )}
        </section>
      )}

      {/* ── SECTION 3: FREE DISTRICT HEALTH CAMPS ─────────────────────────── */}
      {(categoryView === "all" || categoryView === "camps") && (
        <section style={{ marginBottom: "28px" }} aria-label="Health Camps in District">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#2563eb", textTransform: "uppercase" }}>
                FREE RURAL OUTREACH &amp; SCREENING
              </span>
              <h2 style={{ fontSize: "18px", fontWeight: 800, margin: "2px 0 0" }}>
                🏕️ Free Health Camps in {activeDistrict} District ({districtCamps.length})
              </h2>
            </div>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              Verified Government &amp; NGO Mobile Medical Units
            </span>
          </div>

          {districtCamps.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px" }}>
              {districtCamps.map((camp) => (
                <article
                  key={camp.id}
                  style={{
                    background: "var(--surface, #ffffff)",
                    border: "1.5px solid #bfdbfe",
                    borderRadius: "14px",
                    padding: "16px",
                    boxShadow: "0 2px 8px rgba(37, 99, 235, 0.05)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        background: camp.status === "active" ? "#dcfce7" : "#fef3c7",
                        color: camp.status === "active" ? "#166534" : "#92400e",
                      }}
                    >
                      ● {camp.status === "active" ? "ACTIVE TODAY" : "UPCOMING CAMP"}
                    </span>
                    <span style={{ fontSize: "11.5px", color: "var(--muted)", fontWeight: 600 }}>
                      Block: {camp.block}
                    </span>
                  </div>

                  <div>
                    <h3 style={{ fontSize: "15px", fontWeight: 800, margin: 0, color: "var(--foreground)" }}>
                      {camp.title}
                    </h3>
                    <span style={{ fontSize: "12px", color: "var(--muted)", display: "block", marginTop: "2px" }}>
                      Organized by: {camp.organizer}
                    </span>
                  </div>

                  <div
                    style={{
                      background: "var(--surface-muted, #f8fafc)",
                      borderRadius: "8px",
                      padding: "8px 10px",
                      fontSize: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <div>📍 <strong>{camp.venue}</strong></div>
                    <div>📅 {camp.startDate} to {camp.endDate} · <strong>{camp.timings}</strong></div>
                  </div>

                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                      FREE SERVICES PROVIDED:
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {camp.services.map((svc, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: "10.5px",
                            fontWeight: 600,
                            background: "rgba(37, 99, 235, 0.08)",
                            color: "#1d4ed8",
                            padding: "2px 6px",
                            borderRadius: "10px",
                          }}
                        >
                          ✓ {svc}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "auto",
                      paddingTop: "8px",
                      borderTop: "1px solid var(--border, #f1f5f9)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <a
                      href={`tel:${camp.contactPhone}`}
                      style={{
                        background: "#0284c7",
                        color: "#ffffff",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: 700,
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span>📞</span> {camp.contactPhone}
                    </a>

                    {camp.coordinates && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${camp.coordinates.lat},${camp.coordinates.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "#0284c7",
                          fontSize: "12px",
                          fontWeight: 700,
                          textDecoration: "none",
                        }}
                      >
                        Venue Map ↗
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "28px", background: "var(--surface, #ffffff)", borderRadius: "12px", border: "1px dashed var(--border)" }}>
              <span style={{ fontSize: "32px" }}>🏕️</span>
              <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: "13px" }}>
                No active mobile health camps currently registered in <strong>{activeDistrict} District</strong>. Check back soon or select another district above.
              </p>
            </div>
          )}
        </section>
      )}

      {/* ── Referral Disclaimer Note ────────────────────────────────────────── */}
      <div className="protocol-note" style={{ marginTop: 24, fontSize: "12px", color: "var(--muted)", lineHeight: 1.5 }}>
        <strong>Healthcare Directory Guidance:</strong> Facility locations, contact numbers, and camps are aggregated from National Health Mission (NHM), ABDM Health Facility Registry, and OpenStreetMap. Always call in advance to confirm doctor duty hours or medicine stock. Arogya Relay does not dispatch ambulances.
      </div>
    </div>
  );
}
