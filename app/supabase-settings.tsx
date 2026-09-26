"use client";

import { useState } from "react";
import { getActiveSupabaseConfig, setCustomSupabaseConfig, clearCustomSupabaseConfig } from "@/lib/supabase/client";

interface SupabaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupabaseSettingsModal({ isOpen, onClose }: SupabaseSettingsModalProps) {
  const currentConfig = getActiveSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.key);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  async function handleTestConnection() {
    if (!url.trim() || !anonKey.trim()) {
      setTestResult({ success: false, message: "Please provide both Supabase Project URL and API Key." });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const cleanUrl = url.trim().replace(/\/$/, "");
      const res = await fetch(`${cleanUrl}/rest/v1/screenings?select=count`, {
        method: "GET",
        headers: {
          apikey: anonKey.trim(),
          Authorization: `Bearer ${anonKey.trim()}`,
        },
      });

      if (res.ok) {
        setTestResult({
          success: true,
          message: "✓ Successfully connected to Supabase database! Tables are accessible.",
        });
      } else if (res.status === 404) {
        setTestResult({
          success: false,
          message: "Connected to Supabase endpoint, but 'screenings' table is missing. Run the migration script in Supabase SQL editor.",
        });
      } else {
        setTestResult({
          success: false,
          message: `Supabase returned HTTP ${res.status}: ${res.statusText}`,
        });
      }
    } catch (e) {
      setTestResult({
        success: false,
        message: `Connection failed: ${e instanceof Error ? e.message : "Network error or paused project"}. All data is currently saved safely offline.`,
      });
    } finally {
      setTesting(false);
    }
  }

  function handleSave() {
    setCustomSupabaseConfig(url, anonKey);
    handleTestConnection();
  }

  function handleResetDefault() {
    clearCustomSupabaseConfig();
    const def = getActiveSupabaseConfig();
    setUrl(def.url);
    setAnonKey(def.key);
    setTestResult(null);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "520px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>⚡</span>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>Supabase Backend Connection</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "18px" }}
          >
            ✕
          </button>
        </div>

        <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)", lineHeight: "1.4" }}>
          Configure your Supabase PostgreSQL credentials. Even if Supabase is offline or paused, the app operates 100% locally
          in IndexedDB/LocalStorage and syncs automatically once reconnected.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
            Project URL:
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid var(--line)",
                background: "var(--surface-muted)",
                fontSize: "13px",
              }}
            />
          </label>

          <label style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
            Anon / Publishable API Key:
            <input
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="sb_publishable_... or eyJhbGciOi..."
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid var(--line)",
                background: "var(--surface-muted)",
                fontSize: "13px",
              }}
            />
          </label>
        </div>

        {testResult && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              background: testResult.success ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
              border: testResult.success ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
              color: testResult.success ? "#059669" : "#dc2626",
              fontSize: "12px",
              lineHeight: "1.4",
            }}
          >
            {testResult.message}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px" }}>
          <button
            type="button"
            onClick={handleResetDefault}
            style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "12px", cursor: "pointer", textDecoration: "underline" }}
          >
            Reset Defaults
          </button>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="secondary-button"
              style={{ fontSize: "12px" }}
            >
              {testing ? "Testing..." : "Test Connection"}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="primary-button"
              style={{ fontSize: "12px" }}
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
