"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n/provider";
import type { ScreeningRecord } from "@/lib/types";
import DiseaseLibrary from "./disease-library";
import { HealthCampFinder } from "./health-camp-finder";
import CareGuidance from "./care-guidance";
import NearbyCare from "./nearby-care";

interface WorkerWorkspaceProps {
  currentUser: { email?: string } | null;
  currentProfile: {
    display_name?: string;
    role?: string;
    full_name?: string;
    hw_id?: string;
    village_center?: string;
  } | null;
  screenings: ScreeningRecord[];
  onOpenScreening: () => void;
  onSyncReports: () => Promise<void>;
  syncState: "idle" | "ready" | "syncing" | "done" | "error";
  onSignOut: () => Promise<void>;
}

export function WorkerWorkspace({
  currentUser,
  currentProfile,
  screenings,
  onOpenScreening,
  onSyncReports,
  syncState,
  onSignOut,
}: WorkerWorkspaceProps) {
  const { t, effectiveLang, setLang } = useLanguage();
  const [activeTab, setActiveTab] = useState<"intake" | "camps" | "nearby" | "care" | "library">("intake");

  const workerName =
    currentProfile?.full_name ||
    currentProfile?.display_name ||
    (currentUser?.email?.includes("priya") ? "Priya Devi (ASHA Facilitator)" : "Field Health Worker");

  const workerId = currentProfile?.hw_id || (currentUser?.email?.includes("priya") ? "HW-PRIYA-04" : "HW-01");
  const subCenter = currentProfile?.village_center || (currentUser?.email?.includes("priya") ? "Mawlynnong Community Sub-Center" : "Sub-Center North Ridge");

  const unsyncedCount = screenings.filter((s) => !s.synced).length;
  const urgentCount = screenings.filter((s) => s.urgency_tier === "urgent" || s.urgency_tier === "emergency").length;

  return (
    <div className="worker-workspace-shell" style={{ minHeight: "100vh", background: "var(--background, #f8fafc)", display: "flex", flexDirection: "column" }}>
      {/* ── Top Bar with ASHA Identity & Sync ───────────────────────────────── */}
      <header
        style={{
          background: "var(--surface, #ffffff)",
          borderBottom: "1.5px solid var(--border, #e2e8f0)",
          padding: "12px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }} onClick={() => setActiveTab("intake")}>
            <span style={{ fontSize: "24px" }}>👩‍⚕️</span>
            <div>
              <strong style={{ fontSize: "16px", color: "#166534", display: "block", lineHeight: 1.1 }}>
                Arogya Relay
              </strong>
              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                ASHA &amp; ANM Field Kit
              </span>
            </div>
          </div>

          {/* Screener Attestation Badge */}
          <div
            style={{
              background: "#dcfce7",
              border: "1px solid #bbf7d0",
              color: "#166534",
              borderRadius: "16px",
              padding: "4px 12px",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ fontWeight: 800 }}>{workerName}</span>
            <span style={{ opacity: 0.7 }}>·</span>
            <span style={{ fontSize: "11px", fontWeight: 600 }}>{workerId}</span>
            <span style={{ opacity: 0.7 }}>·</span>
            <span style={{ fontSize: "11px", color: "#14532d" }}>{subCenter}</span>
          </div>
        </div>

        {/* Right Nav: New Screening + Language + Logout */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={onOpenScreening}
            style={{
              background: "#16a34a",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 8px rgba(22, 163, 74, 0.25)",
            }}
          >
            <span>＋</span>
            <span>New Patient Screening</span>
          </button>

          <select
            value={effectiveLang}
            onChange={(e) => setLang(e.target.value as any)}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border, #cbd5e1)",
              background: "var(--surface, #ffffff)",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी (Hindi)</option>
            <option value="or">ଓଡ଼ିଆ (Odia)</option>
            <option value="bn">বাংলা (Bengali)</option>
            <option value="te">తెలుగు (Telugu)</option>
            <option value="as">অসমীয়া (Assamese)</option>
            <option value="mr">मराठी (Marathi)</option>
            <option value="sat">ᱥᱟᱱᱛᱟᱲᱤ (Santali)</option>
          </select>

          <button
            type="button"
            onClick={onSignOut}
            style={{
              background: "#fee2e2",
              border: "1px solid #fca5a5",
              color: "#991b1b",
              borderRadius: "8px",
              padding: "7px 14px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>🚪</span>
            <span>Log Out</span>
          </button>
        </div>
      </header>

      {/* ── Navigation Tabs ──────────────────────────────────────────────────── */}
      <nav
        style={{
          background: "var(--surface, #ffffff)",
          borderBottom: "1px solid var(--border, #e2e8f0)",
          padding: "0 24px",
          display: "flex",
          gap: "8px",
          overflowX: "auto",
        }}
      >
        {[
          { id: "intake", label: `Field Screenings (${screenings.length})`, icon: "📋" },
          { id: "camps", label: "Village Health Camps", icon: "📍" },
          { id: "nearby", label: "Nearby Facilities & Kendras", icon: "⌖" },
          { id: "care", label: "Field Care Guidance", icon: "✚" },
          { id: "library", label: "Arogya Gyan Reference", icon: "📖" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: "12px 16px",
              border: "none",
              background: "transparent",
              borderBottom: activeTab === tab.id ? "3px solid #16a34a" : "3px solid transparent",
              color: activeTab === tab.id ? "#16a34a" : "var(--muted, #64748b)",
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: "13.5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              whiteSpace: "nowrap",
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* ── Workspace Body ──────────────────────────────────────────────────── */}
      <main style={{ maxWidth: "1280px", width: "100%", margin: "0 auto", padding: "20px 24px", flex: 1 }}>
        {activeTab === "intake" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Field Status & Offline Sync Strip */}
            <div
              style={{
                background: "linear-gradient(135deg, #15803d 0%, #166534 100%)",
                color: "#ffffff",
                borderRadius: "16px",
                padding: "22px 26px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "16px",
                boxShadow: "0 4px 16px rgba(22, 101, 52, 0.16)",
              }}
            >
              <div>
                <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", opacity: 0.9 }}>
                  📶 OFFLINE-FIRST FIELD HEALTH CONSOLE
                </span>
                <h1 style={{ fontSize: "22px", fontWeight: 800, margin: "4px 0", color: "#ffffff" }}>
                  Active Field Session · {subCenter}
                </h1>
                <p style={{ margin: 0, fontSize: "13.5px", opacity: 0.92 }}>
                  All intake records and voice dictations are safely stored in device IndexedDB until cloud synchronization.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  onClick={onSyncReports}
                  disabled={syncState === "syncing"}
                  style={{
                    background: "#ffffff",
                    color: "#166534",
                    border: "none",
                    borderRadius: "10px",
                    padding: "10px 18px",
                    fontSize: "13px",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>🔄</span>
                  <span>{syncState === "syncing" ? "Syncing..." : `Sync to Cloud (${unsyncedCount} Offline)`}</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Screenings Today</span>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "#166534", marginTop: "2px" }}>{screenings.length} Patients</div>
              </div>
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "16px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#991b1b", textTransform: "uppercase" }}>Urgent Red Flags</span>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "#dc2626", marginTop: "2px" }}>{urgentCount} Cases</div>
              </div>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "16px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>Local Offline Storage</span>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "#15803d", marginTop: "2px" }}>IndexedDB Active</div>
              </div>
            </div>

            {/* Recent Screenings Table */}
            <div style={{ background: "var(--surface, #ffffff)", border: "1px solid var(--border, #e2e8f0)", borderRadius: "14px", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0, color: "var(--foreground)" }}>
                  Recent Patient Screenings &amp; Triage Intakes
                </h3>
                <button
                  type="button"
                  onClick={onOpenScreening}
                  style={{
                    background: "#16a34a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "6px 14px",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ＋ Start New Screening
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {screenings.map((rec) => (
                  <div
                    key={rec.id}
                    style={{
                      background: "var(--surface-muted, #f8fafc)",
                      border: "1px solid var(--border, #e2e8f0)",
                      borderRadius: "10px",
                      padding: "14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <strong style={{ fontSize: "14px", color: "var(--foreground)" }}>
                          {rec.patient_ref} ({rec.age} yrs)
                        </strong>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "10px",
                            background: rec.urgency_tier === "urgent" || rec.urgency_tier === "emergency" ? "#fee2e2" : "#e0f2fe",
                            color: rec.urgency_tier === "urgent" || rec.urgency_tier === "emergency" ? "#991b1b" : "#0369a1",
                          }}
                        >
                          {rec.urgency_tier}
                        </span>
                        <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>📍 {rec.village}</span>
                      </div>
                      <div style={{ fontSize: "12.5px", color: "var(--foreground)", marginTop: "3px" }}>
                        <strong>Symptoms:</strong> {rec.symptoms.join(", ")}
                      </div>
                      <div style={{ fontSize: "11.5px", color: "var(--muted)", marginTop: "2px" }}>
                        SpO₂: {rec.spo2}% · Temp: {rec.temperature}°C · {rec.synced ? "✓ Cloud Synced" : "💾 Local Only"}
                      </div>
                    </div>

                    <div>
                      <span
                        style={{
                          fontSize: "11.5px",
                          fontWeight: 700,
                          padding: "3px 10px",
                          borderRadius: "12px",
                          background: rec.status === "doctor_evaluated" ? "#dcfce7" : "#fef3c7",
                          color: rec.status === "doctor_evaluated" ? "#166534" : "#92400e",
                        }}
                      >
                        {rec.status === "doctor_evaluated" ? "✓ Evaluated by Doctor" : "Awaiting Doctor Queue"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "camps" && <HealthCampFinder />}
        {activeTab === "nearby" && <NearbyCare />}
        {activeTab === "care" && <CareGuidance />}
        {activeTab === "library" && <DiseaseLibrary />}
      </main>
    </div>
  );
}
