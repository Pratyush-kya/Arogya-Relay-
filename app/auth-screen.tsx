"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient, type Profile, ADMIN_EMAIL, isAdminEmail, uploadToStorage } from "@/lib/supabase/client";
import { LanguageSwitcher } from "./language-switcher";
import { IconTooltip } from "./icon-tooltip";

type StatusTone = "idle" | "good" | "error" | "warn";

const DEFAULT_ADMIN_PASS = "Pratyush@#3130";

export interface AuthScreenProps {
  initialMode?: "signin" | "signup" | "admin" | "profile";
  onBackToDashboard: () => void;
  onSuccess?: () => void;
}

export function AuthScreen({ initialMode = "signin", onBackToDashboard, onSuccess }: AuthScreenProps) {
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<"signin" | "doctor_signup" | "asha_signup" | "admin_console" | "profile">(
    initialMode === "admin"
      ? "admin_console"
      : initialMode === "signup"
      ? "doctor_signup"
      : initialMode === "profile"
      ? "profile"
      : "signin"
  );

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<{ tone: StatusTone; text: string }>({ tone: "idle", text: "" });
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");

  // Doctor Verification Form State
  const [docNmcNumber, setDocNmcNumber] = useState("");
  const [docCouncil, setDocCouncil] = useState("National Medical Commission");
  const [docSpecialization, setDocSpecialization] = useState("General Medicine / Physician");
  const [docHospital, setDocHospital] = useState("");
  const [docProofFile, setDocProofFile] = useState<File | null>(null);
  const [uploadedProofUrl, setUploadedProofUrl] = useState<string>("");

  // ASHA form state
  const [ashaUnit, setAshaUnit] = useState("Mawlynnong Community Unit");

  // Admin doctor list
  const [doctorsList, setDoctorsList] = useState<Profile[]>([]);

  // Keyboard escape listener to go back
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onBackToDashboard();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onBackToDashboard]);

  // Load user session
  useEffect(() => {
    let alive = true;
    async function initUser() {
      try {
        const { data } = await supabase.auth.getUser();
        if (!alive) return;
        setUser(data.user);
        if (data.user) {
          loadProfile(data.user);
        }
      } catch {
        if (alive) setUser(null);
      }
    }
    initUser();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user);
      } else {
        setProfile(null);
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  async function loadProfile(currentUser: User) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle<Profile>();

      if (!error && data) {
        setProfile(data);
        if (data.role === "admin") {
          loadDoctorsForAdmin();
        }
      } else if (isAdminEmail(currentUser.email)) {
        const adminProf: Profile = {
          id: currentUser.id,
          email: currentUser.email,
          role: "admin",
          display_name: "Pratyush Kiran Rath (System Administrator)",
          pseudo_id: "ADM-PRATYUSH-01",
          facility_name: "Central Health Mission Authority",
          verification_status: "verified",
        };
        setProfile(adminProf);
        loadDoctorsForAdmin();
      }
    } catch {
      // offline fallback
    }
  }

  async function loadDoctorsForAdmin() {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "doctor")
        .order("verification_status", { ascending: false });

      if (data && data.length > 0) {
        setDoctorsList(data);
      } else {
        // Fallback demo pending doctor for offline preview
        setDoctorsList([
          {
            id: "demo-doc-1",
            display_name: "Dr. Ananya Mishra, MBBS, MD",
            email: "dr.ananya.mishra@odisha-health.org",
            role: "doctor",
            pseudo_id: "DOC-OD-9402",
            medical_reg_no: "OMC-2023-88219",
            council_name: "Odisha Medical Council",
            specialization: "Pediatrics & Neonatal Care",
            facility_name: "Baripada District Sub-divisional Hospital",
            verification_status: "pending_verification",
            license_document_url: "https://example.com/license-ananya.pdf",
          },
          {
            id: "demo-doc-2",
            display_name: "Dr. Rajeshwar Sharma, MS (Ortho)",
            email: "dr.rajeshwar.ortho@delhimc.in",
            role: "doctor",
            pseudo_id: "DOC-DL-4310",
            medical_reg_no: "DMC-2021-12044",
            council_name: "Delhi Medical Council",
            specialization: "Orthopedic Surgery & Trauma",
            facility_name: "Deen Dayal Upadhyay Hospital",
            verification_status: "verified",
            license_document_url: "https://example.com/license-rajeshwar.pdf",
          },
        ]);
      }
    } catch {
      // offline fallback
    }
  }

  async function fillAdminPreset() {
    setEmail(ADMIN_EMAIL);
    setPassword(DEFAULT_ADMIN_PASS);
    setStatus({
      tone: "good",
      text: "⚡ Admin credentials loaded for pratyushkiranrath4@gmail.com! Click 'Sign In' below.",
    });
  }

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setStatus({ tone: "error", text: "Please enter both email and password." });
      return;
    }

    setBusy(true);
    setStatus({ tone: "idle", text: "" });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        // If user doesn't exist yet and it's the admin email with correct password, auto-create
        if (isAdminEmail(email) && password === DEFAULT_ADMIN_PASS) {
          const signUpRes = await supabase.auth.signUp({
            email: ADMIN_EMAIL,
            password: DEFAULT_ADMIN_PASS,
            options: {
              data: {
                display_name: "Pratyush Kiran Rath",
                role: "admin",
              },
            },
          });

          if (signUpRes.error) {
            throw signUpRes.error;
          }

          if (signUpRes.data.user) {
            setUser(signUpRes.data.user);
            await loadProfile(signUpRes.data.user);
            setStatus({ tone: "good", text: "✓ System Administrator registered and authenticated!" });
            setBusy(false);
            if (onSuccess) onSuccess();
            return;
          }
        }
        throw error;
      }

      if (data.user) {
        setUser(data.user);
        await loadProfile(data.user);
        setStatus({ tone: "good", text: "✓ Successfully signed in! Welcome back." });
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onBackToDashboard();
        }, 800);
      }
    } catch (err: any) {
      setStatus({ tone: "error", text: err.message || "Failed to sign in. Please verify credentials." });
    } finally {
      setBusy(false);
    }
  }

  async function handleDoctorSignUp(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !displayName.trim()) {
      setStatus({ tone: "error", text: "Please complete name, email, and password." });
      return;
    }
    if (!docNmcNumber.trim() || !docCouncil.trim() || !docSpecialization.trim() || !docHospital.trim()) {
      setStatus({
        tone: "error",
        text: "National Medical Commission (NMC) registration number, State Council, and Hospital affiliation are mandatory for physician authorization.",
      });
      return;
    }

    setBusy(true);
    setStatus({ tone: "idle", text: "" });

    try {
      let docUrl = uploadedProofUrl;
      if (docProofFile) {
        const uploadRes = await uploadToStorage(
          "doctor-credentials",
          `nmc_${Date.now()}_${docProofFile.name.replace(/\s+/g, "_")}`,
          docProofFile
        );
        docUrl = uploadRes.url;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            display_name: displayName.trim().startsWith("Dr.") ? displayName.trim() : `Dr. ${displayName.trim()}`,
            role: "doctor",
            phone: phone.trim() || null,
            medical_reg_no: docNmcNumber.trim(),
            council_name: docCouncil.trim(),
            specialization: docSpecialization.trim(),
            facility_name: docHospital.trim(),
            verification_status: "pending_verification",
            license_document_url: docUrl,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Upsert into profiles table with pending_verification
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email: data.user.email,
          role: "doctor",
          display_name: displayName.trim().startsWith("Dr.") ? displayName.trim() : `Dr. ${displayName.trim()}`,
          pseudo_id: `DOC-${docNmcNumber.replace(/[^A-Za-z0-9]/g, "").slice(-4)}`,
          phone: phone.trim() || null,
          medical_reg_no: docNmcNumber.trim(),
          council_name: docCouncil.trim(),
          specialization: docSpecialization.trim(),
          facility_name: docHospital.trim(),
          verification_status: "pending_verification",
          license_document_url: docUrl,
        });

        setUser(data.user);
        setStatus({
          tone: "good",
          text: "✓ Doctor registration submitted! Status: PENDING NMC VERIFICATION by System Administrator.",
        });
      }
    } catch (err: any) {
      setStatus({ tone: "error", text: err.message || "Failed to register doctor. Check network connection." });
    } finally {
      setBusy(false);
    }
  }

  async function handleAshaSignUp(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !displayName.trim()) {
      setStatus({ tone: "error", text: "Please complete name, email, and password." });
      return;
    }

    setBusy(true);
    setStatus({ tone: "idle", text: "" });

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            display_name: displayName.trim(),
            role: "health_worker",
            facility_name: ashaUnit,
            phone: phone.trim() || null,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email: data.user.email,
          role: "health_worker",
          display_name: displayName.trim(),
          pseudo_id: `HW-${Math.floor(1000 + Math.random() * 9000)}`,
          facility_name: ashaUnit,
          phone: phone.trim() || null,
          verification_status: "verified",
        });

        setUser(data.user);
        setStatus({ tone: "good", text: "✓ Frontline Health Worker / ASHA registered and authenticated!" });
      }
    } catch (err: any) {
      setStatus({ tone: "error", text: err.message || "Failed to register health worker." });
    } finally {
      setBusy(false);
    }
  }

  async function updateDoctorVerification(doctorId: string, newStatus: "verified" | "rejected") {
    setBusy(true);
    try {
      await supabase
        .from("profiles")
        .update({
          verification_status: newStatus,
          verified_at: new Date().toISOString(),
          verified_by: user?.email || ADMIN_EMAIL,
        })
        .eq("id", doctorId);

      setDoctorsList((prev) =>
        prev.map((d) => (d.id === doctorId ? { ...d, verification_status: newStatus } : d))
      );
      setStatus({
        tone: "good",
        text: `✓ Doctor status updated to ${newStatus.toUpperCase()}!`,
      });
    } catch (err: any) {
      setStatus({ tone: "error", text: err.message || "Could not update status." });
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    await supabase.auth.signOut().catch(() => null);
    setUser(null);
    setProfile(null);
    setBusy(false);
    setStatus({ tone: "good", text: "Signed out successfully." });
  }

  return (
    <div className="fullscreen-console" role="main">
      {/* Top Header */}
      <header className="fullscreen-header">
        <div className="fullscreen-header-left">
          <IconTooltip
            title="Return to Primary Clinic Dashboard"
            desc="Exits the authentication workstation and returns to patient cases and triage overview."
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
              <span>🛡️</span>
              <span>Arogya Relay — Medical Identity & Authentication Portal</span>
            </h1>
            <p>256-bit encrypted · Role-based clinical access & National Medical Commission (NMC) verification</p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <LanguageSwitcher />
          {user && (
            <button
              type="button"
              className="secondary-button"
              onClick={signOut}
              disabled={busy}
              style={{ padding: "6px 12px", fontSize: "11px", color: "#dc2626", borderColor: "#fecaca" }}
            >
              Sign Out
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <div className="fullscreen-content-container">
        <div className="auth-fullscreen-card">
          {/* Workstation Navigation Tabs */}
          <nav className="auth-tabs-header">
            <button
              type="button"
              className={`auth-tab-btn ${tab === "signin" ? "active" : ""}`}
              onClick={() => {
                setTab("signin");
                setStatus({ tone: "idle", text: "" });
              }}
            >
              <span>🔐</span>
              <span>Sign In</span>
            </button>

            <button
              type="button"
              className={`auth-tab-btn ${tab === "doctor_signup" ? "active" : ""}`}
              onClick={() => {
                setTab("doctor_signup");
                setStatus({ tone: "idle", text: "" });
              }}
            >
              <span>🩺</span>
              <span>Doctor Registration (NMC)</span>
            </button>

            <button
              type="button"
              className={`auth-tab-btn ${tab === "asha_signup" ? "active" : ""}`}
              onClick={() => {
                setTab("asha_signup");
                setStatus({ tone: "idle", text: "" });
              }}
            >
              <span>👩‍⚕️</span>
              <span>ASHA / Health Worker</span>
            </button>

            {(profile?.role === "admin" || isAdminEmail(user?.email)) && (
              <button
                type="button"
                className={`auth-tab-btn ${tab === "admin_console" ? "active" : ""}`}
                onClick={() => {
                  setTab("admin_console");
                  loadDoctorsForAdmin();
                  setStatus({ tone: "idle", text: "" });
                }}
              >
                <span>🛡️</span>
                <span>Admin Doctor Console ({doctorsList.filter((d) => d.verification_status === "pending_verification").length})</span>
              </button>
            )}

            {user && (
              <button
                type="button"
                className={`auth-tab-btn ${tab === "profile" ? "active" : ""}`}
                onClick={() => {
                  setTab("profile");
                  setStatus({ tone: "idle", text: "" });
                }}
              >
                <span>👤</span>
                <span>My Active Credentials</span>
              </button>
            )}
          </nav>

          {/* Status Message Strip */}
          {status.text && (
            <div
              style={{
                padding: "10px 20px",
                background:
                  status.tone === "good" ? "#ecfdf5" : status.tone === "error" ? "#fef2f2" : "#eff6ff",
                color:
                  status.tone === "good" ? "#065f46" : status.tone === "error" ? "#991b1b" : "#1e40af",
                borderBottom: "1px solid rgba(0,0,0,0.06)",
                fontSize: "12px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>{status.tone === "good" ? "✓" : status.tone === "error" ? "⚠️" : "ℹ️"}</span>
              <span>{status.text}</span>
            </div>
          )}

          {/* TAB 1: SIGN IN */}
          {tab === "signin" && (
            <div style={{ padding: "28px" }}>
              {/* Quick Admin Preset Card */}
              <div
                style={{
                  background: "linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)",
                  border: "1.5px solid #059669",
                  borderRadius: "14px",
                  padding: "16px",
                  marginBottom: "24px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: "0 2px 10px rgba(5, 150, 105, 0.08)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "16px" }}>⚡</span>
                    <strong style={{ fontSize: "13px", color: "#065f46" }}>System Administrator Quick Preset</strong>
                  </div>
                  <div style={{ fontSize: "11px", color: "#374151" }}>
                    Email: <strong>{ADMIN_EMAIL}</strong> · Password: <strong>{DEFAULT_ADMIN_PASS}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  className="primary-button"
                  style={{
                    padding: "8px 14px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    background: "#059669",
                    whiteSpace: "nowrap",
                  }}
                  onClick={fillAdminPreset}
                >
                  ⚡ Auto-Fill Admin
                </button>
              </div>

              <form onSubmit={handleSignIn} style={{ display: "grid", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "#1e293b" }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. doctor@clinic.org or admin"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      background: "#f8fafc",
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      style={{ background: "none", border: "none", fontSize: "11px", color: "#0284c7", cursor: "pointer", fontWeight: 600 }}
                    >
                      {showPassword ? "Hide" : "Show"} password
                    </button>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      background: "#f8fafc",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={busy}
                    style={{
                      flex: 1,
                      padding: "12px",
                      fontSize: "13px",
                      fontWeight: 700,
                      justifyContent: "center",
                    }}
                  >
                    {busy ? "Authenticating..." : "Sign In to Healthcare Station"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: DOCTOR REGISTRATION WITH NMC VERIFICATION */}
          {tab === "doctor_signup" && (
            <div style={{ padding: "28px" }}>
              <div
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "12px",
                  padding: "14px",
                  marginBottom: "20px",
                }}
              >
                <strong style={{ fontSize: "13px", color: "#1e40af", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>🩺</span> National Medical Commission (NMC) Verification Gate
                </strong>
                <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#3b82f6", lineHeight: 1.4 }}>
                  To prevent clinical malpractice and unauthorized prescription generation, all doctor accounts undergo mandatory verification against their State Medical Council registration before prescriptions are unlocked.
                </p>
              </div>

              <form onSubmit={handleDoctorSignUp} style={{ display: "grid", gap: "14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                      Physician Full Name (with title) *
                    </label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Dr. Ramesh Chandra Das, MBBS"
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                      Official Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. dr.ramesh@hospital.org"
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                      NMC / State Council Reg No. *
                    </label>
                    <input
                      type="text"
                      required
                      value={docNmcNumber}
                      onChange={(e) => setDocNmcNumber(e.target.value)}
                      placeholder="e.g. OMC-2022-77123 or MCI-10924"
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                      State Medical Council *
                    </label>
                    <select
                      value={docCouncil}
                      onChange={(e) => setDocCouncil(e.target.value)}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px", background: "#fff" }}
                    >
                      <option value="National Medical Commission">National Medical Commission (NMC)</option>
                      <option value="Odisha Medical Council">Odisha Medical Council</option>
                      <option value="Delhi Medical Council">Delhi Medical Council</option>
                      <option value="Maharashtra Medical Council">Maharashtra Medical Council</option>
                      <option value="West Bengal Medical Council">West Bengal Medical Council</option>
                      <option value="Tamil Nadu Medical Council">Tamil Nadu Medical Council</option>
                      <option value="Karnataka Medical Council">Karnataka Medical Council</option>
                      <option value="Assam Medical Council">Assam Medical Council</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                      Clinical Specialization *
                    </label>
                    <select
                      value={docSpecialization}
                      onChange={(e) => setDocSpecialization(e.target.value)}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px", background: "#fff" }}
                    >
                      <option value="General Medicine / Physician">General Medicine / Physician</option>
                      <option value="Pediatrics & Child Health">Pediatrics & Child Health</option>
                      <option value="Obstetrics & Gynecology">Obstetrics & Gynecology</option>
                      <option value="Dermatology & Venereology">Dermatology & Venereology</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Pulmonology / Chest Medicine">Pulmonology / Chest Medicine</option>
                      <option value="Orthopedic Surgery">Orthopedic Surgery</option>
                      <option value="Community Medicine / Public Health">Community Medicine / Public Health</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                      Primary Hospital / PHC Affiliation *
                    </label>
                    <input
                      type="text"
                      required
                      value={docHospital}
                      onChange={(e) => setDocHospital(e.target.value)}
                      placeholder="e.g. SCB Medical College & Hospital / CHC"
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                    NMC Certificate / Medical Registration ID Document Upload (PDF / Image)
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setDocProofFile(e.target.files[0]);
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px dashed #cbd5e1",
                      fontSize: "12px",
                      background: "#f8fafc",
                    }}
                  />
                  {docProofFile && (
                    <small style={{ fontSize: "10px", color: "#166534", marginTop: "3px", display: "block" }}>
                      ✓ File selected: {docProofFile.name} ({(docProofFile.size / 1024).toFixed(1)} KB)
                    </small>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                    Set Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                  />
                </div>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={busy}
                  style={{
                    padding: "12px",
                    fontSize: "13px",
                    fontWeight: 700,
                    justifyContent: "center",
                    marginTop: "8px",
                  }}
                >
                  {busy ? "Submitting Registration..." : "Submit Doctor Credentials for Administrator Verification"}
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: ASHA / HEALTH WORKER SIGN UP */}
          {tab === "asha_signup" && (
            <div style={{ padding: "28px" }}>
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "12px",
                  padding: "14px",
                  marginBottom: "20px",
                }}
              >
                <strong style={{ fontSize: "13px", color: "#166534", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>👩‍⚕️</span> Frontline Health Worker / ASHA Registration
                </strong>
                <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#15803d", lineHeight: 1.4 }}>
                  Enables frontline village health workers, ANMs, and ASHA facilitators to capture offline clinical screenings with automatic practitioner identity attestation.
                </p>
              </div>

              <form onSubmit={handleAshaSignUp} style={{ display: "grid", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                    Worker Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Sunita Devi (ASHA)"
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. sunita.asha@block-health.org"
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                      Assigned Community Unit / Village Block *
                    </label>
                    <input
                      type="text"
                      required
                      value={ashaUnit}
                      onChange={(e) => setAshaUnit(e.target.value)}
                      placeholder="e.g. Mawlynnong Sub-Centre / Ward 4"
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                    Set Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                  />
                </div>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={busy}
                  style={{
                    padding: "12px",
                    fontSize: "13px",
                    fontWeight: 700,
                    justifyContent: "center",
                    marginTop: "8px",
                  }}
                >
                  {busy ? "Registering..." : "Create ASHA / Health Worker Account"}
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: ADMIN DOCTOR VERIFICATION CONSOLE */}
          {tab === "admin_console" && (
            <div style={{ padding: "28px" }}>
              <div
                style={{
                  background: "#fef3c7",
                  border: "1px solid #fde68a",
                  borderRadius: "12px",
                  padding: "14px",
                  marginBottom: "20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong style={{ fontSize: "13px", color: "#92400e", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>🛡️</span> System Administrator Doctor Governance
                  </strong>
                  <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#b45309" }}>
                    Logged in as <strong>{user?.email || ADMIN_EMAIL}</strong>. Verify physician NMC registrations to grant electronic prescription signing authority.
                  </p>
                </div>
                <button
                  type="button"
                  className="glass-button"
                  onClick={loadDoctorsForAdmin}
                  style={{ padding: "6px 12px", fontSize: "11px", fontWeight: 700 }}
                >
                  🔄 Refresh List
                </button>
              </div>

              <div style={{ display: "grid", gap: "12px" }}>
                {doctorsList.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                    <span style={{ fontSize: "32px", display: "block", marginBottom: "8px" }}>🩺</span>
                    <strong>No doctors currently registered</strong>
                  </div>
                ) : (
                  doctorsList.map((doc) => {
                    const isPending = doc.verification_status === "pending_verification";
                    const isVerified = doc.verification_status === "verified";
                    return (
                      <div
                        key={doc.id}
                        style={{
                          padding: "16px",
                          borderRadius: "12px",
                          border: isPending ? "2px solid #f59e0b" : "1px solid #e2e8f0",
                          background: isPending ? "#fffbeb" : "#ffffff",
                          display: "grid",
                          gap: "8px",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <strong style={{ fontSize: "14px", color: "#0f172a" }}>{doc.display_name}</strong>
                            <span style={{ fontSize: "12px", color: "#64748b", marginLeft: "8px" }}>({doc.email})</span>
                          </div>
                          <span
                            style={{
                              fontSize: "10.5px",
                              fontWeight: 800,
                              padding: "3px 10px",
                              borderRadius: "12px",
                              background: isPending ? "#fef3c7" : isVerified ? "#dcfce7" : "#fee2e2",
                              color: isPending ? "#b45309" : isVerified ? "#15803d" : "#b91c1c",
                              textTransform: "uppercase",
                            }}
                          >
                            {isPending ? "⚠️ PENDING NMC VERIFICATION" : doc.verification_status?.toUpperCase()}
                          </span>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                            gap: "8px",
                            fontSize: "11.5px",
                            background: "rgba(0,0,0,0.03)",
                            padding: "10px",
                            borderRadius: "8px",
                          }}
                        >
                          <div><strong>NMC Reg No:</strong> {doc.medical_reg_no || "NMC-VERIF-REQ"}</div>
                          <div><strong>Council:</strong> {doc.council_name || "National Medical Commission"}</div>
                          <div><strong>Specialization:</strong> {doc.specialization || "General Medicine"}</div>
                          <div><strong>Hospital:</strong> {doc.facility_name || "Community Hospital"}</div>
                        </div>

                        {doc.license_document_url && (
                          <div style={{ fontSize: "11px" }}>
                            <a
                              href={doc.license_document_url}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "#0284c7", fontWeight: 700, textDecoration: "underline" }}
                            >
                              📄 Inspect Uploaded Registration Certificate / ID →
                            </a>
                          </div>
                        )}

                        <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                          {!isVerified && (
                            <button
                              type="button"
                              className="primary-button"
                              style={{ padding: "6px 14px", fontSize: "11px", fontWeight: 700, background: "#16a34a" }}
                              onClick={() => updateDoctorVerification(doc.id, "verified")}
                              disabled={busy}
                            >
                              ✓ Verify & Approve Doctor
                            </button>
                          )}
                          {doc.verification_status !== "rejected" && (
                            <button
                              type="button"
                              className="secondary-button"
                              style={{ padding: "6px 14px", fontSize: "11px", fontWeight: 700, color: "#dc2626", borderColor: "#fecaca" }}
                              onClick={() => updateDoctorVerification(doc.id, "rejected")}
                              disabled={busy}
                            >
                              ✕ Reject Application
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 5: ACTIVE PROFILE */}
          {tab === "profile" && user && (
            <div style={{ padding: "28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "var(--sc-accent, #17644f)",
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "24px",
                    fontWeight: 800,
                  }}
                >
                  {profile?.role === "doctor" ? "👨‍⚕️" : profile?.role === "admin" ? "🛡️" : "🩺"}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "18px", color: "var(--ink, #1e293b)" }}>
                    {profile?.display_name || user.email}
                  </h2>
                  <div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
                    {user.email} · ID: <strong>{profile?.pseudo_id || "USER-ACTIVE"}</strong>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "14px",
                  background: "#f8fafc",
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <small style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                    Role
                  </small>
                  <strong style={{ fontSize: "13px", color: "var(--sc-accent, #17644f)" }}>
                    {profile?.role?.toUpperCase() || "FRONT-LINE WORKER"}
                  </strong>
                </div>

                <div>
                  <small style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                    Verification Status
                  </small>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: "6px",
                      background:
                        profile?.verification_status === "verified"
                          ? "#dcfce7"
                          : profile?.verification_status === "pending_verification"
                          ? "#fef3c7"
                          : "#f1f5f9",
                      color:
                        profile?.verification_status === "verified"
                          ? "#15803d"
                          : profile?.verification_status === "pending_verification"
                          ? "#b45309"
                          : "#475569",
                    }}
                  >
                    {profile?.verification_status === "verified"
                      ? "✓ VERIFIED PRACTITIONER"
                      : profile?.verification_status === "pending_verification"
                      ? "⚠️ PENDING NMC APPROVAL"
                      : "ACTIVE"}
                  </span>
                </div>

                {profile?.role === "doctor" && (
                  <>
                    <div>
                      <small style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                        NMC Registration No
                      </small>
                      <strong style={{ fontSize: "13px" }}>{profile.medical_reg_no}</strong>
                    </div>
                    <div>
                      <small style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                        Medical Council
                      </small>
                      <strong style={{ fontSize: "13px" }}>{profile.council_name}</strong>
                    </div>
                    <div>
                      <small style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                        Specialization
                      </small>
                      <strong style={{ fontSize: "13px" }}>{profile.specialization}</strong>
                    </div>
                    <div>
                      <small style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                        Hospital Affiliation
                      </small>
                      <strong style={{ fontSize: "13px" }}>{profile.facility_name}</strong>
                    </div>
                  </>
                )}
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  className="primary-button"
                  onClick={onBackToDashboard}
                  style={{ flex: 1, padding: "10px", justifyContent: "center" }}
                >
                  ← Return to Primary Dashboard
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={signOut}
                  style={{ padding: "10px 18px", color: "#dc2626", borderColor: "#fecaca" }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
