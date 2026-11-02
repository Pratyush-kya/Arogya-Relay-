"use client";

import { useState, useEffect } from "react";
import {
  getLocalFollowUps,
  saveLocalFollowUp,
  getLocalPrescriptions,
  saveLocalPrescription,
  initFollowupRealtimeSync,
} from "@/lib/prescriptions/storage";
import type { PrescriptionFollowUpRequest, ScheduledMedicine } from "@/lib/prescriptions/types";
import { useLanguage } from "@/lib/i18n/provider";
import { ReadAloud } from "./read-aloud";

interface DoctorFollowupManagerProps {
  doctorName?: string;
  doctorNmc?: string;
  doctorEmail?: string;
}

const NEARBY_CHEMISTS = [
  {
    id: "ph-01",
    name: "Pradhan Mantri Jan Aushadhi Kendra #7402",
    address: "Main Market Road, near Block Office",
    phone: "+91 94370 12345",
    distanceKm: 1.2,
  },
  {
    id: "ph-02",
    name: "Community Red Cross Generic Dispensary",
    address: "Hospital Road, Civil Lines",
    phone: "+91 94371 67890",
    distanceKm: 2.4,
  },
  {
    id: "ph-03",
    name: "Jan Aushadhi Kendra #1084",
    address: "Sub-Divisional Hospital Complex",
    phone: "+91 98610 54321",
    distanceKm: 3.1,
  },
];

interface ClinicalPreset {
  id: string;
  label: string;
  icon: string;
  medicineName: string;
  strength: string;
  dose: string;
  instructions: string;
  doctorReply: string;
  price: number;
}

const CLINICAL_PRESETS: ClinicalPreset[] = [
  {
    id: "cough_respiratory",
    label: "Acute Cough & Respiratory Relief",
    icon: "🫁",
    medicineName: "Amoxicillin + Clavulanate (Augmentin generic)",
    strength: "625mg",
    dose: "1 tablet twice daily after food",
    instructions: "Complete full 5-day course. Stop smoking immediately. Warm saline gargles & steam inhalation twice daily.",
    doctorReply: "Clinical review: Persistent cough and pleuritic chest discomfort in a chronic smoker warrant broad-spectrum antimicrobial coverage. Complete the full 5-day course. Strictly cease smoking. If fever >101°F or hemoptysis develops, report to emergency immediately.",
    price: 45.0,
  },
  {
    id: "hypertension_adjust",
    label: "Hypertension / Low Dose Step-down",
    icon: "❤️",
    medicineName: "Amlodipine (Low Dose)",
    strength: "2.5mg",
    dose: "1 tablet once daily morning",
    instructions: "Take half tablet (2.5mg) with water after breakfast. Monitor BP weekly.",
    doctorReply: "Clinical review: Reviewed blood pressure history and peripheral swelling. Reducing Amlodipine from 5mg to 2.5mg. Maintain low-sodium diet and elevate legs while resting.",
    price: 18.0,
  },
  {
    id: "fatigue_recovery",
    label: "Post-Infection Fatigue & Tonic",
    icon: "🌿",
    medicineName: "Jan Aushadhi Multivitamin with Zinc & C",
    strength: "1 tablet",
    dose: "1 tablet once daily after lunch",
    instructions: "Take with water after lunch for 10 days. Maintain 2.5L daily hydration.",
    doctorReply: "Clinical review: Throat irritation resolved. Added generic multivitamin and mineral regimen to support recovery. Drink plenty of clean fluids and ensure adequate rest.",
    price: 22.0,
  },
];

export function DoctorFollowupManager({
  doctorName = "Dr. Rajesh Patel, MBBS",
  doctorNmc = "NMC-2018-88412",
  doctorEmail,
}: DoctorFollowupManagerProps) {
  const resolvedEmail =
    doctorEmail ||
    (doctorName.toLowerCase().includes("ananya") ? "samarpitbiswal966@gmail.com" : "bishnuprasadsatapathy7846@gmail.com");
  const { effectiveLang } = useLanguage();
  const [followups, setFollowups] = useState<PrescriptionFollowUpRequest[]>([]);
  const [selectedFollowupId, setSelectedFollowupId] = useState<string | null>(null);

  // Queue Filters
  const [filterMode, setFilterMode] = useState<"assigned" | "pending" | "revised" | "all">("assigned");
  const [searchQuery, setSearchQuery] = useState("");

  // Revision Form State
  const [doctorReply, setDoctorReply] = useState("");
  const [revisedMedName, setRevisedMedName] = useState("Amlodipine (Low Dose)");
  const [revisedStrength, setRevisedStrength] = useState("2.5mg");
  const [revisedDose, setRevisedDose] = useState("1 tablet once daily morning");
  const [revisedInstructions, setRevisedInstructions] = useState("Take after breakfast with water. Monitor BP.");
  const [selectedChemistId, setSelectedChemistId] = useState<string>("ph-01");
  const [calculatedPrice, setCalculatedPrice] = useState<number>(18.0);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const isAnanya =
    resolvedEmail.includes("samarpitbiswal966") || doctorName.toLowerCase().includes("ananya");
  const isRajesh =
    resolvedEmail.includes("bishnuprasadsatapathy7846") ||
    doctorName.toLowerCase().includes("rajesh") ||
    doctorName.toLowerCase().includes("patel");

  function isAssignedToCurrentDoctor(req: PrescriptionFollowUpRequest): boolean {
    if (isAnanya) {
      return (
        Boolean(req.doctorEmail?.includes("samarpitbiswal966")) ||
        req.doctorName.toLowerCase().includes("ananya")
      );
    }
    if (isRajesh) {
      return (
        Boolean(req.doctorEmail?.includes("bishnuprasadsatapathy7846")) ||
        req.doctorName.toLowerCase().includes("rajesh") ||
        req.doctorName.toLowerCase().includes("patel")
      );
    }
    return true;
  }

  function reload(currentSelectedId?: string | null) {
    const list = getLocalFollowUps();
    setFollowups(list);

    // Maintain or auto-select an appropriate followup
    const targetId = currentSelectedId || selectedFollowupId;
    if (targetId && list.some((f) => f.id === targetId)) {
      const match = list.find((f) => f.id === targetId);
      if (match) loadForm(match);
    } else if (list.length > 0) {
      // Prioritize an assigned pending item
      const assignedPending = list.find((f) => isAssignedToCurrentDoctor(f) && f.status !== "doctor_revised");
      const chosen = assignedPending || list.find(isAssignedToCurrentDoctor) || list[0];
      setSelectedFollowupId(chosen.id);
      loadForm(chosen);
    }
  }

  function loadForm(req: PrescriptionFollowUpRequest) {
    if (req.doctorReply) {
      setDoctorReply(req.doctorReply);
    } else {
      setDoctorReply("");
    }
    if (req.revisedMedicines && req.revisedMedicines.length > 0) {
      const med = req.revisedMedicines[0];
      setRevisedMedName(med.name);
      setRevisedStrength(med.strength);
      setRevisedDose(med.dose);
      setRevisedInstructions(med.instructions || "Take with water after food.");
    } else {
      // Default to sensible starting value
      setRevisedMedName("Amlodipine (Low Dose)");
      setRevisedStrength("2.5mg");
      setRevisedDose("1 tablet once daily morning");
      setRevisedInstructions("Take with water after food.");
    }
    if (req.suggestedChemist) {
      setSelectedChemistId(req.suggestedChemist.id);
    }
    if (req.totalPriceInr) {
      setCalculatedPrice(req.totalPriceInr);
    }
  }

  function applyPreset(preset: ClinicalPreset) {
    setRevisedMedName(preset.medicineName);
    setRevisedStrength(preset.strength);
    setRevisedDose(preset.dose);
    setRevisedInstructions(preset.instructions);
    setDoctorReply(preset.doctorReply);
    setCalculatedPrice(preset.price);
  }

  useEffect(() => {
    reload();

    // Supabase Realtime cross-device subscription
    const cleanupRealtime = initFollowupRealtimeSync(() => {
      reload();
    });

    function onFollowupUpdate() {
      reload();
    }
    window.addEventListener("arogya:followup:updated", onFollowupUpdate);
    window.addEventListener("storage", onFollowupUpdate);
    return () => {
      cleanupRealtime();
      window.removeEventListener("arogya:followup:updated", onFollowupUpdate);
      window.removeEventListener("storage", onFollowupUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter calculations
  const assignedList = followups.filter(isAssignedToCurrentDoctor);
  const pendingList = followups.filter((f) => f.status !== "doctor_revised");
  const revisedList = followups.filter((f) => f.status === "doctor_revised");

  let baseList: PrescriptionFollowUpRequest[] = followups;
  if (filterMode === "assigned") {
    baseList = assignedList.length > 0 ? assignedList : followups;
  } else if (filterMode === "pending") {
    baseList = pendingList;
  } else if (filterMode === "revised") {
    baseList = revisedList;
  }

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleFollowups = baseList.filter((req) => {
    if (!normalizedSearch) return true;
    return (
      req.patientName.toLowerCase().includes(normalizedSearch) ||
      req.patientRef.toLowerCase().includes(normalizedSearch) ||
      req.prescriptionId.toLowerCase().includes(normalizedSearch) ||
      req.patientMessage.toLowerCase().includes(normalizedSearch)
    );
  });

  const selectedReq =
    visibleFollowups.find((f) => f.id === selectedFollowupId) ||
    followups.find((f) => f.id === selectedFollowupId) ||
    visibleFollowups[0] ||
    followups[0] ||
    null;

  function handleSelectFollowup(req: PrescriptionFollowUpRequest) {
    setSelectedFollowupId(req.id);
    loadForm(req);
  }

  function handleSaveRevision(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedReq) return;

    const chosenChemist = NEARBY_CHEMISTS.find((c) => c.id === selectedChemistId) || NEARBY_CHEMISTS[0];

    const updatedMedicines: ScheduledMedicine[] = [
      {
        id: `med-${Date.now().toString(36)}`,
        name: revisedMedName,
        strength: revisedStrength,
        form: "tablet",
        dose: revisedDose,
        foodRelation: "after_food",
        slots: { morning: true },
        customTimes: ["08:00"],
        durationDays: 14,
        startDate: new Date().toISOString().slice(0, 10),
        instructions: revisedInstructions,
      },
    ];

    const updatedReq: PrescriptionFollowUpRequest = {
      ...selectedReq,
      status: "doctor_revised",
      doctorName,
      doctorNmc,
      doctorEmail: resolvedEmail,
      handledByAi: false,
      doctorReply: doctorReply.trim(),
      revisedMedicines: updatedMedicines,
      suggestedChemist: chosenChemist,
      totalPriceInr: calculatedPrice,
      mrpPriceInr: Math.round(calculatedPrice * 4.2),
      savingsPercent: 76.5,
      batchVerified: true,
      expirySafeDate: "Dec 2027 (Batch JAK-9982)",
      doctorAuditStatus: selectedReq.doctorAuditStatus || "pending_dispense",
    };

    saveLocalFollowUp(updatedReq);

    // Also update prescription in local store if matches
    const allRx = getLocalPrescriptions();
    const targetRx = allRx.find((p) => p.id === selectedReq.prescriptionId);
    if (targetRx) {
      targetRx.medicines = updatedMedicines;
      targetRx.totalPriceInr = calculatedPrice;
      targetRx.suggestedChemist = chosenChemist;
      saveLocalPrescription(targetRx);
    }

    reload(selectedReq.id);
    setStatusNotice(
      `✓ Prescription revision & Jan Aushadhi fair price signed by ${doctorName}! Response delivered to Patient ${selectedReq.patientName}. Patient will see your advice in Section 2 and can activate daily alarms.`
    );
    setTimeout(() => setStatusNotice(null), 6000);
  }

  function handleVerifyChemistAudit(req: PrescriptionFollowUpRequest) {
    const updated: PrescriptionFollowUpRequest = {
      ...req,
      doctorAuditStatus: "dispense_verified",
      doctorAuditNotes: `Verified by ${doctorName} (${doctorNmc}) on ${new Date().toLocaleTimeString()}: Chemist dispensed exact chemical bio-equivalent at verified price.`,
    };
    saveLocalFollowUp(updated);
    reload(req.id);
    setStatusNotice(`✓ Chemist dispensing audit verified for ${req.patientName}!`);
    setTimeout(() => setStatusNotice(null), 5000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #065f46 0%, #047857 100%)",
          color: "#ffffff",
          borderRadius: "16px",
          padding: "20px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          boxShadow: "0 6px 20px rgba(6, 95, 70, 0.15)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", opacity: 0.9 }}>
              CLINICAL FOLLOW-UP &amp; DOSAGE COMMAND
            </span>
            <span
              style={{
                background: "rgba(255,255,255,0.2)",
                padding: "2px 8px",
                borderRadius: "12px",
                fontSize: "10.5px",
                fontWeight: 700,
              }}
            >
              🟢 Realtime Synced
            </span>
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: 800, margin: "2px 0 6px", color: "#ffffff" }}>
            Patient Prescription Follow-ups ({followups.length})
          </h2>
          <p style={{ margin: 0, fontSize: "13.5px", opacity: 0.9, maxWidth: "620px", lineHeight: 1.4 }}>
            Review patient symptoms, prescribe revised dosage modifications, recommend closest verified Jan Aushadhi
            chemist, and audit accurate medicine dispensing.
          </p>
        </div>

        <div style={{ background: "rgba(255,255,255,0.15)", padding: "12px 18px", borderRadius: "12px", textAlign: "right" }}>
          <span style={{ fontSize: "11px", textTransform: "uppercase", opacity: 0.8, display: "block" }}>Verified Prescriber (No AI)</span>
          <strong style={{ fontSize: "14px" }}>{doctorName}</strong>
          <span style={{ fontSize: "11.5px", display: "block", opacity: 0.9 }}>Reg: {doctorNmc}</span>
          <span style={{ fontSize: "11.5px", display: "block", color: "#bae6fd", fontWeight: 700, marginTop: "2px" }}>📧 {resolvedEmail}</span>
        </div>
      </div>

      {statusNotice && (
        <div
          style={{
            background: "#ecfdf5",
            border: "1.5px solid #a7f3d0",
            color: "#065f46",
            padding: "12px 18px",
            borderRadius: "10px",
            fontSize: "13.5px",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>✓</span>
          <span>{statusNotice}</span>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "12px 16px",
          border: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setFilterMode("assigned")}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              border: filterMode === "assigned" ? "1.5px solid #059669" : "1px solid #cbd5e1",
              background: filterMode === "assigned" ? "#ecfdf5" : "#ffffff",
              color: filterMode === "assigned" ? "#065f46" : "#475569",
              fontSize: "12.5px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            👨‍⚕️ Assigned to Me ({assignedList.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("pending")}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              border: filterMode === "pending" ? "1.5px solid #d97706" : "1px solid #cbd5e1",
              background: filterMode === "pending" ? "#fffbeb" : "#ffffff",
              color: filterMode === "pending" ? "#b45309" : "#475569",
              fontSize: "12.5px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ⏳ Needs Review ({pendingList.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("revised")}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              border: filterMode === "revised" ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
              background: filterMode === "revised" ? "#eff6ff" : "#ffffff",
              color: filterMode === "revised" ? "#1e40af" : "#475569",
              fontSize: "12.5px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ✅ Revised ({revisedList.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              border: filterMode === "all" ? "1.5px solid #475569" : "1px solid #cbd5e1",
              background: filterMode === "all" ? "#f1f5f9" : "#ffffff",
              color: filterMode === "all" ? "#0f172a" : "#475569",
              fontSize: "12.5px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            📋 All Reports ({followups.length})
          </button>
        </div>

        <div style={{ minWidth: "220px" }}>
          <input
            type="text"
            placeholder="Search patient, Rx or issue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "7px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "12.5px",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* Main 2-Column Layout: Left Requests List, Right Detail & Revision Editor */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
        {/* Left Column: Follow-up Queue */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: "15px", color: "#0f172a", fontWeight: 700 }}>
              Incoming Queue ({visibleFollowups.length})
            </h3>
            <span style={{ fontSize: "11px", color: "#64748b" }}>
              {filterMode === "assigned" ? `Filtered for ${doctorName}` : "Showing filtered view"}
            </span>
          </div>

          {visibleFollowups.length === 0 ? (
            <div style={{ background: "#ffffff", padding: "28px 20px", borderRadius: "12px", border: "1px dashed #cbd5e1", textAlign: "center" }}>
              <span style={{ fontSize: "28px", display: "block", marginBottom: "6px" }}>📭</span>
              <p style={{ color: "#475569", margin: "0 0 8px", fontSize: "13.5px", fontWeight: 600 }}>
                No follow-up requests in this view
              </p>
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                View All Clinic Reports ({followups.length})
              </button>
            </div>
          ) : (
            visibleFollowups.map((req) => {
              const isSelected = req.id === selectedReq?.id;
              const isAssigned = isAssignedToCurrentDoctor(req);
              return (
                <div
                  key={req.id}
                  onClick={() => handleSelectFollowup(req)}
                  style={{
                    background: isSelected ? "#f0fdf4" : "#ffffff",
                    border: isSelected ? "2px solid #059669" : "1.5px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "14px 16px",
                    cursor: "pointer",
                    boxShadow: isSelected ? "0 4px 12px rgba(5,150,105,0.12)" : "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                        👤 {req.patientName} ({req.patientRef})
                      </strong>
                      {isAssigned && (
                        <span style={{ fontSize: "10px", background: "#ecfdf5", color: "#047857", fontWeight: 800, padding: "1px 6px", borderRadius: "4px" }}>
                          YOU
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: "10.5px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        background:
                          req.status === "doctor_revised"
                            ? "#dcfce7"
                            : req.status === "dispensed"
                            ? "#e0e7ff"
                            : "#fef3c7",
                        color:
                          req.status === "doctor_revised"
                            ? "#15803d"
                            : req.status === "dispensed"
                            ? "#4338ca"
                            : "#b45309",
                      }}
                    >
                      {req.status === "doctor_revised"
                        ? "Revised"
                        : req.status === "dispensed"
                        ? "Dispensed"
                        : "Needs Review"}
                    </span>
                  </div>

                  <div style={{ fontSize: "12px", color: "#475569", display: "flex", justifyContent: "space-between" }}>
                    <span><strong>Issue:</strong> {req.issueType.replace("_", " ").toUpperCase()}</span>
                    <span>Rx: {req.prescriptionId}</span>
                  </div>

                  <p style={{ margin: 0, fontSize: "12.5px", color: "#334155", fontStyle: "italic", lineHeight: 1.35 }}>
                    &ldquo;{req.patientMessage.slice(0, 85)}{req.patientMessage.length > 85 ? "..." : ""}&rdquo;
                  </p>

                  <div style={{ fontSize: "11px", color: "#64748b", borderTop: "1px dashed #e2e8f0", paddingTop: "6px", display: "flex", justifyContent: "space-between" }}>
                    <span>To: {req.doctorName}</span>
                    <span>{new Date(req.reportedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Active Request Review, 1-Click Presets, Dose Adjustment & Chemist Audit */}
        {selectedReq && (
          <div
            style={{
              background: "#ffffff",
              border: "1.5px solid #cbd5e1",
              borderRadius: "16px",
              padding: "22px",
              boxShadow: "0 4px 18px rgba(0,0,0,0.04)",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            {/* Patient Header */}
            <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "17px", color: "#0f172a", fontWeight: 800 }}>
                    Patient: {selectedReq.patientName} ({selectedReq.patientRef})
                  </h3>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    Prescription Reference: <strong>{selectedReq.prescriptionId}</strong> · Reported: {new Date(selectedReq.reportedAt).toLocaleString()}
                  </span>
                </div>
                <ReadAloud text={`Patient ${selectedReq.patientName} reports: ${selectedReq.patientMessage}`} />
              </div>

              {/* Patient Message Callout */}
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: "12px 14px", borderRadius: "10px", marginTop: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#92400e", textTransform: "uppercase" }}>
                    Patient Stated Issue / Symptoms:
                  </span>
                  <span style={{ fontSize: "11px", color: "#b45309", fontWeight: 600 }}>
                    Assigned: {selectedReq.doctorName}
                  </span>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: "13.5px", color: "#78350f", lineHeight: 1.45, fontStyle: "italic" }}>
                  &ldquo;{selectedReq.patientMessage}&rdquo;
                </p>
              </div>
            </div>

            {/* Quick 1-Click Clinical Presets */}
            <div>
              <span style={{ display: "block", fontSize: "11.5px", fontWeight: 800, color: "#047857", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
                ⚡ Quick 1-Click Clinical Presets:
              </span>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {CLINICAL_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#1e293b",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      transition: "all 0.15s ease",
                    }}
                    title={preset.instructions}
                  >
                    <span>{preset.icon}</span>
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dose Adjustment & Chemist Suggestion Form */}
            <form onSubmit={handleSaveRevision} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <h4 style={{ margin: 0, fontSize: "14.5px", color: "#065f46", fontWeight: 700 }}>
                1. Modify Dosages &amp; Prescription Instructions
              </h4>

              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    Medicine Name
                  </label>
                  <input
                    type="text"
                    required
                    value={revisedMedName}
                    onChange={(e) => setRevisedMedName(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    Dose Strength
                  </label>
                  <input
                    type="text"
                    required
                    value={revisedStrength}
                    onChange={(e) => setRevisedStrength(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                  Updated Schedule / Frequency
                </label>
                <input
                  type="text"
                  required
                  value={revisedDose}
                  onChange={(e) => setRevisedDose(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                  Doctor Reply &amp; Clinical Guidance to Patient
                </label>
                <textarea
                  rows={3}
                  required
                  value={doctorReply}
                  onChange={(e) => setDoctorReply(e.target.value)}
                  placeholder="Explain dosage changes, red-flag symptoms, and clinical advice..."
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", lineHeight: 1.4, boxSizing: "border-box" }}
                />
              </div>

              <h4 style={{ margin: "6px 0 0", fontSize: "14.5px", color: "#065f46", fontWeight: 700 }}>
                2. Suggest Nearest Verified Chemist &amp; Set Fair Price
              </h4>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    Recommend Nearest Chemist
                  </label>
                  <select
                    value={selectedChemistId}
                    onChange={(e) => setSelectedChemistId(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#ffffff" }}
                  >
                    {NEARBY_CHEMISTS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.distanceKm} km)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    Government Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={calculatedPrice}
                    onChange={(e) => setCalculatedPrice(parseFloat(e.target.value) || 0)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <button
                type="submit"
                style={{
                  background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px 20px",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(5,150,105,0.25)",
                  marginTop: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <span>✓</span>
                <span>Sign &amp; Send Revised Prescription to Patient</span>
              </button>
            </form>

            {/* Chemist Dispense Audit Verification */}
            <div
              style={{
                borderTop: "1.5px solid #e2e8f0",
                paddingTop: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                  🔍 Chemist Dispensing Audit &amp; Anti-Substitution Check
                </strong>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: "6px",
                    background:
                      selectedReq.doctorAuditStatus === "dispense_verified"
                        ? "#dcfce7"
                        : "#fef3c7",
                    color:
                      selectedReq.doctorAuditStatus === "dispense_verified"
                        ? "#166534"
                        : "#92400e",
                  }}
                >
                  {selectedReq.doctorAuditStatus === "dispense_verified"
                    ? "✓ Dispense Verified by Doctor"
                    : "Pending Fulfillment"}
                </span>
              </div>

              <p style={{ margin: 0, fontSize: "12.5px", color: "#64748b", lineHeight: 1.4 }}>
                Doctors can check whether the suggested chemist delivered the exact chemical bio-equivalent (no unapproved substitution, no counterfeit, and no inflated pricing).
              </p>

              {selectedReq.doctorAuditStatus === "dispense_verified" ? (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px 12px", borderRadius: "8px", fontSize: "12px", color: "#166534" }}>
                  <strong>Verified Log:</strong> {selectedReq.doctorAuditNotes || "Chemist verified. Stock batch JAK-9982 matches formulation."}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleVerifyChemistAudit(selectedReq)}
                  style={{
                    alignSelf: "flex-start",
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    border: "1px solid #93c5fd",
                    padding: "7px 14px",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Verify Chemist Compliance &amp; Record Audit ✓
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
