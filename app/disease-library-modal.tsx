"use client";

import React, { useState, useRef } from "react";
import {
  COMMON_DISEASES,
  findDiseasesBySymptom,
  type CommonDisease,
} from "@/lib/clinical/disease-library";
import { scanLesionImage, type VisualScanResult } from "@/lib/clinical/visual-scanner";
import {
  getSavedReminders,
  toggleReminderState,
  requestNotificationPermission,
  triggerDoseAlert,
  isNotificationSupported,
  type MedicationReminder,
} from "@/lib/notifications/medication-scheduler";
import { IconTooltip } from "./icon-tooltip";

export interface DiseaseLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export function DiseaseLibraryModal({
  isOpen,
  onClose,
  initialQuery = "",
}: DiseaseLibraryModalProps) {
  const [tab, setTab] = useState<"library" | "scanner" | "reminders">("library");
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDisease, setSelectedDisease] = useState<CommonDisease | null>(COMMON_DISEASES[0]);

  // Visual Scanner State
  const [scanImageFile, setScanImageFile] = useState<File | null>(null);
  const [scanPreviewUrl, setScanPreviewUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<VisualScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reminders State
  const [reminders, setReminders] = useState<MedicationReminder[]>(getSavedReminders());
  const [notificationPerm, setNotificationPerm] = useState<string>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  );

  if (!isOpen) return null;

  // Filter diseases by category and search query
  let filteredDiseases = findDiseasesBySymptom(searchQuery);
  if (selectedCategory !== "all") {
    filteredDiseases = filteredDiseases.filter((d) => d.category === selectedCategory);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanImageFile(file);
    const url = URL.createObjectURL(file);
    setScanPreviewUrl(url);
    setScanError(null);
    setScanResult(null);

    // Auto-run scanner
    runVisualScan(file);
  }

  async function runVisualScan(source: File | string) {
    setScanning(true);
    setScanError(null);
    try {
      const res = await scanLesionImage(source);
      setScanResult(res);
      if (res.topMatches.length > 0) {
        setSelectedDisease(res.topMatches[0].disease);
      }
    } catch (err: any) {
      setScanError(err.message || "Could not analyze the lesion image.");
    } finally {
      setScanning(false);
    }
  }

  async function handleEnablePush() {
    const perm = await requestNotificationPermission();
    setNotificationPerm(perm);
    if (perm === "granted" && reminders.length > 0) {
      triggerDoseAlert(reminders[0]);
    }
  }

  function handleToggleReminder(id: string) {
    const updated = toggleReminderState(id);
    setReminders(updated);
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disease-lib-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
        display: "grid",
        placeItems: "center",
        padding: "16px",
      }}
    >
      <div
        className="screening-modal"
        style={{
          width: "min(960px, 100%)",
          maxHeight: "calc(100vh - 32px)",
          background: "#ffffff",
          borderRadius: "20px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.35)",
        }}
      >
        {/* Header */}
        <header
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "24px" }}>📚</span>
            <div>
              <h2
                id="disease-lib-title"
                style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#0f172a" }}
              >
                Common Diseases, Remedies & AI Visual Scanner
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#64748b" }}>
                100% Free · Verified WHO/MoHFW Community Guidelines · In-Browser Photo Recognition
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              width: "32px",
              height: "32px",
              fontSize: "18px",
              fontWeight: 700,
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
            }}
          >
            ✕
          </button>
        </header>

        {/* Modal Tabs */}
        <div
          style={{
            display: "flex",
            background: "#ffffff",
            borderBottom: "1px solid #e2e8f0",
            padding: "0 20px",
            gap: "12px",
          }}
        >
          <button
            type="button"
            onClick={() => setTab("library")}
            style={{
              padding: "12px 14px",
              fontSize: "12.5px",
              fontWeight: tab === "library" ? 800 : 600,
              color: tab === "library" ? "var(--sc-accent, #17644f)" : "#64748b",
              border: "none",
              background: "transparent",
              borderBottom: tab === "library" ? "3px solid var(--sc-accent, #17644f)" : "3px solid transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>📖</span>
            <span>Disease Library & Remedies ({COMMON_DISEASES.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("scanner")}
            style={{
              padding: "12px 14px",
              fontSize: "12.5px",
              fontWeight: tab === "scanner" ? 800 : 600,
              color: tab === "scanner" ? "var(--sc-accent, #17644f)" : "#64748b",
              border: "none",
              background: "transparent",
              borderBottom: tab === "scanner" ? "3px solid var(--sc-accent, #17644f)" : "3px solid transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>📷</span>
            <span>AI Visual Disease Scanner (Free)</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("reminders")}
            style={{
              padding: "12px 14px",
              fontSize: "12.5px",
              fontWeight: tab === "reminders" ? 800 : 600,
              color: tab === "reminders" ? "var(--sc-accent, #17644f)" : "#64748b",
              border: "none",
              background: "transparent",
              borderBottom: tab === "reminders" ? "3px solid var(--sc-accent, #17644f)" : "3px solid transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>🔔</span>
            <span>Prescription Dose Push Alerts</span>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {/* TAB 1: DISEASE LIBRARY & REMEDIES */}
          {tab === "library" && (
            <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "20px", alignItems: "start" }}>
              {/* Left Column: Filter & Disease List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {/* Search Bar */}
                <input
                  type="text"
                  placeholder="Search disease or symptom (e.g. rash, fever, itch)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "12px",
                    background: "#f8fafc",
                  }}
                />

                {/* Category Pills */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {[
                    { id: "all", label: "All" },
                    { id: "dermatological", label: "Skin & Rash" },
                    { id: "fever_vector", label: "Fevers" },
                    { id: "gastrointestinal", label: "Stomach" },
                    { id: "respiratory", label: "Cough & Flu" },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCategory(c.id)}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "10.5px",
                        fontWeight: 700,
                        border: "1px solid #cbd5e1",
                        background: selectedCategory === c.id ? "var(--sc-accent, #17644f)" : "#ffffff",
                        color: selectedCategory === c.id ? "#ffffff" : "#475569",
                        cursor: "pointer",
                      }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                {/* Disease List */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    maxHeight: "440px",
                    overflowY: "auto",
                    paddingRight: "4px",
                  }}
                >
                  {filteredDiseases.map((d) => {
                    const isSelected = selectedDisease?.id === d.id;
                    return (
                      <div
                        key={d.id}
                        onClick={() => setSelectedDisease(d)}
                        style={{
                          padding: "10px 12px",
                          borderRadius: "10px",
                          border: isSelected ? "2px solid var(--sc-accent, #17644f)" : "1px solid #e2e8f0",
                          background: isSelected ? "#f0fdf4" : "#ffffff",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <strong
                            style={{
                              fontSize: "12.5px",
                              color: isSelected ? "var(--sc-accent, #17644f)" : "#0f172a",
                            }}
                          >
                            {d.name}
                          </strong>
                          <span
                            style={{
                              fontSize: "9px",
                              fontWeight: 800,
                              textTransform: "uppercase",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              background:
                                d.urgency === "emergency"
                                  ? "#fee2e2"
                                  : d.urgency === "urgent"
                                  ? "#ffedd5"
                                  : "#dcfce7",
                              color:
                                d.urgency === "emergency"
                                  ? "#b91c1c"
                                  : d.urgency === "urgent"
                                  ? "#c2410c"
                                  : "#15803d",
                            }}
                          >
                            {d.urgency}
                          </span>
                        </div>
                        {d.hindiName && (
                          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                            {d.hindiName} · {d.odiaName}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Selected Disease Details, Remedies, and Red Flags */}
              {selectedDisease ? (
                <div style={{ display: "grid", gap: "16px" }}>
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "14px",
                      padding: "18px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <div>
                        <h3 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                          {selectedDisease.name}
                        </h3>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                          {selectedDisease.hindiName} ({selectedDisease.odiaName})
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          padding: "3px 10px",
                          borderRadius: "12px",
                          background:
                            selectedDisease.urgency === "emergency"
                              ? "#fee2e2"
                              : selectedDisease.urgency === "urgent"
                              ? "#ffedd5"
                              : "#dcfce7",
                          color:
                            selectedDisease.urgency === "emergency"
                              ? "#b91c1c"
                              : selectedDisease.urgency === "urgent"
                              ? "#c2410c"
                              : "#15803d",
                        }}
                      >
                        Triage: {selectedDisease.urgency}
                      </span>
                    </div>

                    <p style={{ margin: "0 0 14px", fontSize: "13px", color: "#334155", lineHeight: 1.5 }}>
                      {selectedDisease.summary}
                    </p>

                    {/* Common Symptoms */}
                    <div style={{ marginBottom: "14px" }}>
                      <strong style={{ display: "block", fontSize: "12px", color: "#0f172a", marginBottom: "6px" }}>
                        🔍 Key Clinical Signs & Symptoms:
                      </strong>
                      <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "#475569", lineHeight: 1.6 }}>
                        {selectedDisease.symptoms.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Verified Home Remedies */}
                    <div
                      style={{
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        borderRadius: "10px",
                        padding: "14px",
                        marginBottom: "14px",
                      }}
                    >
                      <strong style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: "#166534", marginBottom: "6px" }}>
                        <span>🌿</span>
                        <span>Verified Home Care & Supportive Remedies:</span>
                      </strong>
                      <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "#15803d", lineHeight: 1.6 }}>
                        {selectedDisease.homeRemedies.map((r, idx) => (
                          <li key={idx}>{r}</li>
                        ))}
                      </ul>
                    </div>

                    {/* OTC Guidance */}
                    <div
                      style={{
                        background: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        borderRadius: "10px",
                        padding: "14px",
                        marginBottom: "14px",
                      }}
                    >
                      <strong style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: "#1e40af", marginBottom: "6px" }}>
                        <span>💊</span>
                        <span>First-Line Over-The-Counter (OTC) Guidance:</span>
                      </strong>
                      <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "#2563eb", lineHeight: 1.6 }}>
                        {selectedDisease.otcGuidance.map((o, idx) => (
                          <li key={idx}>{o}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Red Flags / Danger Signs */}
                    <div
                      style={{
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        borderRadius: "10px",
                        padding: "14px",
                      }}
                    >
                      <strong style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: "#991b1b", marginBottom: "6px" }}>
                        <span>⚠️</span>
                        <span>DANGER SIGNS — Immediate Hospital Transfer:</span>
                      </strong>
                      <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "#b91c1c", lineHeight: 1.6 }}>
                        {selectedDisease.dangerSigns.map((d, idx) => (
                          <li key={idx}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 2: AI VISUAL LESION SCANNER */}
          {tab === "scanner" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", alignItems: "start" }}>
              {/* Left Column: Image Input */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "14px",
                  padding: "18px",
                }}
              >
                <h3 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
                  📷 Scan Lesion, Rash or Eye Redness
                </h3>
                <p style={{ margin: "0 0 16px", fontSize: "12px", color: "#64748b" }}>
                  Upload a photo or capture an image using your device camera. Our in-browser visual engine extracts erythema, annular patterns, and margin textures with zero paid API keys!
                </p>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: "2px dashed #94a3b8",
                    borderRadius: "12px",
                    padding: "24px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: "#f8fafc",
                    marginBottom: "14px",
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: "none" }}
                  />
                  {scanPreviewUrl ? (
                    <div>
                      <img
                        src={scanPreviewUrl}
                        alt="Scanned lesion"
                        style={{
                          maxWidth: "100%",
                          maxHeight: "180px",
                          borderRadius: "8px",
                          objectFit: "contain",
                          boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                        }}
                      />
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "8px" }}>
                        Click to change photo
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: "36px", marginBottom: "8px" }}>📸</div>
                      <strong style={{ fontSize: "13px", color: "#0f172a" }}>
                        Click to Upload or Take a Picture
                      </strong>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                        Supports JPEG, PNG, WEBP from camera or gallery
                      </div>
                    </div>
                  )}
                </div>

                {scanning && (
                  <div style={{ padding: "12px", background: "#eff6ff", color: "#1e40af", borderRadius: "8px", fontSize: "12px", textAlign: "center" }}>
                    🔄 Analyzing visual spectrum, redness index, and border geometry...
                  </div>
                )}

                {scanError && (
                  <div style={{ padding: "12px", background: "#fef2f2", color: "#991b1b", borderRadius: "8px", fontSize: "12px" }}>
                    {scanError}
                  </div>
                )}
              </div>

              {/* Right Column: Scan Matches & Guidance */}
              <div>
                {scanResult ? (
                  <div style={{ display: "grid", gap: "14px" }}>
                    {/* Visual Metrics Pill */}
                    <div style={{ background: "#f1f5f9", padding: "12px", borderRadius: "10px", fontSize: "11.5px" }}>
                      <strong style={{ display: "block", marginBottom: "4px", color: "#0f172a" }}>
                        🔬 Extracted Visual Metrics:
                      </strong>
                      <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", color: "#475569" }}>
                        <span>Redness / Erythema: <strong>{(scanResult.metrics.erythemaIndex * 100).toFixed(0)}%</strong></span>
                        <span>Annular Ring Score: <strong>{(scanResult.metrics.annularScore * 100).toFixed(0)}%</strong></span>
                        <span>Color Tone: <strong style={{ textTransform: "capitalize" }}>{scanResult.metrics.colorCategory}</strong></span>
                      </div>
                    </div>

                    <h4 style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
                      Top Matched Conditions:
                    </h4>

                    {scanResult.topMatches.map((match, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: "#ffffff",
                          border: "1.5px solid #cbd5e1",
                          borderRadius: "12px",
                          padding: "14px",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                            {idx + 1}. {match.disease.name}
                          </strong>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 800,
                              background: match.confidence > 70 ? "#dcfce7" : "#ffedd5",
                              color: match.confidence > 70 ? "#15803d" : "#c2410c",
                              padding: "2px 8px",
                              borderRadius: "10px",
                            }}
                          >
                            {match.confidence}% Match
                          </span>
                        </div>
                        <p style={{ margin: "0 0 8px", fontSize: "11.5px", color: "#64748b" }}>
                          {match.matchReason}
                        </p>
                        <div style={{ fontSize: "11.5px", background: "#f0fdf4", padding: "8px 10px", borderRadius: "6px", color: "#166534" }}>
                          <strong>Recommended Home Care:</strong> {match.disease.homeRemedies[0]}
                        </div>
                        <div style={{ marginTop: "6px", fontSize: "11px", color: "#1e40af" }}>
                          <strong>OTC Therapy:</strong> {match.disease.otcGuidance[0]}
                        </div>
                      </div>
                    ))}

                    <div style={{ fontSize: "10.5px", color: "#64748b", fontStyle: "italic", background: "#fffbeb", padding: "10px", borderRadius: "8px" }}>
                      ℹ️ {scanResult.safetyDisclaimer}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "40px 20px",
                      textAlign: "center",
                      background: "#f8fafc",
                      borderRadius: "14px",
                      border: "1px dashed #cbd5e1",
                      color: "#64748b",
                      fontSize: "12.5px",
                    }}
                  >
                    Select an image on the left to see instant AI visual suggestions, confidence score, and home care remedies.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PRESCRIPTION DOSE PUSH ALERTS */}
          {tab === "reminders" && (
            <div style={{ maxWidth: "680px", margin: "0 auto", display: "grid", gap: "16px" }}>
              <div
                style={{
                  background: "linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)",
                  border: "1.5px solid #10b981",
                  borderRadius: "14px",
                  padding: "16px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <h4 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 800, color: "#065f46" }}>
                    🔔 Native Browser Push Reminders
                  </h4>
                  <p style={{ margin: 0, fontSize: "12px", color: "#047857" }}>
                    Patients receive gentle sound and popup dose alerts on their phone or laptop. 100% free, zero SMS or API costs!
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleEnablePush}
                  className="primary-button"
                  style={{
                    padding: "8px 16px",
                    fontSize: "12px",
                    fontWeight: 700,
                    background: notificationPerm === "granted" ? "#059669" : "#0284c7",
                  }}
                >
                  {notificationPerm === "granted" ? "✓ Reminders Active (Test Chime)" : "Enable Browser Notifications"}
                </button>
              </div>

              {/* Reminders List */}
              <div style={{ display: "grid", gap: "10px" }}>
                <h4 style={{ margin: "10px 0 4px", fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
                  Scheduled Dose Alarms:
                </h4>

                {reminders.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "14px 16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "16px" }}>💊</span>
                        <strong style={{ fontSize: "13.5px", color: "#0f172a" }}>{r.medicineName}</strong>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: "10px",
                            background: "#e0f2fe",
                            color: "#0369a1",
                            textTransform: "uppercase",
                          }}
                        >
                          {r.timing}
                        </span>
                      </div>
                      <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "4px" }}>
                        Dosage: <strong>{r.dosage}</strong> · Scheduled for:{" "}
                        <strong>{String(r.hour).padStart(2, "0")}:{String(r.minute).padStart(2, "0")}</strong>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <button
                        type="button"
                        onClick={() => triggerDoseAlert(r)}
                        style={{
                          background: "#f1f5f9",
                          border: "1px solid #cbd5e1",
                          borderRadius: "8px",
                          padding: "6px 10px",
                          fontSize: "11px",
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        🔔 Test Alert
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleReminder(r.id)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "8px",
                          border: "none",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          background: r.enabled ? "#dcfce7" : "#f1f5f9",
                          color: r.enabled ? "#15803d" : "#64748b",
                        }}
                      >
                        {r.enabled ? "Active" : "Paused"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
