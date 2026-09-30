"use client";

import React from "react";
import { LanguageSwitcher } from "./language-switcher";

export interface PublicLandingProps {
  onSignIn: (preferredRole?: "patient" | "doctor" | "health_worker" | "chemist") => void;
  onSignUp: (preferredRole?: "patient" | "doctor" | "health_worker" | "chemist") => void;
  onOpenAdmin: () => void;
}

export function PublicLanding({ onSignIn, onSignUp, onOpenAdmin }: PublicLandingProps) {
  return (
    <div className="public-landing-container" style={{ minHeight: "100vh", background: "var(--bg, #f8fafc)", color: "var(--ink, #0f172a)", fontFamily: "var(--font-sans, system-ui, sans-serif)" }}>
      {/* Top Announcement & Emergency Banner */}
      <div
        style={{
          background: "linear-gradient(90deg, #064e3b 0%, #065f46 100%)",
          color: "#ecfdf5",
          padding: "7px 16px",
          fontSize: "12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, background: "#047857", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", letterSpacing: "0.4px" }}>
            🇮🇳 NATIONAL DIGITAL HEALTH RELAY
          </span>
          <span>Emergency Assistance:</span>
          <a href="tel:112" style={{ color: "#a7f3d0", fontWeight: 700, textDecoration: "none" }}>🚨 112 (All India Emergency)</a>
          <span style={{ opacity: 0.5 }}>|</span>
          <a href="tel:108" style={{ color: "#a7f3d0", fontWeight: 700, textDecoration: "none" }}>🚑 108 (Ambulance)</a>
          <span style={{ opacity: 0.5 }}>|</span>
          <a href="tel:104" style={{ color: "#a7f3d0", fontWeight: 700, textDecoration: "none" }}>📞 104 (Health Helpline)</a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "11px", color: "#6ee7b7" }}>● 100% Offline-Resilient Node</span>
          <a
            href="/admin"
            onClick={(e) => {
              e.preventDefault();
              onOpenAdmin();
            }}
            style={{ color: "#d1fae5", fontSize: "11px", textDecoration: "underline", opacity: 0.85 }}
          >
            Admin Portal
          </a>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <header
        style={{
          background: "rgba(255, 255, 255, 0.96)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--line, #e2e8f0)",
          padding: "12px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "22px",
              boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)",
            }}
          >
            🌿
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "19px", fontWeight: 800, color: "var(--ink, #0f172a)", letterSpacing: "-0.3px", display: "flex", alignItems: "center", gap: "8px" }}>
              Arogya Relay
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#059669", background: "#d1fae5", padding: "2px 8px", borderRadius: "12px" }}>
                ABDM Verified
              </span>
            </h1>
            <p style={{ margin: 0, fontSize: "11.5px", color: "#64748b" }}>
              Offline-First Community Healthcare &amp; Clinical Relay System
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <LanguageSwitcher />

          <button
            type="button"
            onClick={() => onSignIn()}
            style={{
              padding: "7px 16px",
              borderRadius: "8px",
              border: "1px solid var(--line, #cbd5e1)",
              background: "#ffffff",
              color: "var(--ink, #0f172a)",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={() => onSignUp()}
            style={{
              padding: "7px 18px",
              borderRadius: "8px",
              border: "none",
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(5, 150, 105, 0.3)",
              transition: "all 0.15s ease",
            }}
          >
            Create Account (Sign Up)
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "54px 20px 36px",
          textAlign: "center",
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#dcfce7", color: "#15803d", padding: "4px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, marginBottom: "16px" }}>
          <span>🛡️</span> Zero-Loss Clinical Relay · 2G &amp; Offline Resilient
        </div>

        <h2
          style={{
            fontSize: "clamp(28px, 4.5vw, 44px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "var(--ink, #0f172a)",
            lineHeight: 1.18,
            maxWidth: "840px",
            margin: "0 auto 16px",
          }}
        >
          Institutional Health Access for Bharat, Connected or Disconnected.
        </h2>

        <p
          style={{
            fontSize: "clamp(15px, 2vw, 17px)",
            color: "#475569",
            maxWidth: "720px",
            margin: "0 auto 28px",
            lineHeight: 1.55,
          }}
        >
          Dedicated portals for Citizens, Doctors, ASHA Community Health Workers, and PMBJP Jan Aushadhi Chemists. Sign in to your authorized workstation to access your specific tools.
        </p>

        {/* Primary Action Buttons */}
        <div style={{ display: "flex", justifyContent: "center", gap: "14px", flexWrap: "wrap", marginBottom: "40px" }}>
          <button
            type="button"
            onClick={() => onSignIn()}
            style={{
              padding: "12px 28px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(5, 150, 105, 0.35)",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>🔐</span> Sign In to Your Portal
          </button>

          <button
            type="button"
            onClick={() => onSignUp()}
            style={{
              padding: "12px 28px",
              borderRadius: "10px",
              background: "#ffffff",
              color: "#065f46",
              fontSize: "15px",
              fontWeight: 700,
              border: "1.5px solid #a7f3d0",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>✍️</span> Create New Account / Sign Up
          </button>
        </div>

        {/* Four Dedicated Role Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "20px",
            textAlign: "left",
            marginTop: "16px",
          }}
        >
          {/* Card 1: Citizen & Patient */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              padding: "24px 20px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 3px 10px rgba(0,0,0,0.03)",
              transition: "transform 0.15s ease, border-color 0.15s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#e0f2fe", color: "#0284c7", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                👤
              </div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>Citizen &amp; Patient</h3>
            </div>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#64748b", lineHeight: 1.5, flex: 1 }}>
              Universal ABHA health pass, consultation bookings, Arogya Gyan evidence-based home remedies, verified prescriptions, and PMBJP generic medicine finder.
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => onSignIn("patient")}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "6px",
                  border: "1px solid #bae6fd",
                  background: "#f0f9ff",
                  color: "#0369a1",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => onSignUp("patient")}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#0284c7",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Card 2: Doctor */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              padding: "24px 20px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 3px 10px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#ecfdf5", color: "#059669", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                🩺
              </div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>Medical Doctor</h3>
            </div>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#64748b", lineHeight: 1.5, flex: 1 }}>
              NMC-verified clinical triage workstation, tele-consultation queue, deterministic clinical triage guidance, and digitally signed e-prescriptions.
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => onSignIn("doctor")}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "6px",
                  border: "1px solid #a7f3d0",
                  background: "#ecfdf5",
                  color: "#065f46",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => onSignUp("doctor")}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#059669",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Sign Up (NMC)
              </button>
            </div>
          </div>

          {/* Card 3: Health Worker (ASHA) */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              padding: "24px 20px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 3px 10px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#fef3c7", color: "#d97706", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                👩‍⚕️
              </div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>ASHA Health Worker</h3>
            </div>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#64748b", lineHeight: 1.5, flex: 1 }}>
              Door-to-door community health screening with offline storage, voice vitals dictation in Hindi &amp; English, fever cluster tracking, and hospital referrals.
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => onSignIn("health_worker")}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "6px",
                  border: "1px solid #fde68a",
                  background: "#fffbeb",
                  color: "#b45309",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => onSignUp("health_worker")}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#d97706",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Card 4: Chemist */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              padding: "24px 20px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 3px 10px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#f3e8ff", color: "#9333ea", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                🏪
              </div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>Chemist &amp; Dispensary</h3>
            </div>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#64748b", lineHeight: 1.5, flex: 1 }}>
              Prescription QR scanner with single-use cryptographic token burn to prevent double dispensing, and PMBJP generic drug alternative inventory.
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => onSignIn("chemist")}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "6px",
                  border: "1px solid #e9d5ff",
                  background: "#faf5ff",
                  color: "#7e22ce",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => onSignUp("chemist")}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#9333ea",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Architecture Matrix */}
      <section
        style={{
          background: "#ffffff",
          borderTop: "1px solid #e2e8f0",
          borderBottom: "1px solid #e2e8f0",
          padding: "44px 20px",
          marginTop: "40px",
        }}
      >
        <div style={{ maxWidth: "1160px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Engineered for Real Bharat Conditions
            </span>
            <h3 style={{ margin: "6px 0 0", fontSize: "24px", fontWeight: 800, color: "#0f172a" }}>
              Why Arogya Relay is Different
            </h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px" }}>
            <div style={{ padding: "16px", borderRadius: "10px", background: "#f8fafc" }}>
              <div style={{ fontSize: "22px", marginBottom: "8px" }}>📡</div>
              <h4 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: 700 }}>100% Offline Capability</h4>
              <p style={{ margin: 0, fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>
                Local IndexedDB and PWA service workers ensure screenings, symptoms, and voice dictations are stored safely even when cellular network drops to zero.
              </p>
            </div>

            <div style={{ padding: "16px", borderRadius: "10px", background: "#f8fafc" }}>
              <div style={{ fontSize: "22px", marginBottom: "8px" }}>🔐</div>
              <h4 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: 700 }}>Single-Use Burn Tokens</h4>
              <p style={{ margin: 0, fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>
                Prescription QR codes carry a cryptographic burn token verified at Jan Aushadhi pharmacies, preventing dangerous double-dispensing and medicine fraud.
              </p>
            </div>

            <div style={{ padding: "16px", borderRadius: "10px", background: "#f8fafc" }}>
              <div style={{ fontSize: "22px", marginBottom: "8px" }}>🩺</div>
              <h4 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: 700 }}>Verified Doctor Network</h4>
              <p style={{ margin: 0, fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>
                Doctors register with their National Medical Commission (NMC) registration number and state medical council certificates, approved before entering clinical queues.
              </p>
            </div>

            <div style={{ padding: "16px", borderRadius: "10px", background: "#f8fafc" }}>
              <div style={{ fontSize: "22px", marginBottom: "8px" }}>🇮🇳</div>
              <h4 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: 700 }}>Multilingual Support</h4>
              <p style={{ margin: 0, fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>
                Available in 8 Indian languages (Hindi, English, Odia, Santali, Bengali, Marathi, Tamil, Telugu) with offline voice vitals recognition.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "36px 20px 48px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          fontSize: "12px",
          color: "#64748b",
        }}
      >
        <div>
          <strong style={{ color: "#0f172a" }}>Arogya Relay</strong> · Ayushman Bharat Digital Mission aligned clinical relay.
          <p style={{ margin: "4px 0 0" }}>Not a diagnostic medical device. Clinical triage decisions must be confirmed by qualified medical officers.</p>
        </div>

        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => onSignIn()}
            style={{ background: "none", border: "none", color: "#059669", fontWeight: 600, cursor: "pointer", fontSize: "12px" }}
          >
            Sign In
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => onSignUp()}
            style={{ background: "none", border: "none", color: "#059669", fontWeight: 600, cursor: "pointer", fontSize: "12px" }}
          >
            Sign Up
          </button>
          <span>·</span>
          <a
            href="/admin"
            onClick={(e) => {
              e.preventDefault();
              onOpenAdmin();
            }}
            style={{ color: "#b45309", fontWeight: 700, textDecoration: "none" }}
          >
            🛡️ Administrative Console
          </a>
        </div>
      </footer>
    </div>
  );
}
