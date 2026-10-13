"use client";

import { useState, useMemo, useEffect } from "react";
import {
  DistrictHealthCamp,
  getRegisteredDistricts,
  searchCampsByDistrict,
  getUserNativeDistrict,
  setUserNativeDistrict,
  getCachedOrStaticCamps,
} from "@/lib/nearby/district-camps";
import { useLanguage } from "@/lib/i18n/provider";

interface HealthCampFinderProps {
  onSelectCamp?: (camp: DistrictHealthCamp) => void;
  className?: string;
}

export function HealthCampFinder({ onSelectCamp, className }: HealthCampFinderProps) {
  const { t, effectiveLang } = useLanguage();
  const [nativeDistrict, setNativeDistrict] = useState<string>("Ganjam");
  const [travelQuery, setTravelQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"native" | "travel">("native");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editingNative, setEditingNative] = useState<boolean>(false);
  const [editDistrictValue, setEditDistrictValue] = useState<string>("Ganjam");

  // Load saved native district on mount
  useEffect(() => {
    const saved = getUserNativeDistrict();
    setNativeDistrict(saved);
    setEditDistrictValue(saved);
  }, []);

  const availableDistricts = useMemo(() => getRegisteredDistricts(), []);

  // Compute active query based on selected mode
  const currentQuery = activeTab === "native" ? nativeDistrict : travelQuery;

  const camps = useMemo(() => {
    return searchCampsByDistrict(currentQuery, selectedCategory);
  }, [currentQuery, selectedCategory]);

  const handleSaveNative = (dist: string) => {
    const clean = dist.trim();
    if (!clean) return;
    setNativeDistrict(clean);
    setUserNativeDistrict(clean);
    setEditingNative(false);
  };

  const categories = [
    { id: "all", label: "All Camps", icon: "🌐" },
    { id: "opd", label: "General OPD", icon: "🩺" },
    { id: "eye", label: "Eye Care", icon: "👁️" },
    { id: "maternal", label: "Maternal & Child", icon: "👶" },
    { id: "sugar", label: "Diabetes & Heart", icon: "❤️" },
    { id: "dental", label: "Dental", icon: "🦷" },
  ];

  return (
    <div className={`health-camp-finder ${className ?? ""}`} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #065f46 0%, #047857 100%)",
          color: "#ffffff",
          borderRadius: "16px",
          padding: "20px 24px",
          boxShadow: "0 4px 16px rgba(4, 120, 87, 0.16)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        <div>
          <span style={{ fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.9 }}>
            📍 RURAL HEALTH OUTREACH DIRECTORY
          </span>
          <h2 style={{ fontSize: "20px", fontWeight: "800", margin: "4px 0 6px", color: "#ffffff" }}>
            District-Based Health Camps &amp; Mobile Medical Units
          </h2>
          <p style={{ margin: 0, fontSize: "13.5px", opacity: 0.92, maxWidth: "620px", lineHeight: "1.4" }}>
            Discover free local clinical checkups, eye surgery camps, immunization drives, and generic medicine distribution in your native district or while traveling.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.15)", padding: "6px 14px", borderRadius: "20px" }}>
          <span>📶</span>
          <span style={{ fontSize: "12px", fontWeight: "700" }}>Offline-Ready Cache</span>
        </div>
      </div>

      {/* Mode Switcher: Native District vs Travel Search */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          background: "var(--surface-muted, #f1f5f9)",
          padding: "5px",
          borderRadius: "12px",
          gap: "6px",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("native")}
          style={{
            padding: "10px 16px",
            borderRadius: "9px",
            border: "none",
            fontWeight: 700,
            fontSize: "13.5px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            background: activeTab === "native" ? "var(--surface, #ffffff)" : "transparent",
            color: activeTab === "native" ? "#047857" : "var(--muted, #64748b)",
            boxShadow: activeTab === "native" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          <span>🏠</span>
          <span>My Native District ({nativeDistrict})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("travel")}
          style={{
            padding: "10px 16px",
            borderRadius: "9px",
            border: "none",
            fontWeight: 700,
            fontSize: "13.5px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            background: activeTab === "travel" ? "var(--surface, #ffffff)" : "transparent",
            color: activeTab === "travel" ? "#0284c7" : "var(--muted, #64748b)",
            boxShadow: activeTab === "travel" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          <span>🚗</span>
          <span>Traveling? Search Another District</span>
        </button>
      </div>

      {/* Tab 1: Native District Controls */}
      {activeTab === "native" && (
        <div
          style={{
            background: "var(--surface, #ffffff)",
            border: "1.5px solid #d1fae5",
            borderRadius: "12px",
            padding: "14px 18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#065f46", textTransform: "uppercase" }}>
              Permanent Home District
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "2px" }}>
              <span style={{ fontSize: "20px" }}>🏡</span>
              <strong style={{ fontSize: "16px", color: "var(--foreground, #0f172a)" }}>
                {nativeDistrict} District
              </strong>
              <span style={{ fontSize: "11.5px", background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "10px", fontWeight: 700 }}>
                Saved in Citizen Profile
              </span>
            </div>
          </div>

          {!editingNative ? (
            <button
              type="button"
              onClick={() => setEditingNative(true)}
              style={{
                background: "transparent",
                border: "1.5px solid #10b981",
                color: "#047857",
                borderRadius: "8px",
                padding: "6px 14px",
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ✏️ Change Native District
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <select
                value={editDistrictValue}
                onChange={(e) => setEditDistrictValue(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1.5px solid #10b981",
                  fontSize: "13px",
                  fontWeight: 600,
                  outline: "none",
                }}
              >
                {availableDistricts.map((d) => (
                  <option key={d.district} value={d.district}>
                    {d.district} ({d.state})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleSaveNative(editDistrictValue)}
                style={{
                  background: "#047857",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px 14px",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditingNative(false)}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  fontSize: "12.5px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Travel District Search Bar */}
      {activeTab === "travel" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "14px", top: "12px", fontSize: "18px" }}>🔍</span>
            <input
              type="text"
              value={travelQuery}
              onChange={(e) => setTravelQuery(e.target.value)}
              placeholder="Type current district name (e.g. Khordha, Cuttack, Mayurbhanj, Shillong, Pune)..."
              style={{
                width: "100%",
                padding: "12px 16px 12px 44px",
                borderRadius: "12px",
                border: "1.5px solid var(--border, #cbd5e1)",
                fontSize: "14px",
                background: "var(--surface, #ffffff)",
                color: "var(--foreground, #0f172a)",
                outline: "none",
                boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
              }}
            />
            {travelQuery && (
              <button
                type="button"
                onClick={() => setTravelQuery("")}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "10px",
                  background: "transparent",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Popular Districts Suggestion Chips */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>Popular Districts:</span>
            {availableDistricts.slice(0, 6).map((d) => (
              <button
                key={d.district}
                type="button"
                onClick={() => setTravelQuery(d.district)}
                style={{
                  background: travelQuery.toLowerCase() === d.district.toLowerCase() ? "#0284c7" : "var(--surface, #ffffff)",
                  color: travelQuery.toLowerCase() === d.district.toLowerCase() ? "#ffffff" : "var(--foreground, #334155)",
                  border: "1px solid var(--border, #e2e8f0)",
                  borderRadius: "16px",
                  padding: "3px 10px",
                  fontSize: "11.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {d.district}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category Filter Pills */}
      <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: selectedCategory === cat.id ? "1.5px solid #047857" : "1px solid var(--border, #e2e8f0)",
              background: selectedCategory === cat.id ? "rgba(4, 120, 87, 0.08)" : "var(--surface, #ffffff)",
              color: selectedCategory === cat.id ? "#047857" : "var(--foreground, #475569)",
              fontWeight: selectedCategory === cat.id ? 700 : 500,
              fontSize: "12.5px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Search Summary */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", color: "var(--muted)" }}>
        <span>
          Showing <strong>{camps.length}</strong> active &amp; upcoming health camps in{" "}
          <strong style={{ color: "var(--foreground)" }}>{currentQuery || "all districts"}</strong>
        </span>
        <span>Verified Government &amp; NGO Registry</span>
      </div>

      {/* Camp Cards List */}
      {camps.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
          {camps.map((camp) => (
            <article
              key={camp.id}
              style={{
                background: "var(--surface, #ffffff)",
                border: "1.5px solid var(--border, #e2e8f0)",
                borderRadius: "14px",
                padding: "18px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                position: "relative",
              }}
            >
              {/* Header with Title and Status */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "6px" }}>
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      background: camp.status === "active" ? "#dcfce7" : "#fef3c7",
                      color: camp.status === "active" ? "#166534" : "#92400e",
                      padding: "2px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    ● {camp.status === "active" ? "Active Now" : "Upcoming Camp"}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>
                    {camp.district}, {camp.state}
                  </span>
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--foreground, #0f172a)", lineHeight: 1.35 }}>
                  {camp.title}
                </h3>
                <span style={{ fontSize: "12px", color: "var(--muted)", display: "block", marginTop: "3px" }}>
                  Organized by: {camp.organizer}
                </span>
              </div>

              {/* Venue & Timing Details */}
              <div
                style={{
                  background: "var(--surface-muted, #f8fafc)",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  fontSize: "12.5px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <span style={{ fontSize: "14px" }}>📍</span>
                  <div>
                    <strong style={{ color: "var(--foreground)" }}>{camp.venue}</strong>
                    <div style={{ color: "var(--muted)", fontSize: "11.5px" }}>Block: {camp.block}</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "14px" }}>📅</span>
                  <span style={{ color: "var(--foreground)" }}>
                    {camp.startDate} to {camp.endDate} · <strong>{camp.timings}</strong>
                  </span>
                </div>
              </div>

              {/* Services Offered Badges */}
              <div>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                  Free Medical Services:
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {camp.services.map((svc, i) => (
                    <span
                      key={i}
                      style={{
                        background: "rgba(16, 185, 129, 0.08)",
                        border: "1px solid rgba(16, 185, 129, 0.2)",
                        color: "#065f46",
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: "12px",
                      }}
                    >
                      ✓ {svc}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom Actions: Call and Select */}
              <div
                style={{
                  marginTop: "auto",
                  paddingTop: "10px",
                  borderTop: "1px solid var(--border, #f1f5f9)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <a
                  href={`tel:${camp.contactPhone}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    color: "#0284c7",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  <span>📞</span>
                  <span>{camp.contactPhone}</span>
                </a>

                {onSelectCamp && (
                  <button
                    type="button"
                    onClick={() => onSelectCamp(camp)}
                    style={{
                      background: "#047857",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    View Camp →
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            background: "var(--surface, #ffffff)",
            border: "1.5px dashed var(--border, #cbd5e1)",
            borderRadius: "14px",
          }}
        >
          <span style={{ fontSize: "36px" }}>🏕️</span>
          <h3 style={{ fontSize: "16px", margin: "10px 0 4px", color: "var(--foreground)" }}>
            No registered health camps found for &quot;{currentQuery}&quot;
          </h3>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)", maxWidth: "460px", marginInline: "auto" }}>
            Try searching for another district name (e.g., Ganjam, Khordha, Cuttack, Mayurbhanj, East Khasi Hills, Pune) or switch to your native district.
          </p>
        </div>
      )}
    </div>
  );
}
