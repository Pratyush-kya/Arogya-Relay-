"use client";

import { useEffect, useState } from "react";
import {
  getActiveSupabaseConfig,
  setCustomSupabaseConfig,
  clearCustomSupabaseConfig,
} from "@/lib/supabase/client";
import { LanguageSwitcher } from "./language-switcher";
import { IconTooltip } from "./icon-tooltip";

export interface SupabaseScreenProps {
  onBackToDashboard: () => void;
}

export function SupabaseScreen({ onBackToDashboard }: SupabaseScreenProps) {
  const currentConfig = getActiveSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.key);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: {
      status: number;
      latencyMs: number;
      tablesFound: boolean;
    };
  } | null>(null);

  const [activeTab, setActiveTab] = useState<"overview" | "settings" | "schema" | "storage">("overview");

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

  // Run initial test on mount
  useEffect(() => {
    runConnectionTest(currentConfig.url, currentConfig.key);
  }, []);

  async function runConnectionTest(targetUrl: string, targetKey: string) {
    if (!targetUrl.trim() || !targetKey.trim()) {
      setTestResult({
        success: false,
        message: "Please enter both Supabase Project URL and Public API Key.",
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    const startTime = performance.now();
    try {
      const cleanUrl = targetUrl.trim().replace(/\/$/, "");
      const res = await fetch(`${cleanUrl}/rest/v1/screenings?select=count`, {
        method: "GET",
        headers: {
          apikey: targetKey.trim(),
          Authorization: `Bearer ${targetKey.trim()}`,
        },
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (res.ok) {
        setTestResult({
          success: true,
          message: `✓ Connected to Supabase Cloud Database! (Response time: ${latencyMs}ms)`,
          details: { status: res.status, latencyMs, tablesFound: true },
        });
      } else if (res.status === 404) {
        setTestResult({
          success: false,
          message:
            "Connected to Supabase endpoint, but the 'screenings' table was not found. Please run the SQL migration in your Supabase SQL editor.",
          details: { status: res.status, latencyMs, tablesFound: false },
        });
      } else {
        setTestResult({
          success: false,
          message: `Supabase returned HTTP ${res.status}: ${res.statusText}`,
          details: { status: res.status, latencyMs, tablesFound: false },
        });
      }
    } catch (e) {
      const latencyMs = Math.round(performance.now() - startTime);
      setTestResult({
        success: false,
        message: `Offline / Connection issue: ${
          e instanceof Error ? e.message : "Network unreachable"
        }. Arogya Relay is operating 100% locally in IndexedDB and will auto-sync when online.`,
        details: { status: 0, latencyMs, tablesFound: false },
      });
    } finally {
      setTesting(false);
    }
  }

  function handleSave() {
    setCustomSupabaseConfig(url, anonKey);
    runConnectionTest(url, anonKey);
  }

  function handleResetDefault() {
    clearCustomSupabaseConfig();
    const def = getActiveSupabaseConfig();
    setUrl(def.url);
    setAnonKey(def.key);
    runConnectionTest(def.url, def.key);
  }

  return (
    <div className="fullscreen-console" role="main">
      {/* Top Header */}
      <header className="fullscreen-header">
        <div className="fullscreen-header-left">
          <IconTooltip
            title="Return to Primary Clinic Dashboard"
            desc="Exits the Supabase Cloud console and returns to the patient cases view."
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
              <span>⚡</span>
              <span>Supabase Cloud Database & Storage Workstation</span>
            </h1>
            <p>PostgreSQL persistence · S3 storage buckets · Auth & offline sync engine</p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {/* Live Status Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              borderRadius: "20px",
              background: testResult?.success ? "#dcfce7" : "#fee2e2",
              border: testResult?.success ? "1px solid #86efac" : "1px solid #fca5a5",
              fontSize: "12px",
              fontWeight: 700,
              color: testResult?.success ? "#15803d" : "#b91c1c",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: testResult?.success ? "#22c55e" : "#ef4444",
                display: "inline-block",
              }}
            />
            <span>{testing ? "Testing..." : testResult?.success ? "Cloud Connected" : "Local Offline Mode"}</span>
          </div>

          <LanguageSwitcher />

          <button
            type="button"
            className="primary-button"
            onClick={handleSave}
            disabled={testing}
            style={{ padding: "8px 16px", fontSize: "12px", fontWeight: 700 }}
          >
            {testing ? "Testing..." : "Save & Reconnect"}
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <div className="fullscreen-content-container">
        {/* Navigation Tabs */}
        <nav
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "24px",
            borderBottom: "1px solid #e2e8f0",
            paddingBottom: "8px",
          }}
        >
          {[
            { id: "overview", label: "📊 Architecture & Health", icon: "🏛️" },
            { id: "settings", label: "⚙️ Credentials & Endpoints", icon: "🔑" },
            { id: "storage", label: "🗄️ S3 Storage Buckets", icon: "📦" },
            { id: "schema", label: "📑 Database Schema & Tables", icon: "🗃️" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                fontSize: "12.5px",
                fontWeight: activeTab === t.id ? 800 : 500,
                border: "none",
                background: activeTab === t.id ? "var(--sc-accent, #17644f)" : "transparent",
                color: activeTab === t.id ? "#ffffff" : "#475569",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.15s ease",
              }}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        {/* TAB 1: ARCHITECTURE & HEALTH */}
        {activeTab === "overview" && (
          <div style={{ display: "grid", gap: "20px" }}>
            {/* Live Connection Banner */}
            <div
              style={{
                padding: "20px",
                borderRadius: "16px",
                background: testResult?.success ? "#f0fdf4" : "#fffbeb",
                border: testResult?.success ? "1.5px solid #86efac" : "1.5px solid #fde68a",
                boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3
                    style={{
                      margin: "0 0 6px",
                      fontSize: "16px",
                      fontWeight: 800,
                      color: testResult?.success ? "#166534" : "#92400e",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span>{testResult?.success ? "✓" : "⚡"}</span>
                    <span>
                      {testResult?.success
                        ? "Supabase PostgreSQL Database Active & Healthy"
                        : "Offline-First Local Storage Engine Active"}
                    </span>
                  </h3>
                  <p style={{ margin: 0, fontSize: "12.5px", color: testResult?.success ? "#15803d" : "#b45309" }}>
                    {testResult?.message || "Running diagnostic check..."}
                  </p>
                </div>

                <button
                  type="button"
                  className="glass-button"
                  onClick={() => runConnectionTest(url, anonKey)}
                  disabled={testing}
                  style={{ padding: "6px 14px", fontSize: "12px", fontWeight: 700 }}
                >
                  {testing ? "Testing..." : "🔄 Ping Cloud Database"}
                </button>
              </div>

              {testResult?.details && (
                <div
                  style={{
                    display: "flex",
                    gap: "24px",
                    marginTop: "16px",
                    paddingTop: "14px",
                    borderTop: "1px solid rgba(0,0,0,0.06)",
                    fontSize: "12px",
                  }}
                >
                  <div>
                    <span style={{ color: "#64748b" }}>Roundtrip Latency:</span>{" "}
                    <strong>{testResult.details.latencyMs} ms</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>HTTP Status:</span>{" "}
                    <strong>{testResult.details.status} OK</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>Clinical Tables:</span>{" "}
                    <strong>{testResult.details.tablesFound ? "Accessible (RLS Enabled)" : "Needs Migration"}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* 3 Clear Architecture Pillars */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
              <div className="workstation-card">
                <div style={{ fontSize: "28px", marginBottom: "10px" }}>🗃️</div>
                <h4 style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: 800 }}>1. PostgreSQL Database</h4>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748b", lineHeight: 1.45 }}>
                  Stores patient screenings, vitals, triage records, and clinical evaluation notes. Secured with Row Level Security (RLS) so only authenticated workers and doctors can read and write data.
                </p>
              </div>

              <div className="workstation-card">
                <div style={{ fontSize: "28px", marginBottom: "10px" }}>📦</div>
                <h4 style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: 800 }}>2. S3 Storage Buckets</h4>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748b", lineHeight: 1.45 }}>
                  Stores clinical lesion photographs, digital prescription slips, and doctor NMC medical registration certificate proof documents. Includes automatic zero-downtime base64 fallback when offline.
                </p>
              </div>

              <div className="workstation-card">
                <div style={{ fontSize: "28px", marginBottom: "10px" }}>🔄</div>
                <h4 style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: 800 }}>3. Zero-Downtime Offline Relay</h4>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748b", lineHeight: 1.45 }}>
                  In remote 2G or zero-connectivity tribal zones, Arogya Relay saves all records directly to browser IndexedDB storage. As soon as internet returns, the background sync engine pushes all queued items to Supabase.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CREDENTIALS & SETTINGS */}
        {activeTab === "settings" && (
          <div className="workstation-card" style={{ maxWidth: "780px", margin: "0 auto" }}>
            <div className="workstation-card-title">
              <span>🔑 Supabase Cloud Credentials</span>
              <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>
                {currentConfig.source === "user_custom" ? "Custom Config (Browser Storage)" : "Default System Config"}
              </span>
            </div>

            <div style={{ display: "grid", gap: "18px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  Supabase Project URL:
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    background: "#f8fafc",
                  }}
                />
                <small style={{ fontSize: "10.5px", color: "#64748b", marginTop: "4px", display: "block" }}>
                  This is your dedicated HTTPS endpoint provided in your Supabase project dashboard (Settings &gt; API).
                </small>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700 }}>
                    Supabase Anonymous / Publishable API Key:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowKey((s) => !s)}
                    style={{ background: "none", border: "none", color: "#0284c7", fontSize: "11px", cursor: "pointer", fontWeight: 600 }}
                  >
                    {showKey ? "Hide key" : "Show key"}
                  </button>
                </div>
                <input
                  type={showKey ? "text" : "password"}
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  placeholder="sb_publishable_... or eyJhbGciOi..."
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    background: "#f8fafc",
                    fontFamily: "monospace",
                  }}
                />
                <small style={{ fontSize: "10.5px", color: "#64748b", marginTop: "4px", display: "block" }}>
                  The client-safe public key used to authenticate API requests under Row Level Security.
                </small>
              </div>

              {testResult && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "8px",
                    background: testResult.success ? "#ecfdf5" : "#fef2f2",
                    border: testResult.success ? "1px solid #a7f3d0" : "1px solid #fecaca",
                    color: testResult.success ? "#065f46" : "#991b1b",
                    fontSize: "12.5px",
                    lineHeight: 1.4,
                  }}
                >
                  {testResult.message}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "14px", borderTop: "1px solid #f1f5f9" }}>
                <button
                  type="button"
                  onClick={handleResetDefault}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#dc2626",
                    fontSize: "12px",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Reset to Default Hosted Supabase Project
                </button>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => runConnectionTest(url, anonKey)}
                    disabled={testing}
                    className="secondary-button"
                    style={{ padding: "8px 16px", fontSize: "12px" }}
                  >
                    {testing ? "Testing..." : "Test Connection"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={testing}
                    className="primary-button"
                    style={{ padding: "8px 18px", fontSize: "12px", fontWeight: 700 }}
                  >
                    Save & Reconnect
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: S3 STORAGE BUCKETS */}
        {activeTab === "storage" && (
          <div style={{ display: "grid", gap: "16px" }}>
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "16px", borderRadius: "12px" }}>
              <h4 style={{ margin: "0 0 4px", fontSize: "14px", color: "#1e40af", fontWeight: 800 }}>
                📦 S3 Storage Buckets Configuration
              </h4>
              <p style={{ margin: 0, fontSize: "12px", color: "#3b82f6" }}>
                Arogya Relay utilizes three dedicated Supabase S3-compatible buckets for binary asset management:
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
              <div className="workstation-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <strong style={{ fontSize: "14px", color: "#0f172a" }}>screenings</strong>
                  <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "10px", background: "#dcfce7", color: "#15803d" }}>
                    Public Read
                  </span>
                </div>
                <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 10px", lineHeight: 1.4 }}>
                  Stores patient lesion, rash, and wound photographs captured during field clinical screening.
                </p>
                <div style={{ fontSize: "11px", color: "#334155", background: "#f8fafc", padding: "8px", borderRadius: "6px" }}>
                  <strong>Offline Fallback:</strong> Base64 Data URL cached in IndexedDB until online.
                </div>
              </div>

              <div className="workstation-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <strong style={{ fontSize: "14px", color: "#0f172a" }}>prescriptions</strong>
                  <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "10px", background: "#dcfce7", color: "#15803d" }}>
                    Public Read
                  </span>
                </div>
                <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 10px", lineHeight: 1.4 }}>
                  Stores uploaded prescription slips, doctor orders, and pharmacy dispensing slips.
                </p>
                <div style={{ fontSize: "11px", color: "#334155", background: "#f8fafc", padding: "8px", borderRadius: "6px" }}>
                  <strong>Security:</strong> Linked directly to verified physician signature.
                </div>
              </div>

              <div className="workstation-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <strong style={{ fontSize: "14px", color: "#0f172a" }}>doctor-credentials</strong>
                  <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "10px", background: "#fef3c7", color: "#92400e" }}>
                    Admin Gated
                  </span>
                </div>
                <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 10px", lineHeight: 1.4 }}>
                  Stores National Medical Commission (NMC) registration certificates and physician IDs for review.
                </p>
                <div style={{ fontSize: "11px", color: "#334155", background: "#f8fafc", padding: "8px", borderRadius: "6px" }}>
                  <strong>Access:</strong> Inspected solely by System Administrator.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DATABASE SCHEMA & TABLES */}
        {activeTab === "schema" && (
          <div style={{ display: "grid", gap: "16px" }}>
            <div className="workstation-card">
              <div className="workstation-card-title">
                <span>📑 Active PostgreSQL Tables & Migrations</span>
                <span style={{ fontSize: "11px", color: "#15803d", fontWeight: 700 }}>
                  Migration: 20260927000001
                </span>
              </div>

              <div style={{ display: "grid", gap: "12px" }}>
                <div style={{ padding: "12px", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <strong style={{ fontSize: "13px", color: "var(--sc-accent, #17644f)" }}>public.profiles</strong>
                    <span style={{ fontSize: "10px", color: "#64748b" }}>User Roles & Verification</span>
                  </div>
                  <p style={{ margin: "0 0 6px", fontSize: "11.5px", color: "#64748b" }}>
                    Stores user roles (<code>admin</code>, <code>doctor</code>, <code>health_worker</code>), NMC registration numbers, council names, and verification status (<code>pending_verification</code>, <code>verified</code>, <code>rejected</code>).
                  </p>
                  <code style={{ fontSize: "10.5px", background: "#f1f5f9", padding: "4px 8px", borderRadius: "4px", display: "block" }}>
                    id UUID PRIMARY KEY, role TEXT, medical_reg_no TEXT, verification_status TEXT...
                  </code>
                </div>

                <div style={{ padding: "12px", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <strong style={{ fontSize: "13px", color: "var(--sc-accent, #17644f)" }}>public.screenings</strong>
                    <span style={{ fontSize: "10px", color: "#64748b" }}>Patient Clinical Records</span>
                  </div>
                  <p style={{ margin: "0 0 6px", fontSize: "11.5px", color: "#64748b" }}>
                    Stores patient demographics, SpO₂, blood pressure, temperature, triage urgency tier, lesion photo URLs, and authenticated screener metadata.
                  </p>
                  <code style={{ fontSize: "10.5px", background: "#f1f5f9", padding: "4px 8px", borderRadius: "4px", display: "block" }}>
                    id UUID PRIMARY KEY, pseudo_id TEXT, vitals JSONB, urgency_tier TEXT, image_url TEXT...
                  </code>
                </div>

                <div style={{ padding: "12px", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <strong style={{ fontSize: "13px", color: "var(--sc-accent, #17644f)" }}>public.doctor_evaluations</strong>
                    <span style={{ fontSize: "10px", color: "#64748b" }}>Telemedicine Reviews</span>
                  </div>
                  <p style={{ margin: "0 0 6px", fontSize: "11.5px", color: "#64748b" }}>
                    Teleconsultation doctor evaluations, diagnosis confirmations, and digital prescriptions authored by verified physicians.
                  </p>
                  <code style={{ fontSize: "10.5px", background: "#f1f5f9", padding: "4px 8px", borderRadius: "4px", display: "block" }}>
                    id UUID PRIMARY KEY, screening_id UUID, doctor_id UUID, prescription_orders JSONB...
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
