"use client";

import { useLanguage } from "@/lib/i18n/provider";
import { LanguageSwitcher } from "./language-switcher";
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
    email?: string;
  } | null;
  onSignOut: () => Promise<void>;
}

export function DoctorWorkspace({
  currentUser,
  currentProfile,
  onSignOut,
}: DoctorWorkspaceProps) {
  const { t } = useLanguage();

  const isSamarpit =
    currentUser?.email?.includes("samarpit") || currentUser?.email?.includes("samarpitbiswal966");

  const docName =
    currentProfile?.display_name ||
    currentProfile?.full_name ||
    (currentUser as any)?.user_metadata?.display_name ||
    (isSamarpit ? "Dr. Samarpit Biswal, MD" : "Dr. Bishnu Prasad Satapathy, MBBS");

  const regNo =
    (currentProfile as any)?.medical_reg_no ||
    currentProfile?.nmc_registration_number ||
    (currentUser as any)?.user_metadata?.medical_reg_no ||
    (isSamarpit ? "OMC-2020-54190" : "OMC-2018-88412");

  const hospital =
    (currentProfile as any)?.facility_name ||
    currentProfile?.hospital_affiliation ||
    (currentUser as any)?.user_metadata?.facility_name ||
    (isSamarpit ? "AIIMS Bhubaneswar (Apex Trauma Centre)" : "Capital Hospital Bhubaneswar / DHH Khurda");
  const docEmail =
    currentProfile?.email ||
    currentUser?.email ||
    (isSamarpit ? "samarpitbiswal966@gmail.com" : "bishnuprasadsatapathy7846@gmail.com");

  return (
    <div
      className="doctor-workspace-shell"
      style={{
        minHeight: "100vh",
        background: "var(--background, #f8fafc)",
        display: "flex",
        flexDirection: "column",
      }}
    >
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "26px" }}>👨‍⚕️</span>
            <div>
              <strong style={{ fontSize: "16px", color: "#0284c7", display: "block", lineHeight: 1.1 }}>
                Arogya Relay
              </strong>
              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--muted, #64748b)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {t("doctor.workstationTitle")}
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
          <LanguageSwitcher />

          <button
            type="button"
            onClick={onSignOut}
            style={{
              background: "#fee2e2",
              color: "#b91c1c",
              border: "1px solid #fca5a5",
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>🚪</span>
            <span>{t("patient.logout")}</span>
          </button>
        </div>
      </header>

      {/* ── Main Workspace: Patient Reports & Sent Track Engine ────────────── */}
      <main style={{ maxWidth: "1280px", width: "100%", margin: "0 auto", padding: "20px 24px", flex: 1 }}>
        <DoctorFollowupManager doctorName={docName} doctorNmc={regNo} doctorEmail={docEmail} />
      </main>
    </div>
  );
}
