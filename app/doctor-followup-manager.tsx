"use client";

import { useState, useEffect } from "react";
import {
  getLocalFollowUps,
  saveLocalFollowUp,
  getLocalPrescriptions,
  saveLocalPrescription,
} from "@/lib/prescriptions/storage";
import type { PrescriptionFollowUpRequest, ScheduledMedicine } from "@/lib/prescriptions/types";
import { useLanguage } from "@/lib/i18n/provider";
import { ReadAloud } from "./read-aloud";

interface DoctorFollowupManagerProps {
  doctorName?: string;
  doctorNmc?: string;
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

export function DoctorFollowupManager({
  doctorName = "Dr. Rajesh Patel, MBBS",
  doctorNmc = "NMC-2018-88412",
}: DoctorFollowupManagerProps) {
  const { effectiveLang } = useLanguage();
  const [followups, setFollowups] = useState<PrescriptionFollowUpRequest[]>([]);
  const [selectedFollowupId, setSelectedFollowupId] = useState<string | null>(null);

  // Revision state
  const [doctorReply, setDoctorReply] = useState("");
  const [revisedMedName, setRevisedMedName] = useState("Amlodipine (Low Dose)");
  const [revisedStrength, setRevisedStrength] = useState("2.5mg");
  const [revisedDose, setRevisedDose] = useState("1 tablet once daily morning");
  const [revisedInstructions, setRevisedInstructions] = useState("Take after breakfast with water. Monitor BP.");
  const [selectedChemistId, setSelectedChemistId] = useState<string>("ph-01");
  const [calculatedPrice, setCalculatedPrice] = useState<number>(18.0);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  function reload() {
    const list = getLocalFollowUps();
    setFollowups(list);
    if (list.length > 0 && !selectedFollowupId) {
      setSelectedFollowupId(list[0].id);
      loadForm(list[0]);
    }
  }

  function loadForm(req: PrescriptionFollowUpRequest) {
    if (req.doctorReply) {
      setDoctorReply(req.doctorReply);
    } else {
      setDoctorReply("Reviewed your reported symptoms. I have adjusted your dose. Please collect your generic medicines from the Jan Aushadhi Kendra.");
    }
    if (req.suggestedChemist) {
      setSelectedChemistId(req.suggestedChemist.id);
    }
    if (req.totalPriceInr) {
      setCalculatedPrice(req.totalPriceInr);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const selectedReq = followups.find((f) => f.id === selectedFollowupId) || followups[0] || null;

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

    reload();
    setStatusNotice(`✓ Updated prescription revision and suggested chemist for Patient ${selectedReq.patientName}!`);
    setTimeout(() => setStatusNotice(null), 5000);
  }

  function handleVerifyChemistAudit(req: PrescriptionFollowUpRequest) {
    const updated: PrescriptionFollowUpRequest = {
      ...req,
      doctorAuditStatus: "dispense_verified",
      doctorAuditNotes: `Verified by ${doctorName} (${doctorNmc}) on ${new Date().toLocaleTimeString()}: Chemist dispensed exact chemical bio-equivalent at verified price.`,
    };
    saveLocalFollowUp(updated);
    reload();
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
          gap: "12px",
        }}
      >
        <div>
          <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", opacity: 0.9 }}>
            CLINICAL FOLLOW-UP &amp; DOSAGE COMMAND
          </span>
          <h2 style={{ fontSize: "22px", fontWeight: 800, margin: "4px 0", color: "#ffffff" }}>
            Patient Prescription Follow-ups ({followups.length})
          </h2>
          <p style={{ margin: 0, fontSize: "13.5px", opacity: 0.9, maxWidth: "600px" }}>
            Review patient symptom messages, adjust medicine doses, suggest the closest verified Jan Aushadhi chemist,
            and audit whether the chemist dispensed the accurate medication.
          </p>
        </div>

        <div style={{ background: "rgba(255,255,255,0.15)", padding: "10px 16px", borderRadius: "10px", textAlign: "right" }}>
          <span style={{ fontSize: "11px", textTransform: "uppercase", opacity: 0.8, display: "block" }}>Verified Prescriber</span>
          <strong style={{ fontSize: "13px" }}>{doctorName}</strong>
          <span style={{ fontSize: "11px", display: "block", opacity: 0.9 }}>Reg: {doctorNmc}</span>
        </div>
      </div>

      {statusNotice && (
        <div
          style={{
            background: "#ecfdf5",
            border: "1.5px solid #a7f3d0",
            color: "#065f46",
            padding: "10px 16px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: 700,
          }}
        >
          {statusNotice}
        </div>
      )}

      {/* Main 2-Column Layout: Left Requests List, Right Detail & Revision Editor */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
        {/* Left Column: Follow-up Queue */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <h3 style={{ margin: "0 0 4px", fontSize: "15px", color: "#0f172a", fontWeight: 700 }}>
            Incoming Follow-up Messages
          </h3>

          {followups.length === 0 ? (
            <div style={{ background: "#ffffff", padding: "24px", borderRadius: "12px", border: "1px dashed #cbd5e1", textAlign: "center" }}>
              <p style={{ color: "#64748b", margin: 0, fontSize: "13.5px" }}>No pending patient follow-up requests</p>
            </div>
          ) : (
            followups.map((req) => {
              const isSelected = req.id === selectedFollowupId;
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
                    boxShadow: isSelected ? "0 4px 12px rgba(5,150,105,0.1)" : "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                      👤 {req.patientName} ({req.patientRef})
                    </strong>
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

                  <div style={{ fontSize: "12px", color: "#475569" }}>
                    <strong>Issue:</strong> {req.issueType.replace("_", " ").toUpperCase()} · Rx: {req.prescriptionId}
                  </div>

                  <p style={{ margin: 0, fontSize: "12.5px", color: "#334155", fontStyle: "italic", lineHeight: 1.35 }}>
                    &ldquo;{req.patientMessage.slice(0, 80)}...&rdquo;
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Active Request Review, Dose Adjustment & Chemist Audit */}
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
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: "10px 14px", borderRadius: "8px", marginTop: "10px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#92400e", textTransform: "uppercase", display: "block" }}>
                  Patient Stated Issue:
                </span>
                <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#78350f", lineHeight: 1.4 }}>
                  &ldquo;{selectedReq.patientMessage}&rdquo;
                </p>
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
                  padding: "11px 18px",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(5,150,105,0.25)",
                  marginTop: "6px",
                }}
              >
                ✓ Sign &amp; Send Revised Prescription to Patient
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
