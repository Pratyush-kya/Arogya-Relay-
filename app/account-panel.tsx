"use client";

import { FormEvent, useEffect, useMemo, useState, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient, type Profile, ADMIN_EMAIL, isAdminEmail, uploadToStorage } from "@/lib/supabase/client";

type StatusTone = "idle" | "good" | "error" | "warn";

const ROLES = [
  { id: "patient", label: "Citizen / Patient", icon: "👤", desc: "Access care, consult doctors & Jan Aushadhi remedies" },
  { id: "doctor", label: "Medical Doctor", icon: "🩺", desc: "Review cases, digital Rx & tele-consultation" },
  { id: "health_worker", label: "Health Worker / ASHA", icon: "👩‍⚕️", desc: "Frontline screening, field triage & referrals" },
  { id: "chemist", label: "Chemist / Pharmacist", icon: "🏪", desc: "Jan Aushadhi store & digital prescription dispensing" },
] as const;

export function AccountPanel({ open, onToggle }: { open?: boolean; onToggle?: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
      } else if (typeof window !== "undefined") {
        const localUser = localStorage.getItem("arogya.local_user");
        if (localUser) {
          try {
            setUser(JSON.parse(localUser));
          } catch {}
        }
      }
    }).catch(() => {
      if (typeof window !== "undefined") {
        const localUser = localStorage.getItem("arogya.local_user");
        if (localUser) {
          try {
            setUser(JSON.parse(localUser));
          } catch {}
        }
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!user) {
      if (typeof window !== "undefined") {
        const localProfile = localStorage.getItem("arogya.local_profile");
        if (localProfile) {
          try {
            setProfile(JSON.parse(localProfile));
            return;
          } catch {}
        }
      }
      setProfile(null);
      return;
    }
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle<Profile>()
      .then(({ data }) => {
        if (data) {
          setProfile(data);
        } else if (isAdminEmail(user.email)) {
          setProfile({
            id: user.id,
            email: user.email,
            role: "admin",
            display_name: "Pratyush Kiran Rath (Admin)",
            pseudo_id: "ADM-PRATYUSH",
            verification_status: "verified",
          });
        } else if (typeof window !== "undefined") {
          const localProfile = localStorage.getItem("arogya.local_profile");
          if (localProfile) {
            try {
              setProfile(JSON.parse(localProfile));
            } catch {}
          }
        }
      })
      .catch(() => {
        if (typeof window !== "undefined") {
          const localProfile = localStorage.getItem("arogya.local_profile");
          if (localProfile) {
            try {
              setProfile(JSON.parse(localProfile));
            } catch {}
          }
        }
      });
  }, [supabase, user]);

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Field Clinic (Offline-Ready)";
  const roleLabel = profile?.role ? profile.role.replace("_", " ").toUpperCase() : user ? "ACCOUNT ACTIVE" : "FIELD OPERATOR";
  const initials = (displayName.match(/\b[A-Za-z]/g) ?? ["A", "R"]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="worker-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div className={`avatar ${!user ? "guest-avatar" : ""}`} style={{ width: "32px", height: "32px", fontSize: "12px" }}>
          {initials}
        </div>
        <div>
          <strong style={{ fontSize: "12px", display: "block", color: "var(--ink, #1e293b)" }}>{displayName}</strong>
          <span className={`role-tag ${profile?.role || "guest"}`} style={{ fontSize: "9px" }}>
            {profile?.role === "doctor" && profile?.verification_status === "pending_verification"
              ? "DOCTOR (PENDING)"
              : roleLabel}
          </span>
        </div>
      </div>
      <span style={{ fontSize: "10px", color: "var(--muted, #64748b)" }} title="Session active">
        {user ? "●" : "🔒"}
      </span>
    </div>
  );
}

import { IconTooltip } from "./icon-tooltip";
export { AuthScreen } from "./auth-screen";

/**
 * TopRightUserNav replaces the old user header pill and key icon.
 * Positioned in the top right corner of the application for prominent account
 * access, authentication, doctor verification alerts, and admin console launch.
 */
export function TopRightUserNav({
  currentUser,
  currentProfile,
  onOpenAuthScreen,
  onOpenSupabase,
  onOpenAdmin,
  onSignOut,
}: {
  currentUser?: User | null;
  currentProfile?: Profile | null;
  onOpenAuthScreen?: (mode: "signin" | "signup" | "admin" | "profile") => void;
  onOpenSupabase?: () => void;
  onOpenAdmin?: () => void;
  onSignOut?: () => void;
} = {}) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(currentUser ?? null);
  const [profile, setProfile] = useState<Profile | null>(currentProfile ?? null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [adminConsoleOpen, setAdminConsoleOpen] = useState(false);
  const [status, setStatus] = useState<{ tone: StatusTone; text: string }>({ tone: "idle", text: "" });
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"patient" | "doctor" | "health_worker" | "chemist">("patient");
  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync props if provided
  useEffect(() => {
    if (currentUser !== undefined) {
      setUser(currentUser);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentProfile !== undefined) {
      setProfile(currentProfile);
    }
  }, [currentProfile]);

  // Doctor Verification Form State
  const [docNmcNumber, setDocNmcNumber] = useState("");
  const [docCouncil, setDocCouncil] = useState("National Medical Commission");
  const [docSpecialization, setDocSpecialization] = useState("General Medicine / Physician");
  const [docHospital, setDocHospital] = useState("");
  const [docProofFile, setDocProofFile] = useState<File | null>(null);

  // List of doctors for Admin Verification Console
  const [doctorsList, setDoctorsList] = useState<Profile[]>([]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    }
    if (popoverOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [popoverOpen]);

  useEffect(() => {
    let alive = true;
    async function initUser() {
      // 1. Try Supabase Cloud session
      try {
        const { data } = await supabase.auth.getUser();
        if (!alive) return;
        if (data?.user) {
          setUser(data.user);
          loadProfile(data.user);
          return;
        }
      } catch {}

      // 2. Fallback to Local Offline Session
      if (typeof window !== "undefined" && alive) {
        const savedUser = localStorage.getItem("arogya.local_user");
        const savedProfile = localStorage.getItem("arogya.local_profile");
        if (savedUser) {
          try {
            const u = JSON.parse(savedUser);
            setUser(u);
            if (savedProfile) {
              setProfile(JSON.parse(savedProfile));
            } else {
              loadProfile(u);
            }
            return;
          } catch {}
        }
        if (!currentUser) {
          setUser(null);
        }
      }
    }
    initUser();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user);
        setAuthModalOpen(false);
      } else {
        // Only clear if local session is also absent
        if (typeof window !== "undefined" && !localStorage.getItem("arogya.local_user")) {
          setProfile(null);
        }
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, currentUser]);

  async function loadProfile(currentUser: User) {
    if (isAdminEmail(currentUser.email)) {
      setProfile({
        id: currentUser.id,
        email: currentUser.email,
        role: "admin",
        display_name: "Pratyush Kiran Rath (Admin)",
        pseudo_id: "ADM-PRATYUSH",
        verification_status: "verified",
      });
      return;
    }

    try {
      const { data } = await supabase.from("profiles").select("*").eq("id", currentUser.id).maybeSingle<Profile>();
      if (data) {
        setProfile(data);
      } else {
        // Fallback profile
        const role = (currentUser.user_metadata?.role as Profile["role"]) || "health_worker";
        const isDoc = role === "doctor";
        setProfile({
          id: currentUser.id,
          email: currentUser.email,
          role,
          display_name: currentUser.user_metadata?.display_name || currentUser.email?.split("@")[0] || "User",
          pseudo_id: `${role.slice(0, 3)}-${currentUser.id.slice(0, 6)}`,
          verification_status: isDoc ? "pending_verification" : "verified",
          medical_reg_no: currentUser.user_metadata?.medical_reg_no,
          council_name: currentUser.user_metadata?.council_name,
          specialization: currentUser.user_metadata?.specialization,
          facility_name: currentUser.user_metadata?.facility_name,
        });
      }
    } catch {
      // Local fallback
    }
  }

  // Admin loads list of all doctors
  async function loadDoctorsForAdmin() {
    try {
      const { data } = await supabase.from("profiles").select("*").eq("role", "doctor");
      if (data && data.length > 0) {
        setDoctorsList(data);
      } else {
        // Sample pending doctors if fresh
        const cached = localStorage.getItem("arogya.doctors.list");
        if (cached) {
          setDoctorsList(JSON.parse(cached));
        } else {
          const sample: Profile[] = [
            {
              id: "doc-demo-1",
              email: "dr.sharma@health.gov.in",
              display_name: "Dr. Ananya Sharma, MD",
              role: "doctor",
              pseudo_id: "DOC-ANANYA",
              medical_reg_no: "NMC-2022-84920",
              council_name: "Delhi Medical Council",
              specialization: "General Physician",
              facility_name: "Pynursla CHC",
              verification_status: "pending_verification",
              verification_notes: "Awaiting NMC verification approval",
            },
            {
              id: "doc-demo-2",
              email: "dr.patel@ruralhealth.org",
              display_name: "Dr. Rajesh Patel, MBBS",
              role: "doctor",
              pseudo_id: "DOC-RAJESH",
              medical_reg_no: "GMC-1998-11024",
              council_name: "Gujarat Medical Council",
              specialization: "Paediatrics & Neonatal Care",
              facility_name: "Mawlynnong District Hospital",
              verification_status: "verified",
              verified_by: ADMIN_EMAIL,
              verified_at: new Date().toISOString(),
            },
          ];
          setDoctorsList(sample);
          localStorage.setItem("arogya.doctors.list", JSON.stringify(sample));
        }
      }
    } catch {
      // Offline fallback
    }
  }

  async function handleDoctorApproval(docId: string, approve: boolean) {
    const updated = doctorsList.map((d) => {
      if (d.id === docId) {
        return {
          ...d,
          verification_status: approve ? ("verified" as const) : ("rejected" as const),
          verified_by: ADMIN_EMAIL,
          verified_at: new Date().toISOString(),
          verification_notes: approve ? "Verified by Admin Pratyush Kiran Rath" : "License rejected / incorrect NMC details",
        };
      }
      return d;
    });

    setDoctorsList(updated);
    localStorage.setItem("arogya.doctors.list", JSON.stringify(updated));

    try {
      await supabase
        .from("profiles")
        .update({
          verification_status: approve ? "verified" : "rejected",
          verified_by: ADMIN_EMAIL,
          verified_at: new Date().toISOString(),
          verification_notes: approve ? "Verified by Admin Pratyush Kiran Rath" : "Rejected",
        })
        .eq("id", docId);
    } catch {
      // Saved in local storage
    }
  }

  async function handleSignIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (!email || !password) {
      setStatus({ tone: "error", text: "Please provide both email and password." });
      return;
    }

    setBusy(true);
    setStatus({ tone: "idle", text: "" });

    try {
      const res = await supabase.auth.signInWithPassword({ email, password });
      if (res.error) {
        setStatus({ tone: "error", text: res.error.message });
        setBusy(false);
        return;
      }
      setStatus({ tone: "good", text: "Signed in successfully." });
      setAuthModalOpen(false);

      // Check role and launch doctor workstation webpage simultaneously if logging in as doctor
      try {
        const { data: prof } = await supabase.from("profiles").select("role").eq("id", res.data.user.id).maybeSingle<Profile>();
        const role = prof?.role || (res.data.user.user_metadata?.role as any) || "patient";
        if (role === "doctor" && typeof window !== "undefined") {
          try {
            window.open("/doctor", "_blank");
          } catch {}
        }
      } catch {}
    } catch (err: any) {
      setStatus({ tone: "error", text: err.message || "Sign in failed." });
    } finally {
      setBusy(false);
    }
  }

  async function handleAdminQuickLogin() {
    setAuthMode("signin");
    setAuthModalOpen(true);
    setStatus({ tone: "idle", text: `Please sign in with administrator credentials for ${ADMIN_EMAIL}` });
  }

  async function handleSignUp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const displayName = String(form.get("displayName") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const facilityName = String(form.get("facilityName") ?? "").trim();

    if (!email || !password) {
      setStatus({ tone: "error", text: "Please fill in all mandatory fields." });
      return;
    }
    if (password.length < 6) {
      setStatus({ tone: "error", text: "Password must be at least 6 characters." });
      return;
    }

    if (selectedRole === "doctor" && !docNmcNumber.trim()) {
      setStatus({ tone: "error", text: "Doctors must provide a valid NMC / State Medical Council Registration Number." });
      return;
    }

    setBusy(true);
    setStatus({ tone: "idle", text: "" });

    // Upload license proof if provided
    let licenseDocUrl = "";
    if (docProofFile) {
      const uploadRes = await uploadToStorage("doctor-credentials", `${email}-license`, docProofFile);
      licenseDocUrl = uploadRes.url;
    }

    const isAdmin = isAdminEmail(email);
    const assignedRole = isAdmin ? "admin" : selectedRole;
    const initialVerification = isAdmin ? "verified" : selectedRole === "doctor" ? "pending_verification" : "verified";

    try {
      const result = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || email.split("@")[0],
            role: assignedRole,
            facility_name: facilityName || undefined,
            medical_reg_no: docNmcNumber || undefined,
            council_name: docCouncil || undefined,
            specialization: docSpecialization || undefined,
            verification_status: initialVerification,
            license_document_url: licenseDocUrl || undefined,
          },
        },
      });

      if (result.error) {
        setStatus({ tone: "error", text: result.error.message });
        setBusy(false);
        return;
      }

      const uid = result.data.user?.id || `local-${Date.now()}`;
      const newProfile: Profile = {
        id: uid,
        email,
        display_name: displayName || email.split("@")[0],
        role: assignedRole,
        pseudo_id: `${assignedRole.slice(0, 3)}-${displayName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8)}`,
        facility_name: facilityName || "Field Clinic",
        medical_reg_no: docNmcNumber || undefined,
        council_name: docCouncil || undefined,
        specialization: docSpecialization || undefined,
        verification_status: initialVerification,
        license_document_url: licenseDocUrl || undefined,
      };

      // Upsert profile in Supabase
      await supabase.from("profiles").upsert(newProfile).catch(() => null);

      if (selectedRole === "doctor") {
        // Also cache in local doctor registration list for admin to see
        const curList = JSON.parse(localStorage.getItem("arogya.doctors.list") || "[]");
        curList.unshift(newProfile);
        localStorage.setItem("arogya.doctors.list", JSON.stringify(curList));
      }

      setProfile(newProfile);
      setBusy(false);
      setStatus({
        tone: selectedRole === "doctor" ? "warn" : "good",
        text: selectedRole === "doctor"
          ? "Doctor account created! Opening Doctor Station..."
          : "Account created successfully! Welcome to Arogya Relay.",
      });
      setAuthModalOpen(false);

      if (assignedRole === "doctor" && typeof window !== "undefined") {
        try {
          window.open("/doctor", "_blank");
        } catch {
          // popup blocked fallback
        }
      }
    } catch (err: any) {
      setBusy(false);
      setStatus({ tone: "error", text: err.message || "Account creation failed." });
    }
  }

  async function signOut() {
    if (onSignOut) {
      onSignOut();
      setPopoverOpen(false);
      return;
    }
    setBusy(true);
    await supabase.auth.signOut().catch(() => null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("arogya.local_user");
      localStorage.removeItem("arogya.local_profile");
      sessionStorage.removeItem("arogya.admin.auth_session");
    }
    setUser(null);
    setProfile(null);
    setPopoverOpen(false);
    setBusy(false);
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }

  const roleTheme = {
    admin: { bg: "#fef3c7", color: "#92400e", label: "ADMIN", icon: "🛡️" },
    doctor: { bg: "#e0f2fe", color: "#0369a1", label: "DOCTOR", icon: "👨‍⚕️" },
    health_worker: { bg: "#dcfce7", color: "#166534", label: "ASHA / HW", icon: "🩺" },
    reviewer: { bg: "#f3e8ff", color: "#7e22ce", label: "REVIEWER", icon: "📋" },
    patient: { bg: "#f1f5f9", color: "#475569", label: "PATIENT", icon: "👤" },
    caregiver: { bg: "#f1f5f9", color: "#475569", label: "CAREGIVER", icon: "🤝" },
  };

  const currentTheme = profile?.role ? roleTheme[profile.role] : { bg: "#f1f5f9", color: "#475569", label: "GUEST", icon: "👤" };
  const isDoctorPending = profile?.role === "doctor" && profile?.verification_status === "pending_verification";

  return (
    <div style={{ position: "relative" }} ref={popoverRef}>
      {/* Top Right Header Pill */}
      {user ? (
        <IconTooltip
          title="User Account & Doctor Status"
          desc="Manage session, NMC verification badges, and clinic credentials."
          howToUse="Click to view menu or switch to full-screen account workstation."
          position="bottom"
        >
          <button
            type="button"
            onClick={() => setPopoverOpen((p) => !p)}
            className="glass-button"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "5px 12px",
              borderRadius: "20px",
              background: "rgba(255, 255, 255, 0.9)",
              border: isDoctorPending ? "1.5px solid #f59e0b" : "1.5px solid rgba(23, 100, 79, 0.25)",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
            title={user.email || "Account Profile"}
          >
            <span style={{ fontSize: "14px" }}>{currentTheme.icon}</span>
            <div style={{ textAlign: "left", lineHeight: 1.1 }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--sc-ink, #0f172a)", display: "block" }}>
                {profile?.display_name || user.email?.split("@")[0]}
              </span>
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  color: isDoctorPending ? "#d97706" : currentTheme.color,
                  textTransform: "uppercase",
                }}
              >
                {isDoctorPending ? "⚠️ NMC Pending" : currentTheme.label}
              </span>
            </div>
            <span style={{ fontSize: "9px", opacity: 0.6 }}>▼</span>
          </button>
        </IconTooltip>
      ) : (
        <IconTooltip
          title="Sign In or Sign Up"
          desc="Access authenticated clinical tools, doctor workstation, and citizen health records."
          howToUse="Click to open the account authentication modal."
          position="bottom"
        >
          <button
            type="button"
            onClick={() => {
              if (onOpenAuthScreen) {
                onOpenAuthScreen("signin");
              } else {
                setAuthMode("signin");
                setAuthModalOpen(true);
              }
            }}
            className="primary-button"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "18px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <span>👤</span> Sign In / Sign Up
          </button>
        </IconTooltip>
      )}

      {/* Account Popover */}
      {popoverOpen && user && (
        <div
          role="region"
          aria-label="Account Menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 1000,
            background: "#ffffff",
            borderRadius: "14px",
            boxShadow: "0 10px 35px rgba(0,0,0,0.18)",
            border: "1px solid rgba(23, 100, 79, 0.18)",
            padding: "14px",
            minWidth: "270px",
            display: "grid",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: currentTheme.bg,
                color: currentTheme.color,
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
                fontSize: "15px",
              }}
            >
              {currentTheme.icon}
            </div>
            <div>
              <strong style={{ fontSize: "13px", display: "block" }}>{profile?.display_name || user.email}</strong>
              <small style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>{user.email}</small>
            </div>
          </div>

          {/* Role & Verification Badge */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", padding: "8px 10px", borderRadius: "8px" }}>
            <div>
              <small style={{ fontSize: "9px", textTransform: "uppercase", color: "#64748b", fontWeight: 700, display: "block" }}>Role</small>
              <strong style={{ fontSize: "11px", color: currentTheme.color }}>{currentTheme.label}</strong>
            </div>
            <div style={{ textAlign: "right" }}>
              <small style={{ fontSize: "9px", textTransform: "uppercase", color: "#64748b", fontWeight: 700, display: "block" }}>Status</small>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: "6px",
                  background: isDoctorPending ? "#fef3c7" : "#dcfce7",
                  color: isDoctorPending ? "#b45309" : "#15803d",
                }}
              >
                {isDoctorPending ? "Pending NMC Approval" : "Active & Verified"}
              </span>
            </div>
          </div>

          {profile?.role === "doctor" && (
            <div style={{ fontSize: "10.5px", background: "#f0f9ff", padding: "8px", borderRadius: "8px", border: "1px solid #bae6fd" }}>
              <div><strong>NMC Reg:</strong> {profile?.medical_reg_no || "NMC-MH-2023"}</div>
              <div><strong>Council:</strong> {profile?.council_name || "State Medical Council"}</div>
              <div><strong>Specialization:</strong> {profile?.specialization || "General Medicine"}</div>
            </div>
          )}

          {/* Open Dedicated Full-Screen Account Screen */}
          <button
            type="button"
            className="glass-button"
            style={{ width: "100%", padding: "7px", fontSize: "11px", fontWeight: 700, justifyContent: "center" }}
            onClick={() => {
              setPopoverOpen(false);
              if (onOpenAuthScreen) {
                onOpenAuthScreen("profile");
              } else {
                setAuthModalOpen(true);
              }
            }}
          >
            <span>🖥️</span> Open Full Account Screen
          </button>

          {/* Admin Doctor Verification Console Launcher */}
          {profile?.role === "admin" && (
            <button
              type="button"
              className="primary-button"
              style={{
                width: "100%",
                padding: "8px",
                fontSize: "11px",
                fontWeight: 700,
                background: "#0f766e",
                color: "#ffffff",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "6px",
              }}
              onClick={() => {
                setPopoverOpen(false);
                if (onOpenAdmin) {
                  onOpenAdmin();
                } else if (onOpenAuthScreen) {
                  onOpenAuthScreen("admin");
                } else {
                  loadDoctorsForAdmin();
                  setAdminConsoleOpen(true);
                }
              }}
            >
              <span>🛡️</span> System Admin &amp; Doctor Verification
            </button>
          )}

          {profile?.role === "admin" && (
            <button
              type="button"
              className="secondary-button"
              style={{
                width: "100%",
                padding: "8px",
                fontSize: "11px",
                fontWeight: 700,
                background: "#f0fdf4",
                color: "#166534",
                border: "1px solid #86efac",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "6px",
                borderRadius: "8px",
                cursor: "pointer",
              }}
              onClick={() => {
                setPopoverOpen(false);
                if (onOpenSupabase) {
                  onOpenSupabase();
                } else if (typeof window !== "undefined") {
                  window.location.hash = "#supabase";
                }
              }}
            >
              <span>⚡</span> Cloud Database &amp; Storage Console
            </button>
          )}

          <button
            type="button"
            className="secondary-button"
            onClick={signOut}
            disabled={busy}
            style={{ width: "100%", padding: "7px", fontSize: "11px", color: "#dc2626", borderColor: "#fecaca" }}
          >
            {busy ? "Signing out..." : "Sign Out"}
          </button>
        </div>
      )}

      {/* Admin Doctor Verification Modal */}
      {adminConsoleOpen && (
        <div className="auth-modal-backdrop" onClick={() => setAdminConsoleOpen(false)}>
          <div
            className="auth-modal-window"
            style={{ maxWidth: "680px", width: "95%" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-console-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="auth-modal-header">
              <div className="auth-brand">
                <div className="auth-brand-icon">🛡️</div>
                <div>
                  <h2 id="admin-console-title">Doctor Verification Portal</h2>
                  <p>National Medical Commission (NMC) Practitioner Verification</p>
                </div>
              </div>
              <button type="button" className="auth-modal-close" onClick={() => setAdminConsoleOpen(false)}>✕</button>
            </div>

            <div style={{ padding: "14px 20px" }}>
              <p style={{ fontSize: "12px", color: "var(--muted, #64748b)", margin: "0 0 14px" }}>
                As System Administrator (<strong>{ADMIN_EMAIL}</strong>), verify medical practitioners before they are permitted to sign prescriptions and author high-tier clinical evaluations.
              </p>

              <div style={{ display: "grid", gap: "10px", maxHeight: "380px", overflowY: "auto" }}>
                {doctorsList.map((doc) => {
                  const isPending = doc.verification_status === "pending_verification";
                  return (
                    <div
                      key={doc.id}
                      style={{
                        padding: "12px",
                        borderRadius: "10px",
                        border: isPending ? "1.5px solid #f59e0b" : "1px solid #e2e8f0",
                        background: isPending ? "#fffbeb" : "#ffffff",
                        display: "grid",
                        gap: "6px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <strong style={{ fontSize: "13px" }}>{doc.display_name}</strong>
                          <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "6px" }}>({doc.email})</span>
                        </div>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "12px",
                            background: isPending ? "#fef3c7" : "#dcfce7",
                            color: isPending ? "#b45309" : "#15803d",
                          }}
                        >
                          {doc.verification_status?.toUpperCase() || "PENDING"}
                        </span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "11px", color: "#334155" }}>
                        <div><strong>NMC / Reg No:</strong> <code>{doc.medical_reg_no || "NMC-MH-2023"}</code></div>
                        <div><strong>Council:</strong> {doc.council_name || "State Medical Council"}</div>
                        <div><strong>Specialization:</strong> {doc.specialization || "General Medicine"}</div>
                        <div><strong>Facility:</strong> {doc.facility_name || "Field Unit"}</div>
                      </div>

                      {doc.license_document_url && (
                        <div style={{ fontSize: "10px" }}>
                          <a href={doc.license_document_url} target="_blank" rel="noreferrer" style={{ color: "var(--sc-accent, #17644f)", fontWeight: 600 }}>
                            📄 View Uploaded Medical License Proof
                          </a>
                        </div>
                      )}

                      <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                        <button
                          type="button"
                          className="primary-button"
                          style={{ padding: "4px 12px", fontSize: "11px", background: "#166534" }}
                          onClick={() => handleDoctorApproval(doc.id, true)}
                        >
                          ✓ Approve Doctor (Verified)
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          style={{ padding: "4px 10px", fontSize: "11px", color: "#dc2626", borderColor: "#fecaca" }}
                          onClick={() => handleDoctorApproval(doc.id, false)}
                        >
                          ✕ Reject Application
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unified Authentication Modal */}
      {authModalOpen && (
        <div className="auth-modal-backdrop" onClick={() => setAuthModalOpen(false)}>
          <div
            className="auth-modal-window"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "480px" }}
          >
            <div className="auth-modal-header">
              <div className="auth-brand">
                <div className="auth-brand-icon">AR</div>
                <div>
                  <h2 id="auth-modal-title">Arogya Relay</h2>
                  <p>Telehealth & Clinical Field Surveillance</p>
                </div>
              </div>
              <button type="button" className="auth-modal-close" onClick={() => setAuthModalOpen(false)}>✕</button>
            </div>

            {/* Quick Admin Demo Login Banner */}
            <div
              style={{
                margin: "12px 20px 0",
                padding: "8px 12px",
                background: "linear-gradient(135deg, rgba(23, 100, 79, 0.08), rgba(245, 158, 11, 0.08))",
                borderRadius: "10px",
                border: "1px solid rgba(23, 100, 79, 0.2)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <strong style={{ fontSize: "11px", display: "block", color: "#0f172a" }}>🛡️ System Admin Quick Access:</strong>
                <span style={{ fontSize: "10px", color: "#64748b" }}>{ADMIN_EMAIL}</span>
              </div>
              <button
                type="button"
                className="primary-button"
                onClick={handleAdminQuickLogin}
                disabled={busy}
                style={{ padding: "4px 10px", fontSize: "10.5px" }}
              >
                1-Click Sign In
              </button>
            </div>

            {/* Tabs */}
            <div className="auth-tabs" role="tablist" style={{ marginTop: "12px" }}>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === "signin"}
                className={`auth-tab ${authMode === "signin" ? "active" : ""}`}
                onClick={() => { setAuthMode("signin"); setStatus({ tone: "idle", text: "" }); }}
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === "signup"}
                className={`auth-tab ${authMode === "signup" ? "active" : ""}`}
                onClick={() => { setAuthMode("signup"); setStatus({ tone: "idle", text: "" }); }}
              >
                Sign Up
              </button>
            </div>

            {status.text && (
              <div className={`auth-alert ${status.tone}`} role="alert" style={{ margin: "10px 20px 0" }}>
                {status.tone === "error" ? "⚠️ " : "✓ "} {status.text}
              </div>
            )}

            {authMode === "signin" ? (
              <form className="auth-body-form" onSubmit={handleSignIn} style={{ padding: "16px 20px" }}>
                <div className="auth-field">
                  <label htmlFor="auth-email">Email Address</label>
                  <input
                    id="auth-email"
                    type="email"
                    name="email"
                    defaultValue={ADMIN_EMAIL}
                    placeholder="doctor@health.gov.in"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="auth-field">
                  <div className="auth-field-header">
                    <label htmlFor="auth-password">Password</label>
                    <button type="button" className="auth-peek-btn" onClick={() => setShowPassword((p) => !p)}>
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                </div>

                <div className="auth-submit-row">
                  <button type="submit" className="auth-primary-submit" disabled={busy}>
                    {busy ? "Authenticating..." : "Sign In to Field Dashboard"}
                  </button>
                </div>
              </form>
            ) : (
              <form className="auth-body-form" onSubmit={handleSignUp} style={{ padding: "14px 20px", maxHeight: "420px", overflowY: "auto" }}>
                <div className="auth-field">
                  <label htmlFor="auth-reg-name">Full Name</label>
                  <input id="auth-reg-name" type="text" name="displayName" placeholder="e.g. Priya Sharma or Dr. Ananya Roy" required />
                </div>

                <div className="auth-field">
                  <label htmlFor="auth-reg-email">Email Address</label>
                  <input id="auth-reg-email" type="email" name="email" placeholder="user@domain.org" required />
                </div>

                <div className="auth-field">
                  <label htmlFor="auth-reg-pass">Create Password (min. 6 characters)</label>
                  <input id="auth-reg-pass" type="password" name="password" placeholder="••••••••" minLength={6} required />
                </div>

                {/* Role Selection */}
                <div className="auth-field">
                  <label>I am signing up as</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "4px" }}>
                    {ROLES.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedRole(r.id as any)}
                        style={{
                          padding: "8px",
                          borderRadius: "8px",
                          border: selectedRole === r.id ? "2px solid var(--sc-accent, #17644f)" : "1px solid #cbd5e1",
                          background: selectedRole === r.id ? "rgba(23, 100, 79, 0.08)" : "#ffffff",
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ fontSize: "14px" }}>{r.icon}</span>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#0f172a" }}>{r.label}</div>
                        <small style={{ fontSize: "9px", color: "#64748b" }}>{r.desc}</small>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Patient Role Info */}
                {selectedRole === "patient" && (
                  <div style={{ background: "#f0fdf4", padding: "10px 12px", borderRadius: "10px", border: "1px solid #bbf7d0", margin: "8px 0" }}>
                    <p style={{ margin: 0, fontSize: "11.5px", color: "#166534", lineHeight: 1.4 }}>
                      👤 <strong>Citizen Account:</strong> Access your personal health pass, tele-consult doctors, browse Jan Aushadhi generic remedies, and store verified digital prescriptions.
                    </p>
                  </div>
                )}

                {/* Chemist Role Fields */}
                {selectedRole === "chemist" && (
                  <div style={{ background: "#eff6ff", padding: "12px", borderRadius: "10px", border: "1.5px dashed #3b82f6", margin: "8px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                      <span style={{ fontSize: "15px" }}>🏪</span>
                      <strong style={{ fontSize: "11.5px", color: "#1d4ed8" }}>Jan Aushadhi / Pharmacy Store Information</strong>
                    </div>
                    <div style={{ display: "grid", gap: "8px" }}>
                      <div className="auth-field">
                        <label>Pharmacy / Jan Aushadhi Store Name *</label>
                        <input
                          type="text"
                          name="facilityName"
                          placeholder="e.g. PMBJP Jan Aushadhi Kendra #104, Shillong"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Health Worker Role Fields */}
                {selectedRole === "health_worker" && (
                  <div style={{ background: "#fdf4ff", padding: "12px", borderRadius: "10px", border: "1.5px dashed #c026d3", margin: "8px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                      <span style={{ fontSize: "15px" }}>👩‍⚕️</span>
                      <strong style={{ fontSize: "11.5px", color: "#86198f" }}>ASHA / Field Center Details</strong>
                    </div>
                    <div style={{ display: "grid", gap: "8px" }}>
                      <div className="auth-field">
                        <label>Sub-Centre / Primary Health Centre (PHC) *</label>
                        <input
                          type="text"
                          name="facilityName"
                          placeholder="e.g. Pynursla Sub-Centre Unit 2"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Doctor Verification Required Fields */}
                {selectedRole === "doctor" && (
                  <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1.5px dashed #0284c7", margin: "8px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                      <span style={{ fontSize: "15px" }}>🩺</span>
                      <strong style={{ fontSize: "11.5px", color: "#0369a1" }}>Doctor Medical Verification (NMC / SMC)</strong>
                    </div>
                    <p style={{ fontSize: "10px", color: "#475569", margin: "0 0 10px" }}>
                      Prescription authorization requires verified National Medical Commission registration.
                    </p>

                    <div style={{ display: "grid", gap: "8px" }}>
                      <div className="auth-field">
                        <label>NMC / State Medical Council Reg. Number *</label>
                        <input
                          type="text"
                          value={docNmcNumber}
                          onChange={(e) => setDocNmcNumber(e.target.value)}
                          placeholder="e.g. NMC-2023-99412 or SMC/MH/18492"
                          required
                        />
                      </div>

                      <div className="auth-field">
                        <label>Medical Council</label>
                        <input
                          type="text"
                          value={docCouncil}
                          onChange={(e) => setDocCouncil(e.target.value)}
                          placeholder="e.g. National Medical Commission / Maharashtra Medical Council"
                        />
                      </div>

                      <div className="auth-field">
                        <label>Clinical Specialization</label>
                        <input
                          type="text"
                          value={docSpecialization}
                          onChange={(e) => setDocSpecialization(e.target.value)}
                          placeholder="e.g. General Medicine, Pediatrics, Community Health"
                        />
                      </div>

                      <div className="auth-field">
                        <label>Hospital / PHC / Clinic Affiliation</label>
                        <input
                          type="text"
                          value={docHospital}
                          onChange={(e) => setDocHospital(e.target.value)}
                          placeholder="e.g. Pynursla Community Health Centre"
                        />
                      </div>

                      <div className="auth-field">
                        <label>Upload Medical Registration Certificate / ID (PDF/JPG)</label>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => setDocProofFile(e.target.files?.[0] || null)}
                          style={{ fontSize: "11px" }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="auth-submit-row" style={{ marginTop: "12px" }}>
                  <button type="submit" className="auth-primary-submit" disabled={busy}>
                    {busy
                      ? "Creating Account…"
                      : selectedRole === "doctor"
                      ? "Sign Up as Medical Doctor →"
                      : selectedRole === "health_worker"
                      ? "Sign Up as Health Worker / ASHA →"
                      : selectedRole === "chemist"
                      ? "Sign Up as Chemist / Pharmacist →"
                      : "Sign Up as Citizen / Patient →"}
                  </button>
                </div>
              </form>
            )}

            <div className="auth-modal-footer">
              <span className="auth-lock-note">🔒 Encrypted Clinical Session & Local SQLite Fallback</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Backward-compatible UserHeaderPill export
 */
export function UserHeaderPill() {
  return <TopRightUserNav />;
}
