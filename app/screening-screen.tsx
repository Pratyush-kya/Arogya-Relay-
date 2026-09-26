"use client";

import { FormEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { type Profile, uploadToStorage } from "@/lib/supabase/client";
import { submitScreening, type ScreeningRecord } from "@/lib/supabase/screenings";
import { useLanguage } from "@/lib/i18n/provider";
import { startVitalsListening, isSpeechRecognitionSupported } from "@/lib/voice/vitals-dictation";
import { AnatomicalBodyMap } from "./body-map";
import { LanguageSwitcher } from "./language-switcher";
import { IconTooltip } from "./icon-tooltip";

export interface ScreeningScreenProps {
  onBackToDashboard: () => void;
  onSaveSuccess: (record: ScreeningRecord) => void;
  currentUser: User | null;
  currentProfile: Profile | null;
}

export function ScreeningScreen({
  onBackToDashboard,
  onSaveSuccess,
  currentUser,
  currentProfile,
}: ScreeningScreenProps) {
  const { t } = useLanguage();

  // Form states
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("34");
  const [patientSex, setPatientSex] = useState<"female" | "male" | "other">("female");
  const [patientPhone, setPatientPhone] = useState("");
  const [village, setVillage] = useState("North Ridge Block");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(["Fever", "Cough"]);
  const [showBodyMap, setShowBodyMap] = useState(false);

  // Vitals
  const [systolic, setSystolic] = useState("120");
  const [diastolic, setDiastolic] = useState("80");
  const [heartRate, setHeartRate] = useState("76");
  const [temperature, setTemperature] = useState("37.2");
  const [spo2, setSpo2] = useState("98");
  const [respiratoryRate, setRespiratoryRate] = useState("18");

  // Lesion photo
  const [lesionPhotoUrl, setLesionPhotoUrl] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);

  // Triage & Notes
  const [urgencyTier, setUrgencyTier] = useState<"routine" | "moderate" | "urgent" | "emergency">("routine");
  const [clinicalNotes, setClinicalNotes] = useState("");

  // Voice dictation
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [stopListeningFn, setStopListeningFn] = useState<(() => void) | null>(null);

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Critical danger flags check
  const numSpo2 = parseFloat(spo2) || 98;
  const numTemp = parseFloat(temperature) || 37.0;
  const isCriticalDanger = numSpo2 < 90 || numTemp >= 39.0;

  // Auto-adjust urgency tier if vitals indicate emergency
  useEffect(() => {
    if (numSpo2 < 90 || numTemp >= 39.0) {
      setUrgencyTier("emergency");
    }
  }, [numSpo2, numTemp]);

  // Keyboard Escape listener to return to dashboard
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onBackToDashboard();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onBackToDashboard]);

  function toggleVoice() {
    if (isListeningVoice) {
      stopListeningFn?.();
      setIsListeningVoice(false);
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      setVoiceTranscript("Speech recognition is not supported in this browser.");
      return;
    }

    try {
      const stop = startVitalsListening(
        (vitals) => {
          if (vitals.temperature) setTemperature(String(vitals.temperature));
          if (vitals.spo2) setSpo2(String(vitals.spo2));
          if (vitals.age) setPatientAge(String(vitals.age));
          if (vitals.village) setVillage(vitals.village);
          if (vitals.symptoms && vitals.symptoms.length > 0) {
            setSelectedSymptoms((prev) => Array.from(new Set([...prev, ...vitals.symptoms])));
          }
          setVoiceTranscript(`Captured: ${vitals.rawTranscript || "Vitals applied"}`);
          setIsListeningVoice(false);
        },
        (err) => {
          setVoiceTranscript(`Voice error: ${err}`);
          setIsListeningVoice(false);
        }
      );
      setStopListeningFn(() => stop);
      setIsListeningVoice(true);
      setVoiceTranscript("Listening... Speak vitals (e.g. 'fever 38.5, spo2 94, cough')");
    } catch {
      setVoiceTranscript("Voice listening error.");
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const res = await uploadToStorage(
        "screenings",
        `lesion_${Date.now()}_${file.name.replace(/\s+/g, "_")}`,
        file
      );
      setLesionPhotoUrl(res.url);
    } catch {
      // Offline fallback
    } finally {
      setPhotoUploading(false);
    }
  }

  function toggleSymptom(sym: string) {
    setSelectedSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!patientName.trim()) {
      setErrorMessage("Please enter patient name.");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const pseudoId = `PT-${Math.floor(1000 + Math.random() * 9000)}`;
      const screenerId = currentProfile?.pseudo_id || currentUser?.id || "ASHA-NR-01";
      const screenerName = currentProfile?.display_name || currentUser?.email || "Sunita Devi (ASHA)";
      const screenerRole = currentProfile?.role || "health_worker";

      const record = await submitScreening({
        pseudo_id: pseudoId,
        village_cluster: village.trim() || "North Ridge Block",
        demographics: {
          age: parseInt(patientAge, 10) || 30,
          sex: patientSex,
          phone: patientPhone.trim() || undefined,
          patientName: patientName.trim(),
        },
        vitals: {
          temp_celsius: parseFloat(temperature) || 37.0,
          spo2: parseInt(spo2, 10) || 98,
          systolic_bp: parseInt(systolic, 10) || 120,
          diastolic_bp: parseInt(diastolic, 10) || 80,
          heart_rate_bpm: parseInt(heartRate, 10) || 76,
          respiratory_rate_bpm: parseInt(respiratoryRate, 10) || 18,
        },
        chief_complaint: chiefComplaint.trim() || selectedSymptoms.join(", ") || "General checkup",
        symptoms: selectedSymptoms,
        urgency_tier: urgencyTier,
        screener_id: screenerId,
        screener_name: screenerName,
        screener_role: screenerRole,
        image_url: lesionPhotoUrl || undefined,
        clinical_notes: clinicalNotes.trim() || undefined,
      });

      onSaveSuccess(record);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save screening record.");
      setSaving(false);
    }
  }

  const commonSymptomList = [
    "Fever",
    "Cough",
    "Breathlessness / Shortness of Breath",
    "Skin Rash / Lesion",
    "Diarrhea / Dehydration",
    "Chest Pain",
    "Vomiting / Nausea",
    "Severe Headache",
    "Abdominal Pain",
    "Fatigue / Body Ache",
  ];

  return (
    <div className="fullscreen-console" role="main">
      {/* Top Header */}
      <header className="fullscreen-header">
        <div className="fullscreen-header-left">
          <IconTooltip
            title="Return to Primary Clinic Dashboard"
            desc="Exits the new patient screening console and returns to patient cases."
            howToUse="Click or press [Esc] key on your keyboard."
            position="right"
          >
            <button
              type="button"
              className="fullscreen-back-btn"
              onClick={onBackToDashboard}
            >
              <span>←</span>
              <span>Back to Dashboard</span>
            </button>
          </IconTooltip>

          <div className="fullscreen-title-area">
            <h1>
              <span>📋</span>
              <span>Clinical Field Screening & Triage Workstation</span>
            </h1>
            <p>Offline-first clinical intake · Real-time vitals alert & lesion camera capture</p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {/* Screener Attestation Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 12px",
              borderRadius: "18px",
              background: "rgba(23, 100, 79, 0.08)",
              border: "1px solid rgba(23, 100, 79, 0.2)",
              fontSize: "11.5px",
            }}
          >
            <span>🩺</span>
            <div>
              <strong style={{ color: "var(--sc-accent, #17644f)", display: "block", fontSize: "11.5px" }}>
                {currentProfile?.display_name || currentUser?.email || "Sunita Devi (ASHA)"}
              </strong>
              <span style={{ fontSize: "9.5px", color: "#64748b" }}>
                {currentProfile?.role?.toUpperCase() || "COMMUNITY HEALTH WORKER"} · {currentProfile?.facility_name || "Mawlynnong Unit"}
              </span>
            </div>
          </div>

          <LanguageSwitcher />

          <button
            type="button"
            className="secondary-button"
            onClick={onBackToDashboard}
            style={{ padding: "8px 16px", fontSize: "12px" }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={handleSubmit}
            disabled={saving}
            style={{ padding: "8px 18px", fontSize: "12px", fontWeight: 700 }}
          >
            {saving ? "Saving..." : "💾 Save & Enqueue Case"}
          </button>
        </div>
      </header>

      {/* Main Workstation Layout */}
      <div className="fullscreen-content-container">
        {errorMessage && (
          <div
            style={{
              padding: "12px 18px",
              background: "#fee2e2",
              color: "#991b1b",
              borderRadius: "10px",
              marginBottom: "16px",
              fontSize: "12.5px",
              fontWeight: 600,
            }}
          >
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Critical Emergency Banner if SpO2 < 90% or Temp >= 39°C */}
        {isCriticalDanger && (
          <div
            style={{
              padding: "14px 20px",
              borderRadius: "12px",
              background: "#fee2e2",
              border: "2px solid #ef4444",
              color: "#991b1b",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 4px 15px rgba(239, 68, 68, 0.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "28px" }}>🚨</span>
              <div>
                <strong style={{ fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  CRITICAL VITALS DANGER SIGN DETECTED
                </strong>
                <p style={{ margin: "2px 0 0", fontSize: "12px" }}>
                  {numSpo2 < 90 && `• SpO₂ ${numSpo2}% is below 90% (Hypoxemia / Respiratory Distress). `}
                  {numTemp >= 39.0 && `• Core Temperature ${numTemp}°C indicates hyperpyrexia fever. `}
                  Initiate immediate airway stabilization and arrange urgent medical transport.
                </p>
              </div>
            </div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                padding: "6px 12px",
                background: "#dc2626",
                color: "#ffffff",
                borderRadius: "8px",
              }}
            >
              EMERGENCY REFERRAL
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="screening-workstation-grid">
          {/* LEFT COLUMN: DEMOGRAPHICS, SYMPTOMS & CLINICAL PHOTO */}
          <div>
            {/* Card 1: Patient Demographics */}
            <div className="workstation-card">
              <div className="workstation-card-title">
                <span>👤 1. Patient Demographics & Identification</span>
                <span style={{ fontSize: "11px", color: "var(--muted, #64748b)", fontWeight: 500 }}>
                  Offline Field Identity
                </span>
              </div>

              <div style={{ display: "grid", gap: "14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, marginBottom: "4px" }}>
                      Patient Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="e.g. Kamala Murmu"
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, marginBottom: "4px" }}>
                      Age (Years) *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={120}
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, marginBottom: "4px" }}>
                      Sex *
                    </label>
                    <select
                      value={patientSex}
                      onChange={(e) => setPatientSex(e.target.value as any)}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px", background: "#fff" }}
                    >
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, marginBottom: "4px" }}>
                      Village / Habitation Block *
                    </label>
                    <input
                      type="text"
                      required
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      placeholder="e.g. Mawlynnong West / Ward 3"
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, marginBottom: "4px" }}>
                      Contact Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Symptoms & Body Map */}
            <div className="workstation-card">
              <div className="workstation-card-title">
                <span>🩺 2. Chief Complaint & Clinical Symptoms</span>
                <IconTooltip
                  title="Interactive Body Map"
                  desc="Click anatomical zones to pin symptom locations directly on the body."
                  howToUse="Click button to toggle body diagram."
                  position="left"
                >
                  <button
                    type="button"
                    className="glass-button"
                    onClick={() => setShowBodyMap((b) => !b)}
                    style={{ fontSize: "11px", padding: "4px 10px" }}
                  >
                    🗺️ {showBodyMap ? "Hide Body Map" : "Open Body Map"}
                  </button>
                </IconTooltip>
              </div>

              {showBodyMap && (
                <div style={{ marginBottom: "16px", padding: "14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <AnatomicalBodyMap
                    selectedSymptoms={selectedSymptoms}
                    onToggleSymptom={(symptomKey) => {
                      toggleSymptom(symptomKey);
                    }}
                  />
                </div>
              )}

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, marginBottom: "6px" }}>
                  Select Presented Symptoms:
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {commonSymptomList.map((sym) => {
                    const isSelected = selectedSymptoms.includes(sym);
                    return (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => toggleSymptom(sym)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "18px",
                          fontSize: "11.5px",
                          fontWeight: isSelected ? 700 : 500,
                          background: isSelected ? "var(--sc-accent, #17644f)" : "#f1f5f9",
                          color: isSelected ? "#ffffff" : "#334155",
                          border: isSelected ? "1px solid var(--sc-accent, #17644f)" : "1px solid #cbd5e1",
                          cursor: "pointer",
                          transition: "all 0.14s ease",
                        }}
                      >
                        {isSelected ? "✓ " : "+ "}
                        {sym}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, marginBottom: "4px" }}>
                  Primary Complaint Description:
                </label>
                <textarea
                  rows={2}
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="e.g. High fever for 3 days, persistent dry cough with chest tightness"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                />
              </div>
            </div>

            {/* Card 3: Clinical Photograph / Lesion Capture */}
            <div className="workstation-card">
              <div className="workstation-card-title">
                <span>📸 3. Clinical Lesion / Rash Photograph</span>
                <span style={{ fontSize: "11px", color: "var(--muted, #64748b)", fontWeight: 500 }}>
                  Camera / File Upload
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <IconTooltip
                  title="Camera Capture & Image Upload"
                  desc="Capture or attach photos of rash, wound, or skin conditions for telemedicine doctor inspection."
                  howToUse="Click button to launch camera or pick photo file."
                  position="right"
                >
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 16px",
                      borderRadius: "10px",
                      background: "rgba(23, 100, 79, 0.1)",
                      color: "var(--sc-accent, #17644f)",
                      border: "1px dashed var(--sc-accent, #17644f)",
                      fontWeight: 700,
                      fontSize: "12.5px",
                      cursor: "pointer",
                    }}
                  >
                    <span>📷</span>
                    <span>{photoUploading ? "Uploading..." : "Take Photo / Upload Image"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoUpload}
                      style={{ display: "none" }}
                    />
                  </label>
                </IconTooltip>

                {lesionPhotoUrl && (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <img
                      src={lesionPhotoUrl}
                      alt="Clinical capture preview"
                      style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "8px",
                        objectFit: "cover",
                        border: "2px solid var(--sc-accent, #17644f)",
                      }}
                    />
                    <div>
                      <small style={{ color: "#166534", fontWeight: 700, display: "block" }}>✓ Photo Attached</small>
                      <button
                        type="button"
                        onClick={() => setLesionPhotoUrl("")}
                        style={{ background: "none", border: "none", color: "#dc2626", fontSize: "10.5px", cursor: "pointer", padding: 0 }}
                      >
                        Remove photo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: REAL-TIME VITALS & TRIAGE */}
          <div>
            {/* Card 4: Vitals & Hands-Free Dictation */}
            <div className="workstation-card">
              <div className="workstation-card-title">
                <span>💓 4. Objective Vital Signs</span>
                <IconTooltip
                  title="Speech Vitals Dictation"
                  desc="Speak vitals hands-free (e.g. 'BP 120 over 80, pulse 76, temp 37.5, spo2 98') to auto-populate fields."
                  howToUse="Click microphone to toggle speech recording."
                  position="left"
                >
                  <button
                    type="button"
                    className="glass-button"
                    onClick={toggleVoice}
                    style={{
                      fontSize: "11px",
                      padding: "4px 10px",
                      background: isListeningVoice ? "#fee2e2" : undefined,
                      color: isListeningVoice ? "#dc2626" : undefined,
                      borderColor: isListeningVoice ? "#fca5a5" : undefined,
                      fontWeight: 700,
                    }}
                  >
                    <span>🎙️</span>
                    <span>{isListeningVoice ? "● Stop Listening" : "Speak Vitals"}</span>
                  </button>
                </IconTooltip>
              </div>

              {voiceTranscript && (
                <div
                  style={{
                    padding: "8px 12px",
                    background: "#f0fdf4",
                    color: "#166534",
                    borderRadius: "8px",
                    fontSize: "11px",
                    marginBottom: "14px",
                    border: "1px solid #bbf7d0",
                  }}
                >
                  {voiceTranscript}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, marginBottom: "4px" }}>
                    Blood Pressure (mmHg)
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <input
                      type="number"
                      value={systolic}
                      onChange={(e) => setSystolic(e.target.value)}
                      placeholder="Sys"
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                    />
                    <span>/</span>
                    <input
                      type="number"
                      value={diastolic}
                      onChange={(e) => setDiastolic(e.target.value)}
                      placeholder="Dia"
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, marginBottom: "4px" }}>
                    Heart Rate / Pulse (BPM)
                  </label>
                  <input
                    type="number"
                    value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)}
                    placeholder="76"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      marginBottom: "4px",
                      color: numSpo2 < 90 ? "#dc2626" : undefined,
                    }}
                  >
                    SpO₂ Oxygen Saturation (%) {numSpo2 < 90 && "⚠️ DANGER"}
                  </label>
                  <input
                    type="number"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    placeholder="98"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      fontSize: "12.5px",
                      border: numSpo2 < 90 ? "2px solid #ef4444" : "1px solid #cbd5e1",
                      background: numSpo2 < 90 ? "#fef2f2" : "#ffffff",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      marginBottom: "4px",
                      color: numTemp >= 39.0 ? "#dc2626" : undefined,
                    }}
                  >
                    Temperature (°C) {numTemp >= 39.0 && "⚠️ HIGH FEVER"}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    placeholder="37.2"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      fontSize: "12.5px",
                      border: numTemp >= 39.0 ? "2px solid #ef4444" : "1px solid #cbd5e1",
                      background: numTemp >= 39.0 ? "#fef2f2" : "#ffffff",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Card 5: Triage Priority & Notes */}
            <div className="workstation-card">
              <div className="workstation-card-title">
                <span>🚦 5. Clinical Triage Urgency</span>
                <span style={{ fontSize: "11px", color: "var(--muted, #64748b)", fontWeight: 500 }}>
                  Queue Priority
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", marginBottom: "16px" }}>
                {[
                  { id: "routine", label: "Routine (Green)", desc: "Minor symptoms, stable vitals", color: "#16a34a", bg: "#f0fdf4" },
                  { id: "moderate", label: "Moderate (Yellow)", desc: "Requires teleconsultation within 24h", color: "#ca8a04", bg: "#fefce8" },
                  { id: "urgent", label: "Urgent (Orange)", desc: "High fever, moderate distress", color: "#ea580c", bg: "#fff7ed" },
                  { id: "emergency", label: "Emergency (Red)", desc: "Immediate PHC/CHC transport needed", color: "#dc2626", bg: "#fef2f2" },
                ].map((tier) => {
                  const isSelected = urgencyTier === tier.id;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setUrgencyTier(tier.id as any)}
                      style={{
                        padding: "10px",
                        borderRadius: "10px",
                        textAlign: "left",
                        border: isSelected ? `2px solid ${tier.color}` : "1px solid #e2e8f0",
                        background: isSelected ? tier.bg : "#ffffff",
                        cursor: "pointer",
                      }}
                    >
                      <strong style={{ fontSize: "12px", color: tier.color, display: "block" }}>
                        {isSelected ? "● " : "○ "}
                        {tier.label}
                      </strong>
                      <span style={{ fontSize: "10px", color: "#64748b" }}>{tier.desc}</span>
                    </button>
                  );
                })}
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, marginBottom: "4px" }}>
                  Clinical Field Notes & Action Taken:
                </label>
                <textarea
                  rows={3}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="e.g. Paracetamol 500mg administered. Patient advised oral rehydration salts and scheduled for teleconsultation review."
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                />
              </div>

              <div style={{ marginTop: "20px", display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={onBackToDashboard}
                  style={{ flex: 1, padding: "12px", justifyContent: "center" }}
                >
                  Cancel & Exit
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                  style={{ flex: 2, padding: "12px", justifyContent: "center", fontWeight: 700 }}
                >
                  {saving ? "Saving to Offline Cache & Cloud..." : "💾 Submit & Enqueue Patient Case"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
