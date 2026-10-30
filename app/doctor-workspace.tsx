"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n/provider";
import type { ScreeningRecord } from "@/lib/types";
import CareGuidance from "./care-guidance";
import PrescriptionTracker from "./prescription-tracker";
import CarePlanView from "./care-plan";
import DiseaseLibrary from "./disease-library";
import NearbyCare from "./nearby-care";
import { DoctorFollowupManager } from "./doctor-followup-manager";

interface DoctorWorkspaceProps {
  currentUser: { email?: string } | null;
  currentProfile: {
    display_name?: string;
    role?: string;
    full_name?: string;
    nmc_registration_number?: string;
    hospital_affiliation?: string;
    is_verified?: boolean;
  } | null;
  screenings: ScreeningRecord[];
  onDoctorEvaluate: (id: string, notes: string, prescription: string) => Promise<void>;
  onOpenHealthPass: (record: ScreeningRecord) => void;
  onSignOut: () => Promise<void>;
}

export function DoctorWorkspace({
  currentUser,
  currentProfile,
  screenings,
  onDoctorEvaluate,
  onOpenHealthPass,
  onSignOut,
}: DoctorWorkspaceProps) {
  const { t, effectiveLang, setLang } = useLanguage();
  const [activeTab, setActiveTab] = useState<"followups" | "cases" | "care" | "prescriptions" | "plan" | "library" | "nearby">("followups");

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "urgent" | "review" | "evaluated">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [doctorNotes, setDoctorNotes] = useState("");
  const [prescriptionAdvice, setPrescriptionAdvice] = useState("");
  const [submittingEval, setSubmittingEval] = useState(false);

  const docName =
    currentProfile?.full_name ||
    currentProfile?.display_name ||
    (currentUser?.email?.includes("ananya") ? "Dr. Ananya Sharma, MD" : "Dr. Rajesh Patel, MBBS");

  const regNo = currentProfile?.nmc_registration_number || (currentUser?.email?.includes("ananya") ? "DOC-ANANYA" : "DOC-RAJESH");
  const hospital = currentProfile?.hospital_affiliation || (currentUser?.email?.includes("ananya") ? "Pynursla CHC" : "Mawlynnong District Hospital");

  // Filtering for triage cases
  const normalizedQuery = query.trim().toLowerCase();
  const visibleRecords = screenings.filter((rec) => {
    const matchesQuery =
      !normalizedQuery ||
      `${rec.patient_ref} ${rec.village} ${rec.symptoms.join(" ")}`.toLowerCase().includes(normalizedQuery);
    const matchesFilter =
      filter === "all" ||
      (filter === "urgent" && (rec.urgency_tier === "urgent" || rec.urgency_tier === "emergency")) ||
      (filter === "review" && rec.urgency_tier === "review") ||
      (filter === "evaluated" && rec.status === "doctor_evaluated");
    return matchesQuery && matchesFilter;
  });

  const selectedRecord = screenings.find((rec) => rec.id === selectedId) ?? null;

  async function handleEvalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRecord) return;
    setSubmittingEval(true);
    await onDoctorEvaluate(selectedRecord.id, doctorNotes, prescriptionAdvice);
    setSubmittingEval(false);
  }

  const urgentCount = screenings.filter((s) => s.urgency_tier === "urgent" || s.urgency_tier === "emergency").length;
  const reviewCount = screenings.filter((s) => s.urgency_tier === "review").length;
  const evaluatedCount = screenings.filter((s) => s.status === "doctor_evaluated").length;

  return (
    <div className="doctor-workspace-shell" style={{ minHeight: "100vh", background: "var(--background, #f8fafc)", display: "flex", flexDirection: "column" }}>
      {/* ── Top Bar with Doctor NMC Credentials & Logout ─────────────────────── */}
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }} onClick={() => setActiveTab("cases")}>
            <span style={{ fontSize: "24px" }}>👨‍⚕️</span>
            <div>
              <strong style={{ fontSize: "16px", color: "#0284c7", display: "block", lineHeight: 1.1 }}>
                Arogya Relay
              </strong>
              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Doctor Clinical Workstation
              </span>
            </div>
          </div>

          {/* Verified Practitioner Badge */}
          <div
            style={{
              background: "#e0f2fe",
              border: "1px solid #bae6fd",
              color: "#0369a1",
              borderRadius: "16px",
              padding: "4px 12px",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ fontWeight: 800 }}>✓ {docName}</span>
            <span style={{ opacity: 0.7 }}>·</span>
            <span style={{ fontSize: "11px", fontWeight: 600 }}>NMC: {regNo}</span>
            <span style={{ opacity: 0.7 }}>·</span>
            <span style={{ fontSize: "11px", color: "#075985" }}>{hospital}</span>
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
          { id: "followups", label: "Patient Follow-ups & Chemist Suggestion", icon: "✉" },
          { id: "cases", label: `Triage Queue (${screenings.length})`, icon: "◎" },
          { id: "care", label: "Care Guidance (RAG)", icon: "✚" },
          { id: "prescriptions", label: "Digital Prescriptions", icon: "💊" },
          { id: "plan", label: "Care Plans & Adherence", icon: "♥" },
          { id: "library", label: "WHO/MoHFW Reference", icon: "📖" },
          { id: "nearby", label: "Referral Network", icon: "⌖" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: "12px 16px",
              border: "none",
              background: "transparent",
              borderBottom: activeTab === tab.id ? "3px solid #0284c7" : "3px solid transparent",
              color: activeTab === tab.id ? "#0284c7" : "var(--muted, #64748b)",
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
        {activeTab === "cases" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Triage Queue Summary Stats */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "14px",
              }}
            >
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "14px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#991b1b", textTransform: "uppercase" }}>Emergency / Urgent</span>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "#dc2626", marginTop: "2px" }}>{urgentCount} Cases</div>
              </div>
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "12px", padding: "14px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#92400e", textTransform: "uppercase" }}>Awaiting Review</span>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "#d97706", marginTop: "2px" }}>{reviewCount} Cases</div>
              </div>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "14px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>Evaluated &amp; Prescribed</span>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "#16a34a", marginTop: "2px" }}>{evaluatedCount} Cases</div>
              </div>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Total Intake</span>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--foreground)", marginTop: "2px" }}>{screenings.length} Screenings</div>
              </div>
            </div>

            {/* Search and Filters */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <input
                type="search"
                placeholder="Search patient ref, village, symptoms..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  minWidth: "280px",
                  padding: "9px 14px",
                  borderRadius: "10px",
                  border: "1.5px solid var(--border, #cbd5e1)",
                  fontSize: "13.5px",
                  background: "var(--surface)",
                  color: "var(--foreground)",
                }}
              />
              <div style={{ display: "flex", gap: "6px" }}>
                {[
                  { id: "all", label: "All Cases" },
                  { id: "urgent", label: "Urgent Flags" },
                  { id: "review", label: "Standard Review" },
                  { id: "evaluated", label: "Evaluated" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id as any)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: filter === f.id ? "1.5px solid #0284c7" : "1px solid var(--border)",
                      background: filter === f.id ? "#e0f2fe" : "var(--surface)",
                      color: filter === f.id ? "#0369a1" : "var(--foreground)",
                      fontWeight: filter === f.id ? 700 : 500,
                      fontSize: "12.5px",
                      cursor: "pointer",
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Case List Grid */}
            <div style={{ display: "grid", gridTemplateColumns: selectedRecord ? "1fr 1fr" : "1fr", gap: "18px" }}>
              {/* Cases Table */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {visibleRecords.map((rec) => {
                  const isUrgent = rec.urgency_tier === "urgent" || rec.urgency_tier === "emergency";
                  const isSelected = selectedId === rec.id;
                  return (
                    <div
                      key={rec.id}
                      onClick={() => {
                        setSelectedId(isSelected ? null : rec.id);
                        setDoctorNotes(rec.doctor_notes || "");
                        setPrescriptionAdvice(rec.prescription_advice || "");
                      }}
                      style={{
                        background: isSelected ? "#f0f9ff" : "var(--surface, #ffffff)",
                        border: isSelected ? "2px solid #0284c7" : "1px solid var(--border, #e2e8f0)",
                        borderRadius: "12px",
                        padding: "16px",
                        cursor: "pointer",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "14px",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <strong style={{ fontSize: "15px", color: "var(--foreground)" }}>
                            {rec.patient_ref} ({rec.age} yrs)
                          </strong>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: "10px",
                              background: isUrgent ? "#fee2e2" : "#f1f5f9",
                              color: isUrgent ? "#991b1b" : "#475569",
                            }}
                          >
                            {isUrgent ? "🚨 Urgent" : rec.urgency_tier}
                          </span>
                          <span style={{ fontSize: "11px", color: "var(--muted)" }}>📍 {rec.village}</span>
                        </div>
                        <div style={{ fontSize: "13px", color: "var(--foreground)", opacity: 0.9 }}>
                          <strong>Symptoms:</strong> {rec.symptoms.join(", ")}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                          Vitals: SpO₂ <strong>{rec.spo2}%</strong> · Temp <strong>{rec.temperature}°C</strong> · Attested by: {rec.screener_name || "ASHA"}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: "12px",
                            background: rec.status === "doctor_evaluated" ? "#dcfce7" : "#fef3c7",
                            color: rec.status === "doctor_evaluated" ? "#166534" : "#92400e",
                          }}
                        >
                          {rec.status === "doctor_evaluated" ? "✓ Evaluated" : "Pending Review"}
                        </span>
                        <div style={{ fontSize: "11px", color: "#0284c7", fontWeight: 700, marginTop: "6px" }}>
                          {isSelected ? "Selected ▲" : "Evaluate →"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Case Evaluation Panel */}
              {selectedRecord && (
                <div
                  style={{
                    background: "var(--surface, #ffffff)",
                    border: "2px solid #0284c7",
                    borderRadius: "14px",
                    padding: "22px",
                    boxShadow: "0 4px 16px rgba(2, 132, 199, 0.1)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#0284c7", textTransform: "uppercase" }}>
                        CLINICAL EVALUATION WORKBENCH
                      </span>
                      <h2 style={{ fontSize: "18px", fontWeight: 800, margin: "2px 0", color: "var(--foreground)" }}>
                        {selectedRecord.patient_ref} · {selectedRecord.village}
                      </h2>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => onOpenHealthPass(selectedRecord)}
                        style={{
                          background: "#f0f9ff",
                          border: "1px solid #bae6fd",
                          color: "#0369a1",
                          borderRadius: "8px",
                          padding: "5px 10px",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        🪪 Health Pass
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        style={{
                          background: "transparent",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          padding: "5px 10px",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Vitals & Intake summary */}
                  <div
                    style={{
                      background: "var(--surface-muted, #f8fafc)",
                      borderRadius: "10px",
                      padding: "12px",
                      fontSize: "12.5px",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px",
                    }}
                  >
                    <div><strong>Age:</strong> {selectedRecord.age} yrs</div>
                    <div><strong>SpO₂:</strong> {selectedRecord.spo2}%</div>
                    <div><strong>Temperature:</strong> {selectedRecord.temperature}°C</div>
                    <div><strong>Field Worker:</strong> {selectedRecord.screener_name || "ASHA"}</div>
                    <div style={{ gridColumn: "1 / -1" }}><strong>Reported Symptoms:</strong> {selectedRecord.symptoms.join(", ")}</div>
                    {selectedRecord.field_notes && (
                      <div style={{ gridColumn: "1 / -1" }}><strong>Field Notes:</strong> {selectedRecord.field_notes}</div>
                    )}
                  </div>

                  {/* Evaluation Form / Existing Evaluation */}
                  {selectedRecord.status === "doctor_evaluated" ? (
                    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "14px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>
                        ✓ Completed Clinical Decision ({selectedRecord.evaluated_by || docName})
                      </span>
                      <p style={{ margin: "6px 0", fontSize: "13.5px" }}><strong>Diagnosis / Notes:</strong> {selectedRecord.doctor_notes}</p>
                      <p style={{ margin: "6px 0", fontSize: "13.5px" }}><strong>Prescription / Home Care:</strong> {selectedRecord.prescription_advice}</p>
                    </div>
                  ) : (
                    <form onSubmit={handleEvalSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div>
                        <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--foreground)", display: "block", marginBottom: "4px" }}>
                          Clinical Diagnosis &amp; Evaluation Notes:
                        </label>
                        <textarea
                          required
                          rows={2}
                          value={doctorNotes}
                          onChange={(e) => setDoctorNotes(e.target.value)}
                          placeholder="e.g. Acute upper respiratory infection with mild hypoxemia. Rule out bacterial bronchitis."
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            border: "1.5px solid var(--border)",
                            fontSize: "13px",
                            background: "var(--surface)",
                            color: "var(--foreground)",
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--foreground)", display: "block", marginBottom: "4px" }}>
                          Prescription Advice &amp; Drug Regimen:
                        </label>
                        <textarea
                          required
                          rows={2}
                          value={prescriptionAdvice}
                          onChange={(e) => setPrescriptionAdvice(e.target.value)}
                          placeholder="e.g. Tab Paracetamol 500mg TDS for 3 days. Saline nasal drops. Hydration and review after 48 hrs."
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            border: "1.5px solid var(--border)",
                            fontSize: "13px",
                            background: "var(--surface)",
                            color: "var(--foreground)",
                          }}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submittingEval}
                        style={{
                          background: "#0284c7",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "10px",
                          padding: "10px",
                          fontWeight: 700,
                          fontSize: "13.5px",
                          cursor: "pointer",
                        }}
                      >
                        {submittingEval ? "Saving Clinical Order..." : "✓ Sign & Authorize Prescription"}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "followups" && <DoctorFollowupManager doctorName={docName} doctorNmc={regNo} />}
        {activeTab === "care" && <CareGuidance />}
        {activeTab === "prescriptions" && <PrescriptionTracker userRole="doctor" />}
        {activeTab === "plan" && <CarePlanView />}
        {activeTab === "library" && <DiseaseLibrary />}
        {activeTab === "nearby" && <NearbyCare />}
      </main>
    </div>
  );
}
