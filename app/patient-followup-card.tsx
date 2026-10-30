"use client";

import { useState, useEffect } from "react";
import {
  getLocalPrescriptions,
  getLocalFollowUps,
  saveLocalFollowUp,
} from "@/lib/prescriptions/storage";
import type {
  PatientPrescription,
  PrescriptionFollowUpRequest,
  FollowUpIssueType,
} from "@/lib/prescriptions/types";
import { useLanguage } from "@/lib/i18n/provider";
import { ReadAloud } from "./read-aloud";

interface PatientFollowupCardProps {
  patientRef?: string;
  onNavigateToChemistMap?: () => void;
}

export function PatientFollowupCard({
  patientRef = "PT-RAMESH-01",
  onNavigateToChemistMap,
}: PatientFollowupCardProps) {
  const { effectiveLang } = useLanguage();
  const [prescriptions, setPrescriptions] = useState<PatientPrescription[]>([]);
  const [followups, setFollowups] = useState<PrescriptionFollowUpRequest[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  // Form states
  const [selectedRxId, setSelectedRxId] = useState<string>("");
  const [issueType, setIssueType] = useState<FollowUpIssueType>("dose_change");
  const [patientMessage, setPatientMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  function reloadData() {
    const rxList = getLocalPrescriptions();
    setPrescriptions(rxList);
    if (rxList.length > 0 && !selectedRxId) {
      setSelectedRxId(rxList[0].id);
    }
    const fupList = getLocalFollowUps();
    setFollowups(fupList);
  }

  useEffect(() => {
    reloadData();
  }, [patientRef]);

  async function handleSubmitFollowup(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRxId || !patientMessage.trim()) {
      setStatusNotice("Please select a prescription and describe the issue.");
      return;
    }
    setSubmitting(true);

    const targetRx = prescriptions.find((p) => p.id === selectedRxId);
    const newReq: PrescriptionFollowUpRequest = {
      id: `FUP-${Date.now().toString(36).toUpperCase()}`,
      prescriptionId: selectedRxId,
      patientRef,
      patientName: "Ramesh Soren",
      doctorName: targetRx?.doctorName || "Dr. Rajesh Patel, MBBS",
      doctorNmc: "NMC-2018-88412",
      issueType,
      patientMessage: patientMessage.trim(),
      reportedAt: new Date().toISOString(),
      status: "pending_doctor_review",
    };

    saveLocalFollowUp(newReq);
    reloadData();
    setSubmitting(false);
    setPatientMessage("");
    setModalOpen(false);
    setStatusNotice("Your follow-up request was delivered to the doctor!");
    setTimeout(() => setStatusNotice(null), 6000);
  }

  const activeFollowup = followups.length > 0 ? followups[0] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {statusNotice && (
        <div
          style={{
            background: "#ecfdf5",
            border: "1.5px solid #a7f3d0",
            color: "#065f46",
            padding: "10px 16px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>✓</span>
          <span>{statusNotice}</span>
        </div>
      )}

      {/* Main Follow-up Banner Card */}
      <div
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
          border: "2px solid #86efac",
          borderRadius: "16px",
          padding: "20px 22px",
          boxShadow: "0 4px 16px rgba(5, 150, 105, 0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "14px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "22px" }}>🩺</span>
              <strong style={{ fontSize: "16px", color: "#065f46" }}>
                {effectiveLang === "hi"
                  ? "डॉक्टर फॉलो-अप और खुराक बदलाव"
                  : effectiveLang === "or"
                  ? "ଡାକ୍ତର ଫଲୋ-ଅପ୍ ଓ ଔଷଧ ମାତ୍ରା ପରିବର୍ତ୍ତନ"
                  : "Doctor Prescription Follow-up & Dosage Adjustment"}
              </strong>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#475569", lineHeight: 1.45 }}>
              Facing side-effects, feeling unwell, or need a dose adjustment? Send a message directly to your doctor
              referencing your prescription.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            style={{
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              padding: "9px 18px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 3px 10px rgba(5, 150, 105, 0.25)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>✉️</span>
            <span>Message Doctor / Adjust Dose</span>
          </button>
        </div>

        {/* Display Active Follow-up Request Status if any */}
        {activeFollowup ? (
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              border: "1.5px solid #cbd5e1",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    background:
                      activeFollowup.status === "doctor_revised"
                        ? "#dcfce7"
                        : activeFollowup.status === "dispensed"
                        ? "#e0e7ff"
                        : "#fef3c7",
                    color:
                      activeFollowup.status === "doctor_revised"
                        ? "#15803d"
                        : activeFollowup.status === "dispensed"
                        ? "#4338ca"
                        : "#b45309",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  {activeFollowup.status === "doctor_revised"
                    ? "✓ Doctor Revised Prescription Ready"
                    : activeFollowup.status === "dispensed"
                    ? "✓ Medicines Dispensed"
                    : "⏳ Awaiting Doctor Review"}
                </span>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Ref: <strong>{activeFollowup.prescriptionId}</strong> · To: <strong>{activeFollowup.doctorName}</strong>
                </span>
              </div>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                {new Date(activeFollowup.reportedAt).toLocaleDateString()}
              </span>
            </div>

            {/* Patient Query & Doctor Advice */}
            <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", fontSize: "12.5px" }}>
              <div style={{ color: "#334155", marginBottom: activeFollowup.doctorReply ? "8px" : "0" }}>
                <strong style={{ color: "#0f172a" }}>Your Message:</strong> &ldquo;{activeFollowup.patientMessage}&rdquo;
              </div>

              {activeFollowup.doctorReply && (
                <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "8px", color: "#065f46" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <strong>👨‍⚕️ {activeFollowup.doctorName} Advice:</strong>
                    <ReadAloud text={activeFollowup.doctorReply} />
                  </div>
                  <p style={{ margin: 0, fontStyle: "italic", lineHeight: 1.4 }}>
                    &ldquo;{activeFollowup.doctorReply}&rdquo;
                  </p>
                </div>
              )}
            </div>

            {/* If doctor revised the medicines: Transparent Price & Quality Certification */}
            {activeFollowup.revisedMedicines && activeFollowup.revisedMedicines.length > 0 && (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1.5px solid #86efac",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                  <strong style={{ fontSize: "13.5px", color: "#166534" }}>
                    📋 Revised Medications (New Doses)
                  </strong>
                  {/* Quality & Price Safety Badge */}
                  <div
                    style={{
                      background: "#dcfce7",
                      border: "1px solid #86efac",
                      color: "#166534",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span>🛡️</span>
                    <span>100% Non-Expired Stock · Verified Fair Price</span>
                  </div>
                </div>

                <div style={{ display: "grid", gap: "6px" }}>
                  {activeFollowup.revisedMedicines.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        background: "#ffffff",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #bbf7d0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: "13px", color: "#0f172a" }}>
                          {m.name} ({m.strength})
                        </strong>
                        <span style={{ fontSize: "11.5px", color: "#475569", display: "block" }}>
                          Dose: {m.dose} · {m.instructions}
                        </span>
                      </div>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#15803d", background: "#f0fdf4", padding: "2px 6px", borderRadius: "4px" }}>
                        Active
                      </span>
                    </div>
                  ))}
                </div>

                {/* Transparent Fair Price Calculation */}
                {activeFollowup.totalPriceInr !== undefined && (
                  <div
                    style={{
                      background: "#ffffff",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "11.5px", color: "#64748b", display: "block" }}>
                        Government Jan Aushadhi Fair Price (MRP was ₹{activeFollowup.mrpPriceInr?.toFixed(2)})
                      </span>
                      <strong style={{ fontSize: "16px", color: "#047857" }}>
                        Exact Total to Pay: ₹{activeFollowup.totalPriceInr.toFixed(2)}
                      </strong>
                    </div>
                    {activeFollowup.savingsPercent !== undefined && (
                      <span
                        style={{
                          background: "#ecfdf5",
                          color: "#059669",
                          border: "1px solid #a7f3d0",
                          borderRadius: "20px",
                          padding: "4px 10px",
                          fontSize: "11.5px",
                          fontWeight: 700,
                        }}
                      >
                        🎉 Savings: {activeFollowup.savingsPercent.toFixed(1)}% OFF
                      </span>
                    )}
                  </div>
                )}

                {/* Suggested Chemist Box */}
                {activeFollowup.suggestedChemist && (
                  <div
                    style={{
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase" }}>
                        🏪 Recommended Nearest Medicine Shop:
                      </span>
                      <strong style={{ fontSize: "13px", color: "#1e3a8a", display: "block" }}>
                        {activeFollowup.suggestedChemist.name}
                      </strong>
                      <span style={{ fontSize: "11.5px", color: "#3b82f6" }}>
                        📍 {activeFollowup.suggestedChemist.address} · {activeFollowup.suggestedChemist.distanceKm} km away
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      {activeFollowup.suggestedChemist.phone && (
                        <a
                          href={`tel:${activeFollowup.suggestedChemist.phone}`}
                          style={{
                            background: "#2563eb",
                            color: "#ffffff",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 700,
                            textDecoration: "none",
                          }}
                        >
                          📞 Call Shop
                        </a>
                      )}
                      {onNavigateToChemistMap && (
                        <button
                          type="button"
                          onClick={onNavigateToChemistMap}
                          style={{
                            background: "#ffffff",
                            color: "#1d4ed8",
                            border: "1px solid #93c5fd",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          View Map ⌖
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              background: "#ffffff",
              padding: "12px 16px",
              borderRadius: "10px",
              border: "1px dashed #cbd5e1",
              fontSize: "13px",
              color: "#64748b",
            }}
          >
            No active follow-up message pending. Click <strong>&ldquo;Message Doctor / Adjust Dose&rdquo;</strong> anytime
            you need dosage clarification or want to report symptoms.
          </div>
        )}
      </div>

      {/* ── Follow-Up Creation Modal ────────────────────────────────────────── */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              maxWidth: "520px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "24px" }}>✉️</span>
                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#0f172a" }}>
                  Message Your Doctor
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "18px",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitFollowup} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Select Prescription */}
              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  1. Select Previous Prescription:
                </label>
                <select
                  value={selectedRxId}
                  onChange={(e) => setSelectedRxId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "13px",
                    background: "#ffffff",
                  }}
                >
                  {prescriptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} · {p.doctorName} ({p.diagnosis || "Consultation"})
                    </option>
                  ))}
                  {prescriptions.length === 0 && <option value="RX-9021">RX-9021 · Dr. Rajesh Patel (Hypertension)</option>}
                </select>
              </div>

              {/* Reason / Issue Type */}
              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  2. Reason for Follow-up:
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  {[
                    { id: "dose_change", label: "Need Dose Change", icon: "⚖️" },
                    { id: "side_effect", label: "Facing Side Effect", icon: "🤢" },
                    { id: "symptom_worsened", label: "Symptoms Not Reducing", icon: "🌡️" },
                    { id: "medicine_finished", label: "Medicine Refill", icon: "💊" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setIssueType(item.id as any)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "8px",
                        border: issueType === item.id ? "2px solid #059669" : "1px solid #cbd5e1",
                        background: issueType === item.id ? "#ecfdf5" : "#ffffff",
                        color: issueType === item.id ? "#065f46" : "#475569",
                        fontWeight: issueType === item.id ? 700 : 500,
                        fontSize: "12px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Patient Message */}
              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  3. Explain How You Feel to Doctor:
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. Taking Amlodipine 5mg for 3 days. Feeling slight dizziness and mild ankle swelling in the morning. Should I reduce the dose?"
                  value={patientMessage}
                  onChange={(e) => setPatientMessage(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "13px",
                    lineHeight: 1.4,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "6px" }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "none",
                    borderRadius: "8px",
                    padding: "9px 16px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "9px 20px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(5, 150, 105, 0.3)",
                  }}
                >
                  {submitting ? "Delivering..." : "Send to Doctor →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
