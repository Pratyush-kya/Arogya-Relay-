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
  loadCamps,
  type NearbyFilters,
} from "@/lib/nearby/controller";
import {
  type CampEvent,
  type Facility,
  type FacilityType,
  type LocationState,
  type ReferralResult,
} from "@/lib/nearby/types";
import type { LiveFacilityCounts } from "@/lib/nearby/overpass-adapter";
import { REGION_CENTER } from "@/lib/nearby/synthetic-data";
import { useLanguage } from "@/lib/i18n/provider";

const FACILITY_TYPES: { value: FacilityType; labelKey?: string; label: string }[] = [
  { value: "hospital", labelKey: "nearby.hospital", label: "Hospital" },
  { value: "chc", label: "CHC" },
  { value: "phc", label: "PHC" },
  { value: "aam", labelKey: "nearby.arogyaMandir", label: "Arogya Mandir" },
  { value: "clinic", labelKey: "nearby.clinic", label: "Clinic" },
  { value: "pharmacy", labelKey: "nearby.pharmacy", label: "Pharmacy" },
];

export default function NearbyCare() {
  const { t, tf, effectiveLang } = useLanguage();
  const [tab, setTab] = useState<"map" | "list">("list");
  const [locState, setLocState] = useState<LocationState>("idle");
  const [pos, setPos] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [locNote, setLocNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [filters, setFilters] = useState<NearbyFilters>(DEFAULT_FILTERS);
  const [emergency, setEmergency] = useState(false);
  const [results, setResults] = useState<ReferralResult[]>([]);
  const [emergencyFacility, setEmergencyFacility] = useState<Facility | null>(null);
  const [liveCounts, setLiveCounts] = useState<LiveFacilityCounts | null>(null);
  const [isLiveOnline, setIsLiveOnline] = useState(false);
  const [camps, setCamps] = useState<CampEvent[]>([]);
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const acquire = useCallback(() => {
    if (!consent) {
      setLocNote(t("nearby.allowFirst"));
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocState("unavailable");
      setPos({ ...REGION_CENTER });
      setLocNote(t("nearby.gpsUnavailable"));
      return;
    }
    setLocState("acquiring");
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
        setLocNote(
          coords.accuracy && coords.accuracy > 500
            ? `Approximate (±${Math.round(coords.accuracy)} m). Confirm before relying on it.`
            : `Captured (±${Math.round(coords.accuracy ?? 0)} m).`,
        );
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocState("denied");
          setLocNote(t("nearby.permissionDenied"));
        } else {
          setLocState("unavailable");
          setLocNote(t("nearby.unavailable"));
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, [consent, t]);

  const setManual = useCallback((lat: number, lng: number) => {
    if (!isValidCoordinate(lat, lng)) {
      setLocNote(t("nearby.invalidCoords"));
      return;
    }
    setPos({ lat, lng });
    setLocState("approximate");
    setLocNote("Manual coordinate set.");
  }, [t]);

  useEffect(() => {
    if (!pos) return;
    let cancelled = false;
    const origin = { lat: pos.lat, lng: pos.lng, accuracyMeters: pos.accuracy, source: "gps" as const };
    computeNearby(origin, filters, emergency).then((r) => {
      if (cancelled) return;
      setResults(r.results);
      setEmergencyFacility(r.emergencyFacility);
      setLiveCounts(r.counts);
      setIsLiveOnline(r.isLive);
    }).catch(() => {});
    loadCamps().then((c) => !cancelled && setCamps(c));
    return () => {
      cancelled = true;
    };
  }, [pos, filters, emergency]);

  const consentSnapshot = useMemo(() => {
    if (!consent || !pos) return null;
    return buildConsentSnapshot(
      { lat: pos.lat, lng: pos.lng, accuracyMeters: pos.accuracy, source: "gps" },
      "Nearby Care referral navigation",
    );
  }, [consent, pos]);

  // MapLibre setup
  useEffect(() => {
    if (tab !== "map" || !mapContainer.current || mapRef.current) return;
    const center: [number, number] = pos ? [pos.lng, pos.lat] : [REGION_CENTER.lng, REGION_CENTER.lat];
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png", "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center,
      zoom: 11,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [tab, pos]);

  useEffect(() => {
    if (!mapRef.current || !pos) return;
    const map = mapRef.current;
    map.setCenter([pos.lng, pos.lat]);
    if (!map.getSource("me")) {
      map.addSource("me", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    }
    const acc = pos.accuracy && pos.accuracy > 0 ? pos.accuracy : 200;
    const fc = {
      type: "FeatureCollection" as const,
      features: [
        { type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [pos.lng, pos.lat] }, properties: {} },
        { type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [pos.lng, pos.lat] }, properties: { radius: acc } },
      ],
    };
    (map.getSource("me") as maplibregl.GeoJSONSource).setData(fc);
    if (!map.getLayer("me-circle")) {
      map.addLayer({
        id: "me-circle",
        type: "circle",
        source: "me",
        filter: ["==", ["geometry-type"], "Point"],
        paint: { "circle-radius": ["get", "radius"], "circle-color": "#17644f", "circle-opacity": 0.12, "circle-stroke-width": 1, "circle-stroke-color": "#17644f" },
      });
    }
  }, [pos]);

  return (
    <div className="page-content section-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t("nearby.kicker")}</span>
          <h1>{t("nearby.title")}</h1>
          <p>{t("nearby.subtitle")}</p>
        </div>
      </div>

      <p className="nc-synthetic">{t("nearby.demo")}</p>

      <div className="cg-emergency" role="alert">
        <div className="cg-emergency-head"><span className="cg-pulse" aria-hidden="true" /><strong>{t("emergency.title")}</strong></div>
        <p className="cg-immediate">{t("emergency.call112")}</p>
        <div className="cg-emergency-actions">
          <a className="cg-call" href="tel:112">{t("emergency.button")}</a>
          {emergencyFacility && (
            <span className="cg-facility">{t("nearby.nearestEmergency")}: {emergencyFacility.name} · <a href={`tel:${emergencyFacility.phone ?? ""}`}>{t("common.call")}</a></span>
          )}
        </div>
      </div>

      <section className="cg-card nc-consent" aria-label={t("nearby.locationConsent")}>
        <h2>{t("nearby.where")}</h2>
        {!consent ? (
          <div className="nc-consent-box">
            <p>{t("nearby.locationWhy")}</p>
            <label className="nc-check"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> {t("nearby.allowLocation")}</label>
          </div>
        ) : (
          <div className="nc-consent-box">
            <div className="nc-loc-row">
              <button type="button" className="primary-button" onClick={acquire}>{t("nearby.useMyLocation")}</button>
              <span className={`nc-state nc-${locState}`}>{locState}</span>
            </div>
            <div className="nc-manual">
              <label>Lat<input type="number" step="0.0001" placeholder="25.1986" onChange={(e) => setManual(Number(e.target.value), pos?.lng ?? REGION_CENTER.lng)} /></label>
              <label>Lng<input type="number" step="0.0001" placeholder="91.8785" onChange={(e) => setManual(pos?.lat ?? REGION_CENTER.lat, Number(e.target.value))} /></label>
            </div>
            {locNote && <p className="nc-note" role="status">{locNote}</p>}
            {consentSnapshot && (
              <p className="nc-note">{tf("nearby.retainedUntil", { date: new Date(consentSnapshot.retentionUntil).toLocaleDateString(`${effectiveLang}-IN`) })} · <button type="button" className="nc-link" onClick={() => { setConsent(false); setPos(null); setLocState("idle"); }}>{t("common.deleteNow")}</button></p>
            )}
          </div>
        )}
      </section>

      <section className="cg-card nc-filters" aria-label={t("nearby.filtersLabel")}>
        <h2>2 · {t("nearby.filter")}</h2>
        <div className="nc-filter-chips">
          {FACILITY_TYPES.map((ft) => (
            <label key={ft.value} className={filters.types.includes(ft.value) ? "selected" : ""}>
              <input type="checkbox" checked={filters.types.includes(ft.value)} onChange={() => setFilters((f) => ({ ...f, types: f.types.includes(ft.value) ? f.types.filter((x) => x !== ft.value) : [...f.types, ft.value] }))} /> <span>{ft.labelKey ? t(ft.labelKey) : ft.label}</span>
            </label>
          ))}
        </div>
        <div className="nc-filter-rows">
          <label className="nc-check"><input type="checkbox" checked={emergency} onChange={(e) => setEmergency(e.target.checked)} /> {t("nearby.needEmergency")}</label>
          <label className="nc-check"><input type="checkbox" checked={filters.emergencyOnly} onChange={(e) => setFilters((f) => ({ ...f, emergencyOnly: e.target.checked }))} /> {t("nearby.emergencyCare")}</label>
          <label className="nc-check"><input type="checkbox" checked={filters.maternity} onChange={(e) => setFilters((f) => ({ ...f, maternity: e.target.checked }))} /> {t("nearby.maternal")}</label>
          <label className="nc-check"><input type="checkbox" checked={filters.child} onChange={(e) => setFilters((f) => ({ ...f, child: e.target.checked }))} /> {t("nearby.child")}</label>
          <label className="nc-check"><input type="checkbox" checked={filters.pmjay} onChange={(e) => setFilters((f) => ({ ...f, pmjay: e.target.checked }))} /> Ayushman / PM-JAY</label>
          <label className="nc-check"><input type="checkbox" checked={filters.showUnverified} onChange={(e) => setFilters((f) => ({ ...f, showUnverified: e.target.checked }))} /> {t("nearby.showUnverified")}</label>
        </div>
      </section>

      {/* Live OpenStreetMap Real-World Facilities Summary */}
      {pos && liveCounts && (
        <section className="cg-card nearby-live-summary-card" aria-label="Real-World Healthcare Tracking">
          <div className="summary-badge-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700 }}>
              <span className={`live-pulse-dot ${isLiveOnline ? "online" : "cached"}`} />
              {isLiveOnline ? "Live Real-World Healthcare Directory" : "Cached Healthcare Directory (Offline Mode)"}
            </span>
            <span className="live-source-tag" style={{ fontSize: "11px", background: "#eaf5ef", color: "#17644f", padding: "2px 8px", borderRadius: "12px", fontWeight: 600 }}>
              {isLiveOnline ? "🌐 OpenStreetMap Live" : "💾 Offline Cache"}
            </span>
          </div>
          <p className="summary-desc" style={{ fontSize: "12px", color: "var(--muted)", margin: "0 0 12px" }}>
            Facilities identified within operational perimeter of ({pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}):
          </p>
          <div className="summary-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
            <div className="stat-pill hospital" style={{ background: "#fdf2f2", padding: "10px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "20px" }}>🏥</span>
              <div>
                <strong style={{ fontSize: "18px", color: "#991b1b", display: "block" }}>{liveCounts.hospitals}</strong>
                <span style={{ fontSize: "11px", color: "#7f1d1d" }}>Hospitals & Emergency</span>
              </div>
            </div>
            <div className="stat-pill clinic" style={{ background: "#eff6ff", padding: "10px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "20px" }}>🩺</span>
              <div>
                <strong style={{ fontSize: "18px", color: "#1e40af", display: "block" }}>{liveCounts.clinics}</strong>
                <span style={{ fontSize: "11px", color: "#1e3a8a" }}>Clinics & Centers</span>
              </div>
            </div>
            <div className="stat-pill pharmacy" style={{ background: "#f0fdf4", padding: "10px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "20px" }}>💊</span>
              <div>
                <strong style={{ fontSize: "18px", color: "#166534", display: "block" }}>{liveCounts.pharmacies}</strong>
                <span style={{ fontSize: "11px", color: "#14532d" }}>Pharmacies & Jan Aushadhi</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {pos && (
        <section className="cg-card nc-results" aria-label={t("nearby.resultsLabel")}>
          <div className="nc-results-head">
            <h2>3 · {t("nearby.facilities")}</h2>
            <div className="cg-toggle" role="group" aria-label={t("nearby.view")}>
              <button type="button" className={tab === "list" ? "active" : ""} aria-pressed={tab === "list"} onClick={() => setTab("list")}>{t("nearby.list")}</button>
              <button type="button" className={tab === "map" ? "active" : ""} aria-pressed={tab === "map"} onClick={() => setTab("map")}>{t("nearby.map")}</button>
            </div>
          </div>

          {tab === "map" ? (
            <div ref={mapContainer} className="nc-map" aria-label={t("nearby.mapLabel")} />
          ) : (
            <ul className="nc-list">
              {results.length === 0 && <li className="nc-empty">{t("nearby.noResults")}</li>}
              {results.map((r) => (
                <li key={r.facility.id} className={`nc-item ${r.capabilityMet ? "" : "nc-missing"}`}>
                  <div className="nc-item-head">
                    <strong>{r.facility.name}</strong>
                    <span className={`nc-badge ${r.facility.verification}`}>{r.facility.verification}</span>
                  </div>
                  <div className="nc-item-meta">
                    {formatDistance(r.straightLineKm)} · {r.facility.type.toUpperCase()}
                    {r.roadEtaMin != null ? ` · ${formatEta(r.roadEtaMin)} ${t("nearby.byRoad")}` : ` · ${t("nearby.straight")}`}
                    {r.facility.verification !== "verified" && <em className="nc-stale"> · {t("nearby.callToConfirm")}</em>}
                  </div>
                  <p className="nc-rationale">{r.rationale}</p>
                  {!r.capabilityMet && <p className="nc-warn">{t("nearby.lacks")}</p>}
                  <div className="nc-item-actions">
                    {r.facility.phone && <a className="secondary-button" href={`tel:${r.facility.phone}`}>{t("common.call")}</a>}
                    <button type="button" className="nc-link" onClick={() => navigator.clipboard?.writeText(`${r.facility.name} — ${r.facility.address} (${formatDistance(r.straightLineKm)})`)}>{t("nearby.copyBrief")}</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {camps.length > 0 && (
        <section className="cg-card nc-camps" aria-label={t("nearby.healthCamps")}>
          <h2>{t("nearby.camps")}</h2>
          <ul className="nc-camp-list">
            {camps.map((c) => (
              <li key={c.id} className="nc-camp">
                <strong>{c.title}</strong>
                <span className="nc-camp-meta">{c.organiser} · {c.venue} · {c.verification === "verified" ? "verified" : "unverified"}</span>
                <p>{c.services.join(", ")}{c.eligibility ? ` · ${c.eligibility}` : ""}</p>
                {c.contact && <a className="secondary-button" href={`tel:${c.contact}`}>{t("common.contact")}</a>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="protocol-note" style={{ marginTop: 18 }}>
        <strong>Referral support only.</strong> Facility and camp data are synthetic demonstrations. HFR registration is not proof a facility is open or has beds. Always call to confirm. Arogya Relay does not dispatch ambulances.
      </div>
    </div>
  );
}
