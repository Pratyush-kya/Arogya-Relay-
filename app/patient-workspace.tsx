"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n/provider";
import { HealthCampFinder } from "./health-camp-finder";
import { ReadAloud } from "./read-aloud";
import PrescriptionTracker from "./prescription-tracker";
import DiseaseLibrary from "./disease-library";
import NearbyCare from "./nearby-care";
import type { ScreeningRecord } from "@/lib/types";
import {
  HeroFeedbackModal,
  HeroInstructionsModal,
  FloatingFeedbackButton,
} from "./hero-feedback-and-instructions";

interface PatientWorkspaceProps {
  currentUser: { email?: string } | null;
  currentProfile: { display_name?: string; role?: string; full_name?: string } | null;
  onSignOut: () => Promise<void>;
  patientRecord?: ScreeningRecord | null;
}

export function PatientWorkspace({
  currentUser,
  currentProfile,
  onSignOut,
  patientRecord,
}: PatientWorkspaceProps) {
  const { t, effectiveLang, setLang } = useLanguage();
  const [activeTab, setActiveTab] = useState<"overview" | "camps" | "prescriptions" | "gyan" | "nearby">("overview");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  const displayName = currentProfile?.display_name || currentProfile?.full_name || currentUser?.email?.split("@")[0] || "Citizen";

  return (
    <div className="patient-workspace-shell" style={{ minHeight: "100vh", background: "var(--background, #f8fafc)", display: "flex", flexDirection: "column" }}>
      {/* ── Top Bar with Citizen Identity & Single Logout ─────────────────────── */}
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }} onClick={() => setActiveTab("overview")}>
            <span style={{ fontSize: "24px" }}>🌿</span>
            <div>
              <strong style={{ fontSize: "16px", color: "#065f46", display: "block", lineHeight: 1.1 }}>
                Arogya Relay
              </strong>
              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Citizen &amp; Family Health Portal
              </span>
            </div>
          </div>

          {/* Persona Badge */}
          <div
            style={{
              background: "#dcfce7",
              border: "1px solid #bbf7d0",
              color: "#166534",
              borderRadius: "20px",
              padding: "3px 12px",
              fontSize: "12px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>👤</span>
            <span>{displayName}</span>
          </div>
        </div>

        {/* Right Nav: Language & Logout */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
          { id: "overview", label: "Overview & Health Pass", icon: "⌂" },
          { id: "camps", label: "District Health Camps", icon: "📍" },
          { id: "prescriptions", label: "My Prescriptions", icon: "💊" },
          { id: "gyan", label: "Arogya Gyan (Remedies)", icon: "📖" },
          { id: "nearby", label: "Nearby Healthcare", icon: "⌖" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: "12px 16px",
              border: "none",
              background: "transparent",
              borderBottom: activeTab === tab.id ? "3px solid #047857" : "3px solid transparent",
              color: activeTab === tab.id ? "#047857" : "var(--muted, #64748b)",
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
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            {/* Welcome & ABHA Header */}
            <div
              style={{
                background: "linear-gradient(135deg, #047857 0%, #065f46 100%)",
                color: "#ffffff",
                borderRadius: "16px",
                padding: "24px 28px",
                boxShadow: "0 6px 20px rgba(4, 120, 87, 0.18)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "16px",
              }}
            >
              <div>
                <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", opacity: 0.9 }}>
                  🌟 UNIVERSAL CITIZEN HEALTH PORTAL
                </span>
                <h1 style={{ fontSize: "24px", fontWeight: 800, margin: "6px 0", color: "#ffffff" }}>
                  Namaste, {displayName}
                </h1>
                <p style={{ margin: 0, fontSize: "14px", opacity: 0.92, maxWidth: "600px", lineHeight: 1.45 }}>
                  Access your digital prescriptions, verified home remedies with voice narration, and locate nearby health camps in your district.
                </p>
                <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setInstructionsOpen(true)}
                    style={{
                      background: "rgba(255,255,255,0.18)",
                      color: "#ffffff",
                      border: "1px solid rgba(255,255,255,0.35)",
                      borderRadius: "8px",
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <span>📖</span>
                    <span>How to Use Guide</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackOpen(true)}
                    style={{
                      background: "#fef3c7",
                      color: "#92400e",
                      border: "1px solid #fde68a",
                      borderRadius: "8px",
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <span>💬</span>
                    <span>Facing an Issue? Give Feedback</span>
                  </button>
                </div>
              </div>

              {/* Digital Pass Token Badge */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.15)",
                  borderRadius: "12px",
                  padding: "12px 18px",
                  backdropFilter: "blur(4px)",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <span style={{ fontSize: "28px" }}>🪪</span>
                <div>
                  <span style={{ fontSize: "10.5px", textTransform: "uppercase", fontWeight: 700, opacity: 0.85, display: "block" }}>
                    Universal Health Pass
                  </span>
                  <strong style={{ fontSize: "14px", letterSpacing: "1px" }}>
                    {currentUser?.email?.includes("ramesh") ? "PAT-SOREN-92" : "ABHA-CITIZEN-01"}
                  </strong>
                </div>
              </div>
            </div>

            {/* Emergency 112 Strip */}
            <div
              style={{
                background: "#fef2f2",
                border: "1.5px solid #f87171",
                borderRadius: "12px",
                padding: "12px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "22px" }}>🚨</span>
                <div>
                  <strong style={{ fontSize: "14px", color: "#991b1b", display: "block" }}>
                    Emergency Medical Assistance (Free 24x7)
                  </strong>
                  <span style={{ fontSize: "12px", color: "#b91c1c" }}>
                    Call 112 immediately for severe chest pain, breathing difficulty, or trauma.
                  </span>
                </div>
              </div>
              <a
                href="tel:112"
                style={{
                  background: "#dc2626",
                  color: "#ffffff",
                  padding: "8px 18px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "13px",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                📞 Call 112
              </a>
            </div>

            {/* 4 Primary Action Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "18px" }}>
              {/* Card 1: District Health Camps */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveTab("camps")}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setActiveTab("camps"); }}
                style={{
                  background: "var(--surface, #ffffff)",
                  border: "2px solid #047857",
                  borderRadius: "16px",
                  padding: "22px",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(4, 120, 87, 0.08)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <span style={{ fontSize: "32px" }}>📍</span>
                <h3 style={{ fontSize: "18px", fontWeight: 800, margin: 0, color: "var(--foreground, #0f172a)" }}>
                  District Health Camps
                </h3>
                <p style={{ margin: 0, fontSize: "13.5px", color: "var(--muted, #64748b)", lineHeight: 1.45 }}>
                  Find free eye checkups, mobile health units, and generic medicine distribution in your native district or while traveling.
                </p>
                <span style={{ marginTop: "auto", fontWeight: 700, fontSize: "13.5px", color: "#047857" }}>
                  Find Nearby Camps →
                </span>
              </div>

              {/* Card 2: My Prescriptions */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveTab("prescriptions")}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setActiveTab("prescriptions"); }}
                style={{
                  background: "var(--surface, #ffffff)",
                  border: "2px solid #0284c7",
                  borderRadius: "16px",
                  padding: "22px",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(2, 132, 199, 0.08)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <span style={{ fontSize: "32px" }}>💊</span>
                <h3 style={{ fontSize: "18px", fontWeight: 800, margin: 0, color: "var(--foreground, #0f172a)" }}>
                  My Prescriptions
                </h3>
                <p style={{ margin: 0, fontSize: "13.5px", color: "var(--muted, #64748b)", lineHeight: 1.45 }}>
                  View doctor prescriptions, daily dosage reminder alarms, single-use QR pass, and PMBJP generic drug equivalents.
                </p>
                <span style={{ marginTop: "auto", fontWeight: 700, fontSize: "13.5px", color: "#0284c7" }}>
                  View Medicines →
                </span>
              </div>

              {/* Card 3: Arogya Gyan */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveTab("gyan")}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setActiveTab("gyan"); }}
                style={{
                  background: "var(--surface, #ffffff)",
                  border: "2px solid #8b5cf6",
                  borderRadius: "16px",
                  padding: "22px",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(139, 92, 246, 0.08)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <span style={{ fontSize: "32px" }}>📖</span>
                <h3 style={{ fontSize: "18px", fontWeight: 800, margin: 0, color: "var(--foreground, #0f172a)" }}>
                  Arogya Gyan (Remedies)
                </h3>
                <p style={{ margin: 0, fontSize: "13.5px", color: "var(--muted, #64748b)", lineHeight: 1.45 }}>
                  10+ verified illnesses, safe home remedies, and danger signs with on-device HD voice narration in your mother tongue.
                </p>
                <span style={{ marginTop: "auto", fontWeight: 700, fontSize: "13.5px", color: "#8b5cf6" }}>
                  Explore Remedies →
                </span>
              </div>
            </div>

            {/* Embedded District Camp Preview */}
            <div style={{ marginTop: "8px" }}>
              <HealthCampFinder />
            </div>
          </div>
        )}

        {activeTab === "camps" && <HealthCampFinder />}
        {activeTab === "prescriptions" && <PrescriptionTracker userRole="patient" />}
        {activeTab === "gyan" && <DiseaseLibrary onClose={() => setActiveTab("overview")} />}
        {activeTab === "nearby" && <NearbyCare />}
      </main>

      {/* Modals & Floating Help/Feedback Button */}
      <HeroFeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
      <HeroInstructionsModal
        isOpen={instructionsOpen}
        onClose={() => setInstructionsOpen(false)}
      />
      <FloatingFeedbackButton
        onOpenFeedback={() => setFeedbackOpen(true)}
        onOpenGuide={() => setInstructionsOpen(true)}
      />
    </div>
  );
}
