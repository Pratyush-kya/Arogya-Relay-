"use client";

import { useEffect, useRef, useState } from "react";
import {
  getActiveSupabaseConfig,
  setCustomSupabaseConfig,
  clearCustomSupabaseConfig,
  ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
  SUPABASE_ORG_ID,
  SUPABASE_ORG_URL,
  S3_STORAGE_ENDPOINT,
  type StorageBucket,
  type StoredFileInfo,
  uploadToStorage,
  listStorageFiles,
  deleteStorageFile,
} from "@/lib/supabase/client";
import { LanguageSwitcher } from "./language-switcher";
import { IconTooltip } from "./icon-tooltip";

export interface SupabaseScreenProps {
  onBackToDashboard: () => void;
  onOpenAuth?: () => void;
}

const BUCKET_DEFINITIONS: {
  id: StorageBucket;
  name: string;
  badge: string;
  badgeColor: { bg: string; text: string };
  desc: string;
  retention: string;
  icon: string;
}[] = [
  {
    id: "screenings",
    name: "screenings",
    icon: "🔬",
    badge: "Public Read / RLS",
    badgeColor: { bg: "#dcfce7", text: "#15803d" },
    desc: "Stores field screening photos, skin lesion captures, vitals waveforms, and patient wound photography.",
    retention: "7-Year Medical Audit Log",
  },
  {
    id: "prescriptions",
    name: "prescriptions",
    icon: "📋",
    badge: "Doctor Signed",
    badgeColor: { bg: "#dbeafe", text: "#1d4ed8" },
    desc: "Digital prescription orders, e-dispensing slips, drug schedule charts, and signed physician consultations.",
    retention: "Permanent Clinical Record",
  },
  {
    id: "doctor-credentials",
    name: "doctor-credentials",
    icon: "🛡️",
    badge: "Admin Gated",
    badgeColor: { bg: "#fef3c7", text: "#92400e" },
    desc: "National Medical Commission (NMC) registration certificates, State Council identity proofs, and clinic affiliations.",
    retention: "Admin Verification Vault",
  },
  {
    id: "patient-records",
    name: "patient-records",
    icon: "📁",
    badge: "HIPAA / ABDM Encrypted",
    badgeColor: { bg: "#f3e8ff", text: "#7e22ce" },
    desc: "EHR diagnostic histories, laboratory reports, ABDM health IDs, consent tokens, and referral packages.",
    retention: "Confidential Patient Archive",
  },
];

export function SupabaseScreen({ onBackToDashboard, onOpenAuth }: SupabaseScreenProps) {
  const currentConfig = getActiveSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.key);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: {
      status: number;
      latencyMs: number;
      tablesFound: boolean;
    };
  } | null>(null);

  const [activeTab, setActiveTab] = useState<"overview" | "settings" | "storage" | "schema">("overview");

  // Storage Bucket Explorer State
  const [selectedBucket, setSelectedBucket] = useState<StorageBucket>("screenings");
  const [bucketFiles, setBucketFiles] = useState<StoredFileInfo[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch files whenever storage tab or bucket changes
  useEffect(() => {
    if (activeTab === "storage") {
      fetchBucketFiles(selectedBucket);
    }
  }, [activeTab, selectedBucket]);

  async function fetchBucketFiles(bucket: StorageBucket) {
    setLoadingFiles(true);
    try {
      const files = await listStorageFiles(bucket);
      setBucketFiles(files);
    } catch {
      setBucketFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  }

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
        message: `Offline / Connection Notice: ${
          e instanceof Error ? e.message : "Network unreachable"
        }. Arogya Relay is operating 100% locally in IndexedDB with S3 data URL fallback and will auto-sync when online.`,
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

  async function handleFileUpload() {
    if (!selectedFile) return;

    setUploading(true);
    setUploadFeedback(null);

    try {
      const res = await uploadToStorage(selectedBucket, selectedFile.name, selectedFile);
      setUploadFeedback(
        res.source === "supabase_storage"
          ? `✓ Uploaded to S3 bucket [${selectedBucket}] successfully!`
          : `✓ Saved to local offline vault. Queued for S3 upload upon network reconnection.`
      );
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchBucketFiles(selectedBucket);
    } catch (err: any) {
      setUploadFeedback(`Upload error: ${err.message || "Failed to process file."}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteFile(fileName: string) {
    if (!confirm(`Delete ${fileName} from S3 bucket [${selectedBucket}]?`)) return;
    await deleteStorageFile(selectedBucket, fileName);
    await fetchBucketFiles(selectedBucket);
  }

  function copyToClipboard(text: string, label: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(label);
      setTimeout(() => setCopiedKey(null), 2000);
    }
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
              <span>Supabase Cloud Database & S3 Storage Workstation</span>
            </h1>
            <p>
              Org: <strong>{SUPABASE_ORG_ID}</strong> · PostgreSQL Persistence · S3 Buckets · Admin Control
            </p>
          </div>
        </div>

        <div className="fullscreen-header-actions" style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Org Direct Link */}
          <a
            href={SUPABASE_ORG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="secondary-button"
            style={{
              padding: "6px 12px",
              fontSize: "11px",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              textDecoration: "none",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              color: "#0f172a",
            }}
          >
            <span>🌐</span>
            <span>Supabase Org Dashboard ↗</span>
          </a>

          {/* Live Status Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              padding: "5px 12px",
              borderRadius: "20px",
              background: testResult?.success ? "#dcfce7" : "#fee2e2",
              border: testResult?.success ? "1px solid #86efac" : "1px solid #fca5a5",
              fontSize: "11.5px",
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
            <span>{testing ? "Testing..." : testResult?.success ? "Cloud Connected" : "Local Offline Relay"}</span>
          </div>

          <LanguageSwitcher />

          <button
            type="button"
            className="primary-button"
            onClick={handleSave}
            disabled={testing}
            style={{ padding: "6px 14px", fontSize: "11.5px", fontWeight: 700 }}
          >
            {testing ? "Testing..." : "Save & Reconnect"}
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <div className="fullscreen-content-container">
        {/* Navigation Tabs */}
        <nav
          className="fullscreen-tabs"
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "20px",
            borderBottom: "1px solid #e2e8f0",
            paddingBottom: "8px",
            overflowX: "auto",
          }}
        >
          {[
            { id: "overview", label: "Architecture & Health", icon: "🏛️" },
            { id: "storage", label: "S3 Storage Buckets & Uploads", icon: "📦" },
            { id: "settings", label: "Credentials & Endpoints", icon: "🔑" },
            { id: "schema", label: "Database Schema & Tables", icon: "📑" },
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
                whiteSpace: "nowrap",
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
            {/* Supabase Organization Spotlight Card */}
            <div
              style={{
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                color: "#ffffff",
                padding: "24px",
                borderRadius: "18px",
                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.18)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "20px",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "20px" }}>🏛️</span>
                  <span
                    style={{
                      background: "rgba(56, 189, 248, 0.15)",
                      color: "#38bdf8",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontSize: "10.5px",
                      fontWeight: 800,
                      letterSpacing: "0.05em",
                    }}
                  >
                    OFFICIAL SUPABASE ORGANIZATION
                  </span>
                </div>
                <h2 style={{ margin: "0 0 6px", fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px" }}>
                  Org ID: <code style={{ color: "#34d399", fontFamily: "monospace" }}>{SUPABASE_ORG_ID}</code>
                </h2>
                <p style={{ margin: "0 0 16px", fontSize: "12.5px", color: "#94a3b8", lineHeight: 1.5 }}>
                  Configured Supabase project home hosting PostgreSQL tables, S3-compatible binary buckets, row-level security policies, and physician verification logs.
                </p>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <a
                    href={SUPABASE_ORG_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 16px",
                      borderRadius: "10px",
                      background: "#34d399",
                      color: "#064e3b",
                      fontSize: "12px",
                      fontWeight: 800,
                      textDecoration: "none",
                      boxShadow: "0 4px 14px rgba(52, 211, 153, 0.3)",
                    }}
                  >
                    <span>Open Supabase Org Dashboard ↗</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(SUPABASE_ORG_URL, "org_url")}
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      color: "#ffffff",
                      borderRadius: "10px",
                      padding: "8px 14px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {copiedKey === "org_url" ? "✓ Copied Link" : "📋 Copy Org Link"}
                  </button>
                </div>
              </div>

              {/* Admin Account Quick Info */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "14px",
                  padding: "18px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>
                    Root System Administrator
                  </span>
                  <span style={{ fontSize: "10px", background: "#059669", color: "#ffffff", padding: "2px 7px", borderRadius: "10px", fontWeight: 700 }}>
                    Active
                  </span>
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>Email:</div>
                  <strong style={{ fontSize: "13px", color: "#ffffff", wordBreak: "break-all" }}>{ADMIN_EMAIL}</strong>
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>Password:</div>
                  <code style={{ fontSize: "12px", color: "#34d399", background: "rgba(0,0,0,0.3)", padding: "2px 6px", borderRadius: "4px" }}>
                    {DEFAULT_ADMIN_PASSWORD}
                  </code>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(DEFAULT_ADMIN_PASSWORD, "admin_pass")}
                    style={{
                      flex: 1,
                      background: "rgba(255, 255, 255, 0.15)",
                      border: "none",
                      color: "#ffffff",
                      borderRadius: "8px",
                      padding: "6px 10px",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {copiedKey === "admin_pass" ? "✓ Copied" : "Copy Password"}
                  </button>
                  {onOpenAuth && (
                    <button
                      type="button"
                      onClick={onOpenAuth}
                      style={{
                        flex: 1,
                        background: "#38bdf8",
                        border: "none",
                        color: "#0c4a6e",
                        borderRadius: "8px",
                        padding: "6px 10px",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Login as Admin
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Live Connection Banner */}
            <div
              style={{
                padding: "18px 20px",
                borderRadius: "16px",
                background: testResult?.success ? "#f0fdf4" : "#fffbeb",
                border: testResult?.success ? "1.5px solid #86efac" : "1.5px solid #fde68a",
                boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h3
                    style={{
                      margin: "0 0 4px",
                      fontSize: "15px",
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
                        : "Offline-First Local Relay Active"}
                    </span>
                  </h3>
                  <p style={{ margin: 0, fontSize: "12px", color: testResult?.success ? "#15803d" : "#b45309" }}>
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
                    marginTop: "14px",
                    paddingTop: "12px",
                    borderTop: "1px solid rgba(0,0,0,0.06)",
                    fontSize: "12px",
                    flexWrap: "wrap",
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

            {/* 3 Architecture Pillars */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
              <div className="workstation-card">
                <div style={{ fontSize: "28px", marginBottom: "10px" }}>🗃️</div>
                <h4 style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: 800 }}>1. PostgreSQL Database</h4>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748b", lineHeight: 1.5 }}>
                  Stores patient screenings, vitals, triage records, and clinical evaluation notes. Secured with Row Level Security (RLS) so only authenticated workers and doctors can read and write data.
                </p>
              </div>

              <div className="workstation-card">
                <div style={{ fontSize: "28px", marginBottom: "10px" }}>📦</div>
                <h4 style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: 800 }}>2. S3 Storage Buckets</h4>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748b", lineHeight: 1.5 }}>
                  Stores clinical lesion photographs, digital prescription slips, patient EHR archives, and doctor NMC medical registration certificate proof documents with offline local data-URL fallback.
                </p>
              </div>

              <div className="workstation-card">
                <div style={{ fontSize: "28px", marginBottom: "10px" }}>🔄</div>
                <h4 style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: 800 }}>3. Zero-Downtime Offline Relay</h4>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748b", lineHeight: 1.5 }}>
                  In remote 2G or zero-connectivity tribal zones, Arogya Relay saves all records directly to browser IndexedDB storage. As soon as internet returns, the background sync engine pushes all queued items to Supabase.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: S3 STORAGE BUCKETS & UPLOADS */}
        {activeTab === "storage" && (
          <div style={{ display: "grid", gap: "20px" }}>
            {/* Storage Header Card */}
            <div
              style={{
                background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                border: "1px solid #93c5fd",
                padding: "20px",
                borderRadius: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "14px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "20px" }}>📦</span>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#1e3a8a" }}>
                    S3 Bucket File & Binary Data Vault
                  </h3>
                </div>
                <p style={{ margin: 0, fontSize: "12px", color: "#2563eb", maxWidth: "680px" }}>
                  S3-compatible object storage powered by Supabase. Stores lesion photographs, doctor NMC proof documents, prescriptions, and health records with automatic offline fallback.
                </p>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <code
                  style={{
                    background: "#ffffff",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid #bfdbfe",
                    fontSize: "11px",
                    fontFamily: "monospace",
                    color: "#1e40af",
                  }}
                >
                  Endpoint: {S3_STORAGE_ENDPOINT}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(S3_STORAGE_ENDPOINT, "s3_endpoint")}
                  style={{
                    background: "#1e40af",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "6px 12px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {copiedKey === "s3_endpoint" ? "✓ Copied" : "Copy Endpoint"}
                </button>
              </div>
            </div>

            {/* 4 Bucket Selector Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
              {BUCKET_DEFINITIONS.map((b) => {
                const isSelected = selectedBucket === b.id;
                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBucket(b.id)}
                    style={{
                      background: "#ffffff",
                      borderRadius: "14px",
                      border: isSelected ? "2px solid var(--sc-accent, #17644f)" : "1px solid #e2e8f0",
                      padding: "16px",
                      cursor: "pointer",
                      boxShadow: isSelected ? "0 4px 16px rgba(23, 100, 79, 0.12)" : "0 2px 6px rgba(0,0,0,0.02)",
                      transition: "all 0.15s ease",
                      position: "relative",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "20px" }}>{b.icon}</span>
                        <strong style={{ fontSize: "14px", color: isSelected ? "var(--sc-accent, #17644f)" : "#0f172a" }}>
                          {b.name}
                        </strong>
                      </div>
                      <span
                        style={{
                          fontSize: "9.5px",
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: "10px",
                          background: b.badgeColor.bg,
                          color: b.badgeColor.text,
                        }}
                      >
                        {b.badge}
                      </span>
                    </div>
                    <p style={{ fontSize: "11.5px", color: "#64748b", margin: "0 0 10px", lineHeight: 1.45 }}>
                      {b.desc}
                    </p>
                    <div style={{ fontSize: "10px", color: "#475569", background: "#f8fafc", padding: "6px 8px", borderRadius: "6px" }}>
                      <strong>Retention:</strong> {b.retention}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Interactive S3 File Uploader & File Browser */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "20px",
                alignItems: "start",
              }}
            >
              {/* Left Column: Upload to Selected Bucket */}
              <div className="workstation-card" style={{ margin: 0 }}>
                <div className="workstation-card-title">
                  <span>📤 Upload File to [{selectedBucket}]</span>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>Supports Images, PDFs & Scans</span>
                </div>

                <div style={{ display: "grid", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, marginBottom: "6px" }}>
                      Target Bucket:
                    </label>
                    <select
                      value={selectedBucket}
                      onChange={(e) => setSelectedBucket(e.target.value as StorageBucket)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "12.5px",
                        background: "#f8fafc",
                        fontWeight: 600,
                      }}
                    >
                      {BUCKET_DEFINITIONS.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.icon} {b.name} ({b.badge})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, marginBottom: "6px" }}>
                      Select File to Store:
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "8px",
                        border: "1px dashed #94a3b8",
                        background: "#f8fafc",
                        fontSize: "12px",
                      }}
                    />
                  </div>

                  {selectedFile && (
                    <div style={{ background: "#f1f5f9", padding: "10px 14px", borderRadius: "8px", fontSize: "11.5px" }}>
                      <div>File: <strong>{selectedFile.name}</strong></div>
                      <div style={{ color: "#64748b" }}>
                        Size: {(selectedFile.size / 1024).toFixed(1)} KB · Type: {selectedFile.type || "unknown"}
                      </div>
                    </div>
                  )}

                  {uploadFeedback && (
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: "8px",
                        background: uploadFeedback.includes("error") ? "#fef2f2" : "#ecfdf5",
                        color: uploadFeedback.includes("error") ? "#991b1b" : "#065f46",
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                    >
                      {uploadFeedback}
                    </div>
                  )}

                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleFileUpload}
                    disabled={!selectedFile || uploading}
                    style={{ padding: "10px 16px", fontSize: "12px", fontWeight: 700 }}
                  >
                    {uploading ? "Uploading to S3..." : `🚀 Upload to ${selectedBucket}`}
                  </button>
                </div>
              </div>

              {/* Right Column: Files Stored in Selected Bucket */}
              <div className="workstation-card" style={{ margin: 0 }}>
                <div className="workstation-card-title">
                  <span>📂 Files in Bucket [{selectedBucket}] ({bucketFiles.length})</span>
                  <button
                    type="button"
                    onClick={() => fetchBucketFiles(selectedBucket)}
                    style={{ background: "none", border: "none", color: "#0284c7", fontSize: "11px", cursor: "pointer", fontWeight: 700 }}
                  >
                    🔄 Refresh List
                  </button>
                </div>

                {loadingFiles ? (
                  <div style={{ padding: "30px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
                    Loading bucket inventory...
                  </div>
                ) : bucketFiles.length === 0 ? (
                  <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8", fontSize: "12px" }}>
                    No files found in <code>{selectedBucket}</code> yet. Use the upload tool to store your first clinical asset!
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: "10px", maxHeight: "400px", overflowY: "auto" }}>
                    {bucketFiles.map((f, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 12px",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          background: "#ffffff",
                          gap: "10px",
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "#0f172a",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {f.name}
                          </div>
                          <div style={{ fontSize: "10px", color: "#64748b", display: "flex", gap: "8px", marginTop: "2px" }}>
                            <span>{f.size ? `${(f.size / 1024).toFixed(1)} KB` : "Stored"}</span>
                            <span>·</span>
                            <span
                              style={{
                                color: f.source === "supabase_storage" ? "#16a34a" : "#ca8a04",
                                fontWeight: 700,
                              }}
                            >
                              {f.source === "supabase_storage" ? "Cloud S3" : "Offline Cache"}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "6px" }}>
                          {f.url && (
                            <a
                              href={f.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: "4px 8px",
                                borderRadius: "6px",
                                background: "#f1f5f9",
                                color: "#0f172a",
                                fontSize: "10.5px",
                                textDecoration: "none",
                                fontWeight: 600,
                              }}
                            >
                              View ↗
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(f.name)}
                            style={{
                              padding: "4px 8px",
                              borderRadius: "6px",
                              background: "#fee2e2",
                              color: "#dc2626",
                              border: "none",
                              fontSize: "10.5px",
                              cursor: "pointer",
                              fontWeight: 700,
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CREDENTIALS & SETTINGS */}
        {activeTab === "settings" && (
          <div className="workstation-card" style={{ maxWidth: "800px", margin: "0 auto" }}>
            <div className="workstation-card-title">
              <span>🔑 Supabase Cloud Credentials</span>
              <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>
                {currentConfig.source === "user_custom" ? "Custom Config (Browser Storage)" : "Default System Config"}
              </span>
            </div>

            <div style={{ display: "grid", gap: "18px" }}>
              {/* Organization Quick Link Card */}
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  padding: "14px 16px",
                  borderRadius: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#166534" }}>
                    Supabase Organization ID: <code>{SUPABASE_ORG_ID}</code>
                  </div>
                  <div style={{ fontSize: "11px", color: "#15803d", marginTop: "2px" }}>
                    Dashboard: <a href={SUPABASE_ORG_URL} target="_blank" rel="noopener noreferrer" style={{ color: "#15803d", textDecoration: "underline" }}>{SUPABASE_ORG_URL}</a>
                  </div>
                </div>
                <a
                  href={SUPABASE_ORG_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="primary-button"
                  style={{
                    padding: "6px 12px",
                    fontSize: "11px",
                    fontWeight: 700,
                    textDecoration: "none",
                    background: "#166534",
                  }}
                >
                  Open Dashboard ↗
                </a>
              </div>

              {/* Admin Credentials Quick View */}
              <div
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  padding: "14px 16px",
                  borderRadius: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#1e40af" }}>
                    Admin Account: <code>{ADMIN_EMAIL}</code>
                  </div>
                  <div style={{ fontSize: "11px", color: "#2563eb", marginTop: "2px" }}>
                    Default Password: <code>{DEFAULT_ADMIN_PASSWORD}</code> (Accepts Pratyush@3130)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(DEFAULT_ADMIN_PASSWORD, "admin_pwd_setting")}
                  style={{
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {copiedKey === "admin_pwd_setting" ? "✓ Copied" : "Copy Password"}
                </button>
              </div>

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

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "14px", borderTop: "1px solid #f1f5f9", flexWrap: "wrap", gap: "10px" }}>
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
