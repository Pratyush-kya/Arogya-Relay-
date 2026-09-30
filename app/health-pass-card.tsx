"use client";

import { useMemo, useState } from "react";
import type { ScreeningRecord } from "@/lib/supabase/screenings";
import { generateQRCodeMatrix } from "@/lib/qr/qr-encoder";

interface HealthPassProps {
  record: ScreeningRecord;
  onClose?: () => void;
}

export function HealthPassCard({ record, onClose }: HealthPassProps) {
  const [copied, setCopied] = useState(false);
  const [printMode, setPrintMode] = useState(false);

  // Compress payload for scan token
  const payloadString = useMemo(() => {
    const minified = {
      p: record.patient_ref,
      a: record.age,
      t: record.temperature,
      o: record.spo2,
      v: record.village,
      u: record.urgency_tier,
      s: record.symptoms.slice(0, 4),
      d: record.created_at.split("T")[0],
    };
    return JSON.stringify(minified);
  }, [record]);

  const qrMatrix = useMemo(() => generateQRCodeMatrix(payloadString), [payloadString]);

  const handleCopyToken = () => {
    navigator.clipboard?.writeText(payloadString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const isUrgent = record.urgency_tier === "urgent" || record.urgency_tier === "emergency";

  return (
    <div className={`health-pass-modal-backdrop ${printMode ? "print-only-mode" : ""}`}>
      <div className="health-pass-modal-window" role="dialog" aria-modal="true">
        {/* Modal Top Actions */}
        <div className="health-pass-topbar no-print">
          <span className="pass-pill-badge">
            <span className="dot" /> AYUSHMAN / ABHA-READY OFFLINE DIGITAL PASS
          </span>
          <div className="topbar-btns">
            <button
              type="button"
              className="pass-btn-secondary"
              onClick={() => setPrintMode((p) => !p)}
              title="Toggle Formal Clinical Slip Format"
            >
              📄 {printMode ? "Standard Pass" : "Formal MoHFW Slip"}
            </button>
            <button
              type="button"
              className="pass-btn-primary"
              onClick={handlePrint}
            >
              🖨️ Print Slip
            </button>
            {onClose && (
              <button
                type="button"
                className="pass-close-btn"
                onClick={onClose}
                aria-label="Close"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Digital Pass Card */}
        <div className="health-pass-card-sheet">
          <header className="pass-sheet-header">
            <div className="gov-emblem">
              <div className="emblem-circle">AR</div>
              <div>
                <h2>AROGYA RELAY DIGITAL HEALTH PASS</h2>
                <span>Community Clinical Surveillance &amp; Triage Handover Slip</span>
              </div>
            </div>
            <div className="qr-container">
              <svg viewBox={`0 0 ${qrMatrix.length} ${qrMatrix.length}`} className="offline-qr-svg" role="img" aria-label="Offline QR Code">
                {qrMatrix.map((row, r) =>
                  row.map((active, c) =>
                    active ? (
                      <rect key={`${r}-${c}`} x={c} y={r} width={1.02} height={1.02} fill="#0f2922" />
                    ) : null
                  )
                )}
              </svg>
              <small>Zero-Network QR</small>
            </div>
          </header>

          <div className="pass-patient-banner">
            <div>
              <small>Patient Identifier</small>
              <strong>{record.patient_ref}</strong>
            </div>
            <div>
              <small>Age &amp; Gender</small>
              <strong>{record.age} Years</strong>
            </div>
            <div>
              <small>Catchment Village</small>
              <strong>{record.village || "Mawlynnong"}</strong>
            </div>
            <div>
              <small>Clinical Triage Tier</small>
              <span className={`pass-tier-pill ${record.urgency_tier}`}>
                {record.urgency_tier.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="pass-vitals-strip">
            <div className="vital-item">
              <span>Body Temperature</span>
              <strong>{record.temperature} °C</strong>
              <small>{record.temperature >= 38 ? "⚠️ Febrile" : "Normal"}</small>
            </div>
            <div className="vital-item">
              <span>Oxygen Saturation</span>
              <strong>{record.spo2}% SpO₂</strong>
              <small>{record.spo2 < 94 ? "⚠️ Hypoxia Risk" : "Normal"}</small>
            </div>
            <div className="vital-item">
              <span>Primary Symptoms</span>
              <strong>{record.symptoms.join(", ") || "None flagged"}</strong>
              <small>{record.symptoms.length} symptom(s) active</small>
            </div>
          </div>

          {/* Doctor Evaluation / Prescription if available */}
          {record.doctor_notes && (
            <div className="pass-doctor-box">
              <div className="doc-box-header">
                <strong>👨‍⚕️ Clinician Assessment &amp; Orders:</strong>
                <span>By: {record.evaluated_by || "Attending Physician"}</span>
              </div>
              <p><strong>Clinical Notes:</strong> {record.doctor_notes}</p>
              {record.prescription_advice && (
                <p><strong>Prescription / Care Plan:</strong> {record.prescription_advice}</p>
              )}
            </div>
          )}

          {/* Field notes */}
          {record.field_notes && (
            <div className="pass-field-notes">
              <small>ASHA Field Worker Notes:</small>
              <p>{record.field_notes}</p>
            </div>
          )}

          <footer className="pass-sheet-footer">
            <div className="footer-meta">
              <span>Recorded: {new Date(record.created_at).toLocaleString("en-IN")}</span>
              <span>Sync Status: {record.synced ? "✓ Cloud Synced" : "⚡ Stored Locally (Mesh Ready)"}</span>
            </div>
            <div className="footer-token-copy">
              <button type="button" onClick={handleCopyToken} className="copy-token-link">
                {copied ? "✓ Copied Token" : "📋 Copy Encrypted Offline Token"}
              </button>
            </div>
          </footer>

          <div className="pass-legal-stamp">
            <span>OFFLINE REFERRAL SPECIFICATION · MINISTRY OF HEALTH &amp; FAMILY WELFARE ALIGNED · NOT A CERTIFIED DEVICE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
