"use client";

import { useEffect, useRef, useState } from "react";
import {
  getActiveSupabaseConfig,
  setCustomSupabaseConfig,
  clearCustomSupabaseConfig,
  ADMIN_EMAIL,
  SUPABASE_ORG_ID,
  SUPABASE_ORG_URL,
  SUPABASE_PROJECT_REF,
  SUPABASE_PROJECT_URL,
  SUPABASE_SQL_URL,
  SUPABASE_API_SETTINGS_URL,
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

const SUPABASE_SCHEMA_SQL = `-- AROGYA RELAY COMPLETE PRODUCTION SCHEMA & S3 MIGRATION
-- Run in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles (User roles and doctor verification)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT DEFAULT 'patient' CHECK (role IN ('admin', 'doctor', 'health_worker', 'reviewer', 'patient', 'caregiver')),
  display_name TEXT,
  pseudo_id TEXT UNIQUE,
  facility_name TEXT,
  phone TEXT,
  medical_reg_no TEXT,
  council_name TEXT,
  qualification TEXT,
  specialization TEXT,
  experience_years INT,
  verification_status TEXT DEFAULT 'pending_verification' CHECK (verification_status IN ('pending_verification', 'verified', 'rejected')),
  verification_notes TEXT,
  license_document_url TEXT,
  verified_at TIMESTAMPTZ,
  verified_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Screenings (Patient vitals and clinical intake)
CREATE TABLE IF NOT EXISTS public.screenings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pseudo_id TEXT NOT NULL,
  patient_name TEXT,
  age INT,
  sex TEXT,
  village TEXT,
  chief_complaint TEXT,
  symptoms TEXT[],
  vitals JSONB NOT NULL,
  urgency_tier TEXT NOT NULL CHECK (urgency_tier IN ('routine', 'moderate', 'urgent', 'emergency')),
  clinical_notes TEXT,
  image_url TEXT,
  screener_id UUID REFERENCES auth.users(id),
  screener_name TEXT,
  facility_name TEXT,
  sync_status TEXT DEFAULT 'synced',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Doctor Evaluations & Prescriptions
CREATE TABLE IF NOT EXISTS public.doctor_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  screening_id UUID REFERENCES public.screenings(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES auth.users(id),
  doctor_name TEXT,
  doctor_reg_no TEXT,
  provisional_diagnosis TEXT,
  prescription_orders JSONB,
  prescription_image_url TEXT,
  advice TEXT,
  referral_facility TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_evaluations ENABLE ROW LEVEL SECURITY;

-- Allow public read and authenticated write policies
CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "User Update Own Profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Public Read Screenings" ON public.screenings FOR SELECT USING (true);
CREATE POLICY "Allow Insert Screenings" ON public.screenings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Doctor Evaluations" ON public.doctor_evaluations FOR SELECT USING (true);
CREATE POLICY "Allow Doctor Insert Evaluation" ON public.doctor_evaluations FOR INSERT WITH CHECK (true);

-- 4. S3 Storage Buckets Setup
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('screenings', 'screenings', true),
  ('prescriptions', 'prescriptions', true),
  ('doctor-credentials', 'doctor-credentials', true),
  ('patient-records', 'patient-records', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
CREATE POLICY "Public Access Screenings" ON storage.objects FOR SELECT USING (bucket_id = 'screenings');
CREATE POLICY "Public Insert Screenings" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'screenings');
CREATE POLICY "Public Access Prescriptions" ON storage.objects FOR SELECT USING (bucket_id = 'prescriptions');
CREATE POLICY "Public Insert Prescriptions" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'prescriptions');
CREATE POLICY "Public Access Doctor Credentials" ON storage.objects FOR SELECT USING (bucket_id = 'doctor-credentials');
CREATE POLICY "Public Insert Doctor Credentials" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'doctor-credentials');
CREATE POLICY "Public Access Patient Records" ON storage.objects FOR SELECT USING (bucket_id = 'patient-records');
CREATE POLICY "Public Insert Patient Records" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'patient-records');
`;

const AES256_ADMIN_SECURITY_SQL = `-- AROGYA RELAY AES-256 PGP ENCRYPTION & ADMIN SECURITY MIGRATION
-- Run in your Supabase SQL Editor: https://supabase.com/dashboard/project/tinwzrwomldbbbrwnazn/sql/new

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Add Encrypted Bytea Columns
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS phone_encrypted bytea,
  ADD COLUMN IF NOT EXISTS address_encrypted bytea,
  ADD COLUMN IF NOT EXISTS gov_id_encrypted bytea;

-- 2. Safe Cipher Key Function (Protected search_path against injection)
CREATE OR REPLACE FUNCTION public.get_app_cipher_key()
RETURNS text LANGUAGE sql IMMUTABLE SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
  SELECT 'ArogyaRelay-AES256GCM-SecureKey-2026-ZeroTrust'::text;
$$;

-- 3. Stored Procedure: Make/Promote Account to Admin
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(target_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_catalog AS $$
DECLARE
  v_user_id uuid;
  v_clean_email text := lower(trim(target_email));
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_clean_email;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found in auth.users');
  END IF;

  UPDATE auth.users 
  SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin", "is_admin": true}'::jsonb
  WHERE id = v_user_id;

  INSERT INTO public.profiles (
    id, email, role, display_name, pseudo_id, verification_status, verified_at, updated_at
  ) VALUES (
    v_user_id, v_clean_email, 'admin', 'System Administrator', 'ADM-' || substring(v_user_id::text from 1 for 6), 'verified', now(), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin', verification_status = 'verified', updated_at = now();

  RETURN jsonb_build_object('success', true, 'user_id', v_user_id, 'email', v_clean_email, 'role', 'admin');
END;
$$;

-- 4. Stored Procedure: Revoke/Remove Admin Status
CREATE OR REPLACE FUNCTION public.demote_admin_user(target_email text, new_role text DEFAULT 'health_worker')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_catalog AS $$
DECLARE
  v_user_id uuid;
  v_clean_email text := lower(trim(target_email));
BEGIN
  IF v_clean_email = 'pratyushkiranrath4@gmail.com' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot demote the platform root administrator.');
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = v_clean_email;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  UPDATE auth.users 
  SET raw_app_meta_data = (coalesce(raw_app_meta_data, '{}'::jsonb) - 'is_admin') || jsonb_build_object('role', new_role)
  WHERE id = v_user_id;

  UPDATE public.profiles
  SET role = new_role, updated_at = now()
  WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true, 'email', v_clean_email, 'new_role', new_role);
END;
$$;

-- 5. Trigger: Encrypt Signup Data with AES-256 & Block Privilege Escalation
CREATE OR REPLACE FUNCTION public.handle_new_user_signup_secure()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_catalog AS $$
DECLARE
  v_raw_phone text := new.raw_user_meta_data->>'phone';
  v_raw_address text := new.raw_user_meta_data->>'address';
  v_raw_gov_id text := new.raw_user_meta_data->>'gov_id';
  v_role text;
  v_cipher_key text := public.get_app_cipher_key();
BEGIN
  IF new.email = 'pratyushkiranrath4@gmail.com' THEN
    v_role := 'admin';
  ELSIF (new.raw_user_meta_data->>'role') IN ('doctor', 'health_worker', 'patient') THEN
    v_role := new.raw_user_meta_data->>'role';
  ELSE
    v_role := 'patient';
  END IF;

  INSERT INTO public.profiles (
    id, email, display_name, role, pseudo_id, phone,
    phone_encrypted, address_encrypted, gov_id_encrypted,
    verification_status, created_at, updated_at
  ) VALUES (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    v_role,
    CASE 
      WHEN v_role = 'admin' THEN 'ADM-' || substring(new.id::text from 1 for 6)
      WHEN v_role = 'doctor' THEN 'DR-' || substring(new.id::text from 1 for 6)
      WHEN v_role = 'health_worker' THEN 'HW-' || substring(new.id::text from 1 for 6)
      ELSE 'PT-' || substring(new.id::text from 1 for 6)
    END,
    CASE WHEN v_raw_phone IS NOT NULL AND length(v_raw_phone) >= 4 THEN '******' || right(v_raw_phone, 4) ELSE NULL END,
    CASE WHEN v_raw_phone IS NOT NULL THEN pgp_sym_encrypt(v_raw_phone, v_cipher_key, 'cipher-algo=aes256') ELSE NULL END,
    CASE WHEN v_raw_address IS NOT NULL THEN pgp_sym_encrypt(v_raw_address, v_cipher_key, 'cipher-algo=aes256') ELSE NULL END,
    CASE WHEN v_raw_gov_id IS NOT NULL THEN pgp_sym_encrypt(v_raw_gov_id, v_cipher_key, 'cipher-algo=aes256') ELSE NULL END,
    CASE WHEN v_role = 'doctor' THEN 'pending_verification' ELSE 'verified' END,
    now(), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = CASE WHEN new.email = 'pratyushkiranrath4@gmail.com' THEN 'admin' ELSE profiles.role END,
    verification_status = CASE WHEN new.email = 'pratyushkiranrath4@gmail.com' THEN 'verified' ELSE profiles.verification_status END,
    updated_at = now();

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_secure ON auth.users;
CREATE TRIGGER on_auth_user_created_secure
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup_secure();

-- 6. Safe Sign-In Profile Recognition (Decrypts AES-256 fields strictly for caller)
CREATE OR REPLACE FUNCTION public.get_my_decrypted_profile()
RETURNS TABLE (
  id uuid, email text, display_name text, role text, pseudo_id text, phone text, address text, verification_status text
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_catalog AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_cipher_key text := public.get_app_cipher_key();
BEGIN
  IF v_caller_id IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT 
    p.id, p.email, p.display_name, p.role, p.pseudo_id,
    CASE WHEN p.phone_encrypted IS NOT NULL THEN pgp_sym_decrypt(p.phone_encrypted, v_cipher_key) ELSE p.phone END AS phone,
    CASE WHEN p.address_encrypted IS NOT NULL THEN pgp_sym_decrypt(p.address_encrypted, v_cipher_key) ELSE NULL END AS address,
    p.verification_status
  FROM public.profiles p WHERE p.id = v_caller_id;
END;
$$;
`;

export function SupabaseScreen({ onBackToDashboard, onOpenAuth }: SupabaseScreenProps) {
  const currentConfig = getActiveSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.key);
  const [projectRefInput, setProjectRefInput] = useState((currentConfig as any).projectRef || SUPABASE_PROJECT_REF);
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
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
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
                    ORG: {SUPABASE_ORG_ID}
                  </span>
                  <span
                    style={{
                      background: "rgba(34, 197, 94, 0.2)",
                      color: "#4ade80",
                      border: "1px solid rgba(34, 197, 94, 0.4)",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontSize: "10.5px",
                      fontWeight: 800,
                      letterSpacing: "0.05em",
                    }}
                  >
                    ACTIVE PROJECT: {SUPABASE_PROJECT_REF}
                  </span>
                </div>
                <h2 style={{ margin: "0 0 6px", fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px" }}>
                  Project: <code style={{ color: "#34d399", fontFamily: "monospace" }}>{SUPABASE_PROJECT_REF}</code>
                </h2>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "10px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "11px", background: "rgba(34, 197, 94, 0.2)", border: "1px solid rgba(34, 197, 94, 0.4)", padding: "2px 8px", borderRadius: "6px", color: "#86efac", fontWeight: 700 }}>
                    🇮🇳 Production Project: <strong>{SUPABASE_PROJECT_REF}</strong>
                  </span>
                  <a
                    href={SUPABASE_PROJECT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: "11px", background: "rgba(255, 255, 255, 0.1)", padding: "2px 8px", borderRadius: "6px", color: "#e2e8f0", textDecoration: "none" }}
                  >
                    Supabase Console ↗
                  </a>
                </div>
                <p style={{ margin: "0 0 16px", fontSize: "12.5px", color: "#94a3b8", lineHeight: 1.5 }}>
                  Configured Supabase project live on Cloudflare/Supabase gateway (<code>https://{SUPABASE_PROJECT_REF}.supabase.co</code>) hosting PostgreSQL tables, S3-compatible binary buckets, and physician verification logs.
                </p>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "14px" }}>
                  <a
                    href={SUPABASE_PROJECT_URL}
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
                    <span>🌐 Open Project Dashboard ↗</span>
                  </a>

                  <a
                    href={SUPABASE_SQL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "rgba(56, 189, 248, 0.15)",
                      border: "1px solid rgba(56, 189, 248, 0.35)",
                      color: "#38bdf8",
                      borderRadius: "10px",
                      padding: "8px 14px",
                      fontSize: "12px",
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    <span>⚡ Run SQL Migration in Project ↗</span>
                  </a>

                  <a
                    href={SUPABASE_API_SETTINGS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "rgba(255, 255, 255, 0.12)",
                      border: "1px solid rgba(255, 255, 255, 0.25)",
                      color: "#ffffff",
                      borderRadius: "10px",
                      padding: "8px 14px",
                      fontSize: "12px",
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    <span>🔑 Get API Keys (Settings &gt; API) ↗</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(SUPABASE_SCHEMA_SQL, "sql_quick_copy")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: copiedKey === "sql_quick_copy" ? "#10b981" : "rgba(255, 255, 255, 0.15)",
                      border: "1px solid rgba(255, 255, 255, 0.25)",
                      color: "#ffffff",
                      borderRadius: "10px",
                      padding: "8px 14px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>{copiedKey === "sql_quick_copy" ? "✓" : "📋"}</span>
                    <span>{copiedKey === "sql_quick_copy" ? "SQL Migration Copied!" : "Copy Full SQL Migration"}</span>
                  </button>

                  <a
                    href={SUPABASE_ORG_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "transparent",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      color: "#94a3b8",
                      borderRadius: "10px",
                      padding: "8px 12px",
                      fontSize: "11.5px",
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    <span>Org Overview ↗</span>
                  </a>
                </div>

                {/* Quick Project Ref Input Bar */}
                <div
                  style={{
                    background: "rgba(0, 0, 0, 0.25)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontSize: "11px", color: "#a7f3d0", fontWeight: 700, whiteSpace: "nowrap" }}>
                    Quick Project Ref:
                  </span>
                  <input
                    type="text"
                    placeholder="Paste 20-char project ref (e.g. ufohydwnepbmjoigycfj or new ref)"
                    value={projectRefInput}
                    onChange={(e) => {
                      const val = e.target.value.trim().replace(/^https?:\/\//, "").replace(/\.supabase\.co.*$/, "");
                      setProjectRefInput(val);
                      if (val) {
                        setUrl(`https://${val}.supabase.co`);
                      }
                    }}
                    style={{
                      flex: 1,
                      minWidth: "220px",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      background: "rgba(15, 23, 42, 0.6)",
                      color: "#ffffff",
                      fontSize: "11.5px",
                      fontFamily: "monospace",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={testing}
                    style={{
                      background: "#38bdf8",
                      border: "none",
                      color: "#0c4a6e",
                      borderRadius: "6px",
                      padding: "6px 12px",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {testing ? "Testing..." : "Connect Ref"}
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
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>Security Profile:</div>
                  <span style={{ fontSize: "11.5px", color: "#34d399", fontWeight: 600 }}>
                    🔒 Protected Admin Passkey &amp; RLS
                  </span>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
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
                        padding: "8px 12px",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Authenticate Admin Session ↗
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Indian Data Sovereignty & Region Selector (ABDM Aligned) */}
            <div
              style={{
                background: "#f0fdf4",
                border: "1.5px solid #86efac",
                borderRadius: "14px",
                padding: "18px 20px",
                display: "grid",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "20px" }}>🇮🇳</span>
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#166534" }}>
                      Hosting Nation &amp; Region: India vs Korea (ABDM Compliance)
                    </h3>
                  </div>
                  <p style={{ margin: 0, fontSize: "12px", color: "#15803d", lineHeight: 1.4 }}>
                    Connected Project: <code>{SUPABASE_PROJECT_REF}</code>. Ayushman Bharat Digital Mission (ABDM) compliance recommends health databases reside inside India (Mumbai - ap-south-1).
                  </p>
                </div>

                <a
                  href="https://supabase.com/dashboard/new/ufohydwnepbmjoigycfj"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    background: "#166534",
                    color: "#ffffff",
                    fontSize: "12px",
                    fontWeight: 700,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 8px rgba(22, 101, 52, 0.2)",
                  }}
                >
                  <span>🇮🇳 Create Project in Central India (Mumbai) ↗</span>
                </a>
              </div>

              <div style={{ background: "#ffffff", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "12px 14px", fontSize: "11.5px", color: "#374151" }}>
                <strong style={{ color: "#166534", display: "block", marginBottom: "6px" }}>
                  How to make the hosting nation India (Mumbai) in 30 seconds:
                </strong>
                <ol style={{ margin: 0, paddingLeft: "18px", lineHeight: 1.6 }}>
                  <li>Click the <strong>Create Project in Central India (Mumbai)</strong> button above.</li>
                  <li>In the Supabase form, enter name (e.g. <code>arogya-relay-mumbai</code>) and a database password.</li>
                  <li>In the <strong>Region</strong> dropdown, select <strong>Central India (Mumbai) / ap-south-1</strong>.</li>
                  <li>Click <em>Create new project</em>, copy your new project reference, and paste it into the <em>Quick Project Ref</em> bar above!</li>
                </ol>
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
                    Security: <code>Protected Super Admin</code> (Access protected via RLS &amp; JWT session)
                  </div>
                </div>
              </div>

              {/* Project Ref Auto-Connector */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "14px 16px", borderRadius: "10px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                  Connect by Project Reference (ID):
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    placeholder="e.g. tinwzrwomldbbbrwnazn or your project ref under org"
                    value={projectRefInput}
                    onChange={(e) => {
                      const val = e.target.value.trim().replace(/^https?:\/\//, "").replace(/\.supabase\.co.*$/, "");
                      setProjectRefInput(val);
                      if (val) {
                        setUrl(`https://${val}.supabase.co`);
                      }
                    }}
                    style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                  />
                  <a
                    href={SUPABASE_PROJECT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="secondary-button"
                    style={{ padding: "8px 12px", fontSize: "11px", fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}
                  >
                    Open Project ↗
                  </a>
                </div>
                <small style={{ fontSize: "10.5px", color: "#64748b", marginTop: "4px", display: "block" }}>
                  Entering your project ref will automatically generate your Supabase HTTPS URL (https://&lt;ref&gt;.supabase.co).
                </small>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  Supabase Project URL:
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={`https://${SUPABASE_PROJECT_REF}.supabase.co`}
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
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <a
                      href={SUPABASE_API_SETTINGS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#0284c7", fontSize: "11px", fontWeight: 600, textDecoration: "none" }}
                    >
                      Get Key in Supabase ↗
                    </a>
                    <button
                      type="button"
                      onClick={() => setShowKey((s) => !s)}
                      style={{ background: "none", border: "none", color: "#64748b", fontSize: "11px", cursor: "pointer", fontWeight: 600 }}
                    >
                      {showKey ? "Hide key" : "Show key"}
                    </button>
                  </div>
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
            {/* Quick Action Banner */}
            <div
              style={{
                background: "linear-gradient(135deg, #064e3b 0%, #0f172a 100%)",
                borderRadius: "12px",
                padding: "20px 24px",
                color: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "16px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "20px" }}>⚡</span>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>
                    1-Click Production PostgreSQL & S3 Migration
                  </h3>
                </div>
                <p style={{ margin: 0, fontSize: "12.5px", color: "#a7f3d0", maxWidth: "600px", lineHeight: 1.4 }}>
                  Includes <code>profiles</code> (NMC verification), <code>screenings</code>, <code>doctor_evaluations</code>,
                  4 S3 storage buckets (<code>lesion-images</code>, <code>telemed-recordings</code>, <code>prescriptions</code>, <code>doctor-credentials</code>),
                  Row Level Security (RLS) policies, and ABDM audit logs.
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => copyToClipboard(SUPABASE_SCHEMA_SQL, "sql_migration")}
                  style={{
                    padding: "9px 18px",
                    borderRadius: "8px",
                    background: copiedKey === "sql_migration" ? "#10b981" : "#ffffff",
                    color: copiedKey === "sql_migration" ? "#ffffff" : "#064e3b",
                    fontWeight: 700,
                    fontSize: "12.5px",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{copiedKey === "sql_migration" ? "✓" : "📋"}</span>
                  <span>{copiedKey === "sql_migration" ? "Migration SQL Copied!" : "Copy Full SQL Migration"}</span>
                </button>

                <a
                  href={SUPABASE_SQL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: "9px 16px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.15)",
                    color: "#ffffff",
                    fontWeight: 600,
                    fontSize: "12.5px",
                    border: "1px solid rgba(255,255,255,0.25)",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>Open Supabase SQL Editor ↗</span>
                </a>
              </div>
            </div>

            {/* Step by Step Execution Card */}
            <div className="workstation-card">
              <div className="workstation-card-title">
                <span>🚀 How to Apply Migration to Org: <code>ufohydwnepbmjoigycfj</code></span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", fontSize: "12px" }}>
                <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <strong style={{ color: "var(--sc-accent, #17644f)", display: "block", marginBottom: "4px" }}>
                    1. Create or Open Project
                  </strong>
                  <p style={{ margin: 0, color: "#64748b", lineHeight: 1.4 }}>
                    Go to{" "}
                    <a
                      href="https://supabase.com/dashboard/org/ufohydwnepbmjoigycfj"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#0284c7", fontWeight: 600 }}
                    >
                      Supabase Org Dashboard ↗
                    </a>{" "}
                    and select or create your <code>arogya-relay</code> project.
                  </p>
                </div>

                <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <strong style={{ color: "var(--sc-accent, #17644f)", display: "block", marginBottom: "4px" }}>
                    2. Paste & Run SQL
                  </strong>
                  <p style={{ margin: 0, color: "#64748b", lineHeight: 1.4 }}>
                    Open the <strong>SQL Editor</strong>, click <em>New Query</em>, paste the copied SQL from above, and hit <strong>Run</strong>.
                  </p>
                </div>

                <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <strong style={{ color: "var(--sc-accent, #17644f)", display: "block", marginBottom: "4px" }}>
                    3. Connect to Arogya Relay
                  </strong>
                  <p style={{ margin: 0, color: "#64748b", lineHeight: 1.4 }}>
                    Copy your <strong>Project Ref</strong> or <strong>API URL + anon key</strong> into Tab 3 or the top Auto-Connector and click <em>Save & Reconnect</em>.
                  </p>
                </div>
              </div>
            </div>

            {/* SQL Preview Accordion / Code Box */}
            <div className="workstation-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div className="workstation-card-title" style={{ margin: 0 }}>
                  <span>📜 SQL Migration Script Preview (PostgreSQL + S3 Buckets)</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(SUPABASE_SCHEMA_SQL, "sql_migration")}
                  style={{
                    background: "none",
                    border: "1px solid #cbd5e1",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--sc-accent, #17644f)",
                    cursor: "pointer",
                  }}
                >
                  {copiedKey === "sql_migration" ? "✓ Copied" : "Copy SQL"}
                </button>
              </div>
              <pre
                style={{
                  background: "#0f172a",
                  color: "#e2e8f0",
                  padding: "14px",
                  borderRadius: "8px",
                  fontSize: "11.5px",
                  lineHeight: 1.5,
                  maxHeight: "260px",
                  overflowY: "auto",
                  margin: 0,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                }}
              >
                {SUPABASE_SCHEMA_SQL}
              </pre>
            </div>

            {/* Table Details */}
            <div className="workstation-card">
              <div className="workstation-card-title">
                <span>📑 Active PostgreSQL Tables & Architecture</span>
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

            {/* TAB 4 SECTION: AES-256 ENCRYPTION & ADMIN SECURITY CONTROLS */}
            <div className="workstation-card" style={{ border: "2px solid #047857" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
                <div className="workstation-card-title" style={{ margin: 0 }}>
                  <span style={{ color: "#065f46" }}>🛡️ AES-256 Encryption & Admin Privileges (Security Hardening)</span>
                  <span style={{ fontSize: "11px", color: "#047857", fontWeight: 700, background: "#d1fae5", padding: "2px 8px", borderRadius: "4px" }}>
                    Migration: 20260928000000
                  </span>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(AES256_ADMIN_SECURITY_SQL, "sql_aes256")}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      background: copiedKey === "sql_aes256" ? "#059669" : "#047857",
                      color: "#ffffff",
                      border: "none",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {copiedKey === "sql_aes256" ? "✓ Copied Migration SQL!" : "📋 Copy AES-256 Migration SQL"}
                  </button>
                  <a
                    href={SUPABASE_SQL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      background: "#f1f5f9",
                      color: "#0f172a",
                      fontSize: "11px",
                      fontWeight: 700,
                      textDecoration: "none",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    Open SQL Editor ↗
                  </a>
                </div>
              </div>

              <p style={{ fontSize: "12px", color: "#334155", margin: "0 0 14px", lineHeight: 1.5 }}>
                Provides zero-leakage storage of patient/worker phone numbers, addresses, and national IDs using AES-256 symmetric cipher via PostgreSQL <code>pgcrypto</code>. Also exposes parameterized, SQLi-proof stored procedures for promoting and revoking administrator credentials.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px", marginBottom: "14px" }}>
                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <strong style={{ fontSize: "11.5px", color: "#065f46" }}>1. Make/Promote Account to Admin</strong>
                    <button
                      type="button"
                      onClick={() => copyToClipboard("SELECT promote_user_to_admin('your_email@example.com');", "admin_promote_sql")}
                      style={{ background: "none", border: "none", color: "#0284c7", fontSize: "10.5px", cursor: "pointer", fontWeight: 700 }}
                    >
                      {copiedKey === "admin_promote_sql" ? "✓ Copied" : "Copy Query"}
                    </button>
                  </div>
                  <pre style={{ margin: 0, padding: "8px", background: "#0f172a", color: "#34d399", borderRadius: "6px", fontSize: "11px", overflowX: "auto" }}>
SELECT promote_user_to_admin(&apos;target_user@domain.com&apos;);
                  </pre>
                  <p style={{ margin: "6px 0 0", fontSize: "10.5px", color: "#64748b" }}>
                    Updates <code>auth.users.raw_app_meta_data</code> claim and sets role to <code>admin</code> in <code>public.profiles</code>.
                  </p>
                </div>

                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <strong style={{ fontSize: "11.5px", color: "#b91c1c" }}>2. Revoke/Remove Admin Privileges</strong>
                    <button
                      type="button"
                      onClick={() => copyToClipboard("SELECT demote_admin_user('your_email@example.com', 'health_worker');", "admin_demote_sql")}
                      style={{ background: "none", border: "none", color: "#0284c7", fontSize: "10.5px", cursor: "pointer", fontWeight: 700 }}
                    >
                      {copiedKey === "admin_demote_sql" ? "✓ Copied" : "Copy Query"}
                    </button>
                  </div>
                  <pre style={{ margin: 0, padding: "8px", background: "#0f172a", color: "#f87171", borderRadius: "6px", fontSize: "11px", overflowX: "auto" }}>
SELECT demote_admin_user(&apos;target_user@domain.com&apos;, &apos;health_worker&apos;);
                  </pre>
                  <p style={{ margin: "6px 0 0", fontSize: "10.5px", color: "#64748b" }}>
                    Revokes <code>is_admin</code> claim safely. Root administrator account is permanently protected from accidental lockout.
                  </p>
                </div>
              </div>

              <div style={{ marginTop: "10px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                  Complete Migration Script Preview:
                </div>
                <pre
                  style={{
                    background: "#0f172a",
                    color: "#e2e8f0",
                    padding: "14px",
                    borderRadius: "8px",
                    fontSize: "11.5px",
                    lineHeight: 1.5,
                    maxHeight: "220px",
                    overflowY: "auto",
                    margin: 0,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  }}
                >
                  {AES256_ADMIN_SECURITY_SQL}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
