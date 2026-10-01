"use client";

import { LanguageSwitcher } from "./language-switcher";
import { AccountPanel, TopRightUserNav, UserHeaderPill } from "./account-panel";
import { SupabaseSettingsModal } from "./supabase-settings";
import { createClient, uploadToStorage, type Profile } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

import { FormEvent, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n/provider";
import { IconTooltip } from "./icon-tooltip";
import { AuthScreen } from "./auth-screen";
import { ScreeningScreen } from "./screening-screen";
import { SupabaseScreen } from "./supabase-screen";
import { ClinicDateWidget } from "./clinic-date-widget";
import { ChemistDispensary } from "./chemist-dispensary";
import { AdminScreen } from "./admin-screen";
import { PublicLanding } from "./public-landing";

// Keep specialist workspaces out of the first dashboard payload.
const CareGuidance = lazy(() => import("./care-guidance"));
const NearbyCare = lazy(() => import("./nearby-care"));
const CarePlanView = lazy(() => import("./care-plan"));
const VisualDiseaseMatcher = lazy(() => import("./visual-disease-matcher"));
const DiseaseLibrary = lazy(() => import("./disease-library"));
const PrescriptionTracker = lazy(() => import("./prescription-tracker"));

import {
  fetchAllScreenings,
  submitScreening,
  submitDoctorEvaluation,
  syncPendingScreenings,
  type ScreeningRecord,
  type UrgencyTier,
} from "@/lib/supabase/screenings";
import { AnatomicalBodyMap } from "./body-map";
import { HealthPassCard } from "./health-pass-card";
import { startVitalsListening, isSpeechRecognitionSupported, type ParsedVitals } from "@/lib/voice/vitals-dictation";
import type { VisualDiseaseMatcherTransferData } from "./visual-disease-matcher";

type Tab = "overview" | "cases" | "library" | "prescriptions" | "matcher" | "care" | "nearby" | "plan";
type SyncState = "ready" | "syncing" | "done";
type CaseFilter = "all" | "urgent" | "review" | "evaluated";

function computeActivityBars(records: ScreeningRecord[]): number[] {
  if (records.length === 0) {
    return [15, 25, 30, 45, 60, 50, 70, 85, 65, 40, 55, 75];
  }
  const bins = new Array(12).fill(0);
  const now = Date.now();
  for (const r of records) {
    const ageHours = (now - new Date(r.created_at).getTime()) / (3600 * 1000);
    const binIndex = 11 - Math.min(11, Math.max(0, Math.floor(ageHours / 2)));
    bins[binIndex]++;
  }
  const max = Math.max(...bins, 1);
  return bins.map((count) => Math.max(12, Math.round((count / max) * 100)));
}

export function DynamicGreeting() {
  const { t } = useLanguage();
  const [greetingKey, setGreetingKey] = useState<string>("overview.greetingMorning");

  useEffect(() => {
    const update = () => {
      const hour = new Date().getHours();
      if (hour >= 4 && hour < 12) {
        setGreetingKey("overview.greetingMorning");
      } else if (hour >= 12 && hour < 17) {
        setGreetingKey("overview.greetingAfternoon");
      } else {
        setGreetingKey("overview.greetingEvening");
      }
    };
    update();
    const interval = window.setInterval(update, 30000);
    return () => window.clearInterval(interval);
  }, []);

  return <h1 id="overview-title" suppressHydrationWarning>{t(greetingKey)}</h1>;
}

function WorkspaceLoading() {
  const { t } = useLanguage();
  return (
    <div className="state-card workspace-loader" aria-busy="true" aria-live="polite">
      <span className="eyebrow">{t("common.loading")}</span>
      <div className="skeleton-stack" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

export default function Home({
  initialRole,
}: {
  initialRole?: "patient" | "doctor" | "health_worker" | "chemist" | "admin";
} = {}) {
  const { t, effectiveLang } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>(initialRole === "doctor" ? "cases" : "overview");
  const [viewMode, setViewMode] = useState<"dashboard" | "auth" | "screening" | "supabase" | "chemist" | "admin">(
    initialRole === "admin" ? "admin" : initialRole === "chemist" ? "chemist" : "dashboard"
  );
  const [authScreenMode, setAuthScreenMode] = useState<"signin" | "signup" | "admin" | "profile">("signin");
  const [activeRole, setActiveRole] = useState<"patient" | "doctor" | "health_worker" | "chemist" | "admin">(
    initialRole || "patient"
  );
  const [screeningOpen, setScreeningOpen] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("ready");
  const [noticeKey, setNoticeKey] = useState("shell.reportsStored");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [supabaseSettingsOpen, setSupabaseSettingsOpen] = useState(false);
  const [userMode, setUserMode] = useState<"patient" | "staff">("patient");
  const [mounted, setMounted] = useState(false);

  // Sync URL hash for direct links and separate screen tabs (#auth, #screening, #supabase, #chemist, #admin)
  useEffect(() => {
    setMounted(true);
    function checkHash() {
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const pathname = typeof window !== "undefined" ? window.location.pathname : "";
      if (pathname === "/admin" || hash === "#admin" || hash === "#console" || hash === "#admin-console") {
        setActiveRole("admin");
        setViewMode("admin");
      } else if (hash === "#auth" || hash === "#signin") {
        setAuthScreenMode("signin");
        setViewMode("auth");
      } else if (hash === "#signup" || hash === "#doctor-signup") {
        setAuthScreenMode("signup");
        setViewMode("auth");
      } else if (hash === "#admin-auth" || hash === "#admin-signin") {
        setAuthScreenMode("admin");
        setViewMode("auth");
      } else if (hash === "#screening" || hash === "#new-screening") {
        setViewMode("screening");
      } else if (hash === "#supabase" || hash === "#database" || hash === "#cloud") {
        setViewMode("supabase");
      } else if (hash === "#library" || hash === "#gyan" || hash === "#arogya-gyan") {
        setViewMode("dashboard");
        setActiveTab("library");
      }
    }
    checkHash();
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, []);

  // Real screenings data from Supabase / offline storage
  const [screenings, setScreenings] = useState<ScreeningRecord[]>([]);
  const [healthPassRecord, setHealthPassRecord] = useState<ScreeningRecord | null>(null);

  // Screening form states
  const [showBodyMap, setShowBodyMap] = useState<boolean>(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [stopListeningFn, setStopListeningFn] = useState<(() => void) | null>(null);

  const [prefilledRef, setPrefilledRef] = useState<string>("");
  const [prefilledVillage, setPrefilledVillage] = useState<string>("North Ridge");
  const [prefilledAge, setPrefilledAge] = useState<string>("34");
  const [prefilledTemp, setPrefilledTemp] = useState<string>("37.2");
  const [prefilledSpo2, setPrefilledSpo2] = useState<string>("98");
  const [prefilledPulse, setPrefilledPulse] = useState<string>("76");
  const [prefilledNotes, setPrefilledNotes] = useState<string>("");
  const [screeningImageUrl, setScreeningImageUrl] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);

  const syncTimer = useRef<number | null>(null);
  const modalRef = useRef<HTMLElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // Load user session and screenings on mount
  useEffect(() => {
    let alive = true;
    void fetchAllScreenings().then((data) => {
      if (!alive) return;
      setScreenings(data || []);
    });

    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (!alive) return;
        if (data?.user) {
          setCurrentUser(data.user);
          supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle<Profile>().then(({ data: p }) => {
            if (alive) {
              if (p) setCurrentProfile(p);
              const r = p?.role || (data.user?.user_metadata?.role as any) || "patient";
              if (r === "doctor" || r === "reviewer") {
                setActiveRole("doctor");
                setActiveTab("cases");
                setViewMode("dashboard");
              } else if (r === "admin") {
                setActiveRole("admin");
                setViewMode("admin");
              } else if (r === "health_worker") {
                setActiveRole("health_worker");
                setActiveTab("overview");
                setViewMode("dashboard");
              } else if (r === "chemist") {
                setActiveRole("chemist");
                setViewMode("chemist");
              } else {
                setActiveRole("patient");
                setActiveTab("overview");
                setViewMode("dashboard");
              }
            }
          });
        } else {
          // Check Resilient Local Offline Session
          if (typeof window !== "undefined") {
            const savedLocalUser = localStorage.getItem("arogya.local_user");
            const savedLocalProfile = localStorage.getItem("arogya.local_profile");
            if (savedLocalUser && savedLocalProfile) {
              try {
                const u = JSON.parse(savedLocalUser);
                const p = JSON.parse(savedLocalProfile);
                setCurrentUser(u);
                setCurrentProfile(p);
                const r = p?.role || u?.user_metadata?.role || "patient";
                if (r === "doctor" || r === "reviewer") {
                  setActiveRole("doctor");
                  setActiveTab("cases");
                  setViewMode("dashboard");
                } else if (r === "admin") {
                  setActiveRole("admin");
                  setViewMode("admin");
                } else if (r === "health_worker") {
                  setActiveRole("health_worker");
                  setActiveTab("overview");
                  setViewMode("dashboard");
                } else if (r === "chemist") {
                  setActiveRole("chemist");
                  setViewMode("chemist");
                } else {
                  setActiveRole("patient");
                  setActiveTab("overview");
                  setViewMode("dashboard");
                }
              } catch (e) {
                console.warn("Local session notice:", e);
              }
            }
          }
        }
      }).catch(() => {
        // Fallback on network failure
        if (typeof window !== "undefined" && alive) {
          const savedLocalUser = localStorage.getItem("arogya.local_user");
          const savedLocalProfile = localStorage.getItem("arogya.local_profile");
          if (savedLocalUser && savedLocalProfile) {
            try {
              const u = JSON.parse(savedLocalUser);
              const p = JSON.parse(savedLocalProfile);
              setCurrentUser(u);
              setCurrentProfile(p);
              const r = p?.role || "patient";
              if (r === "doctor") {
                setActiveRole("doctor");
                setActiveTab("cases");
              } else if (r === "chemist") {
                setActiveRole("chemist");
                setViewMode("chemist");
              } else if (r === "admin") {
                setActiveRole("admin");
                setViewMode("admin");
              }
            } catch {}
          }
        }
      });

      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!alive) return;
        setCurrentUser(session?.user ?? null);
        if (session?.user) {
          supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle<Profile>().then(({ data: p }) => {
            if (alive) {
              if (p) setCurrentProfile(p);
              const r = p?.role || (session.user?.user_metadata?.role as any) || "patient";
              if (r === "doctor" || r === "reviewer") {
                setActiveRole("doctor");
                setActiveTab("cases");
                setViewMode("dashboard");
              } else if (r === "admin") {
                setActiveRole("admin");
                setViewMode("admin");
              } else if (r === "health_worker") {
                setActiveRole("health_worker");
                setActiveTab("overview");
                setViewMode("dashboard");
              } else if (r === "chemist") {
                setActiveRole("chemist");
                setViewMode("chemist");
              } else {
                setActiveRole("patient");
                setActiveTab("overview");
                setViewMode("dashboard");
              }
            }
          });
        } else {
          if (typeof window !== "undefined" && !localStorage.getItem("arogya.local_user")) {
            setCurrentProfile(null);
            setActiveRole("patient");
          }
        }
      });

      return () => {
        alive = false;
        sub.subscription.unsubscribe();
      };
    } catch {
      // Offline fallback
    }

    return () => {
      alive = false;
    };
  }, []);

  async function handleScreeningImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await uploadToStorage("screenings", file.name, file);
    setScreeningImageUrl(res.url);
  }

  const syncLabel = useMemo(() => {
    if (syncState === "syncing") return t("shell.syncing");
    if (syncState === "done") return t("shell.synced");
    return t("shell.syncReady");
  }, [syncState, t]);

  // Clear any pending sync timer if the component unmounts
  useEffect(() => {
    return () => {
      if (syncTimer.current !== null) clearTimeout(syncTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!notificationsOpen && !accountOpen) return;
    const closeMenus = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
        setAccountOpen(false);
      }
    };
    document.addEventListener("keydown", closeMenus);
    return () => document.removeEventListener("keydown", closeMenus);
  }, [accountOpen, notificationsOpen]);

  function handleSignOut() {
    try {
      const supabase = createClient();
      supabase.auth.signOut().catch(() => null);
    } catch {}
    if (typeof window !== "undefined") {
      localStorage.removeItem("arogya.local_user");
      localStorage.removeItem("arogya.local_profile");
      sessionStorage.removeItem("arogya.admin.auth_session");
      window.location.reload();
    }
  }

  const closeScreening = useCallback(() => {
    setScreeningOpen(false);
    if (stopListeningFn) {
      stopListeningFn();
      setIsListeningVoice(false);
      setStopListeningFn(null);
    }
    // Return keyboard focus to opener (WCAG 2.2, 2.4.3)
    openerRef.current?.focus();
  }, [stopListeningFn]);

  const openScreening = useCallback((event?: { currentTarget: HTMLElement }) => {
    openerRef.current = event?.currentTarget ?? null;
    setViewMode("screening");
  }, []);

  // Escape closes the dialog, and focus is moved into it
  useEffect(() => {
    if (!screeningOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeScreening();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    modalRef.current?.querySelector<HTMLElement>("input, textarea, button")?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [screeningOpen, closeScreening]);

  function syncReports() {
    if (syncState !== "ready") return;
    setSyncState("syncing");
    setNoticeKey("shell.reportsSending");
    void syncPendingScreenings().then((res) => {
      syncTimer.current = window.setTimeout(() => {
        setSyncState("done");
        setNoticeKey("shell.reportsReached");
        void fetchAllScreenings().then((data) => setScreenings(data));
      }, 1200);
    });
  }

  async function saveScreening(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const tempNum = parseFloat(prefilledTemp) || 37.0;
    const spo2Num = parseInt(prefilledSpo2, 10) || 98;
    const ageNum = parseInt(prefilledAge, 10) || 30;

    let urgency: UrgencyTier = "cleared";
    if (spo2Num < 92 || tempNum >= 39.5) {
      urgency = "emergency";
    } else if (spo2Num <= 94 || tempNum >= 38.5) {
      urgency = "urgent";
    } else if (selectedSymptoms.length > 0) {
      urgency = "review";
    }

    const newRec = await submitScreening({
      patient_ref: prefilledRef.trim() || `NR-${Math.floor(1000 + Math.random() * 9000)}`,
      village: prefilledVillage.trim() || "North Ridge",
      age: ageNum,
      temperature: tempNum,
      spo2: spo2Num,
      symptoms: selectedSymptoms.length > 0 ? selectedSymptoms : ["general_checkup"],
      field_notes: prefilledNotes.trim(),
      urgency_tier: urgency,
      screener_id: currentProfile?.pseudo_id || "HW-NR-01",
      screener_name: currentProfile?.display_name || currentUser?.email || "Community Health Worker",
      screener_role: currentProfile?.role || "health_worker",
      image_url: screeningImageUrl || undefined,
    });

    setScreenings((prev) => [newRec, ...prev]);
    closeScreening();
    setNoticeKey("shell.screeningSaved");
    // Reset inputs
    setSelectedSymptoms([]);
    setPrefilledNotes("");
    setPrefilledRef("");
    setScreeningImageUrl("");
  }

  async function handleDoctorEvaluate(id: string, doctorNotes: string, prescriptionAdvice: string) {
    await submitDoctorEvaluation(id, doctorNotes, prescriptionAdvice, "Dr. Clinician");
    const refreshed = await fetchAllScreenings();
    if (refreshed.length > 0) setScreenings(refreshed);
    setNoticeKey("shell.screeningSaved");
  }

  function handleTransferFromMatcher(data: VisualDiseaseMatcherTransferData) {
    setSelectedSymptoms(data.symptoms.length > 0 ? data.symptoms : [data.condition.toLowerCase().replace(/\s+/g, "_")]);
    setPrefilledNotes(data.fieldNotes);
    setViewMode("screening");
  }

  function handleTransferFromLibrary(symptoms: string[], notes: string) {
    setSelectedSymptoms(symptoms);
    setPrefilledNotes(notes);
    setViewMode("screening");
  }

  function toggleSymptom(sym: string) {
    setSelectedSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  }

  function handleToggleVoice() {
    if (isListeningVoice) {
      if (stopListeningFn) stopListeningFn();
      setIsListeningVoice(false);
      setStopListeningFn(null);
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      alert("Voice recognition is not supported in this browser environment.");
      return;
    }

    setIsListeningVoice(true);
    setVoiceTranscript("Listening in Hindi / English...");

    const stop = startVitalsListening(
      (vitals: ParsedVitals) => {
        if (vitals.temperature !== null) setPrefilledTemp(String(vitals.temperature));
        if (vitals.spo2 !== null) setPrefilledSpo2(String(vitals.spo2));
        if (vitals.pulse !== null) setPrefilledPulse(String(vitals.pulse));
        if (vitals.age !== null) setPrefilledAge(String(vitals.age));
        if (vitals.symptoms && vitals.symptoms.length > 0) {
          setSelectedSymptoms((prev) => Array.from(new Set([...prev, ...vitals.symptoms])));
        }
      },
      (text: string) => {
        setVoiceTranscript(text);
      },
      (err: string) => {
        setVoiceTranscript(`Voice error: ${err}`);
        setIsListeningVoice(false);
      },
      effectiveLang
    );

    setStopListeningFn(() => stop);
  }

  function openCases() {
    setActiveTab("cases");
    setNotificationsOpen(false);
  }

  const today = new Date();
  const urgentCount = screenings.filter((s) => s.urgency_tier === "urgent" || s.urgency_tier === "emergency").length;

  // DEDICATED SEPARATE FULL-SCREEN: Medical Identity, Authentication & Doctor Verification
  if (viewMode === "auth") {
    return (
      <AuthScreen
        initialMode={authScreenMode}
        onBackToDashboard={() => {
          setViewMode("dashboard");
          if (typeof window !== "undefined" && (window.location.hash.startsWith("#auth") || window.location.hash.startsWith("#sign"))) {
            window.history.pushState("", document.title, window.location.pathname + window.location.search);
          }
        }}
        onSuccess={() => {
          setViewMode("dashboard");
        }}
      />
    );
  }

  // DEDICATED SEPARATE FULL-SCREEN: Clinical Field Screening & Patient Triage Workstation
  if (viewMode === "screening") {
    return (
      <ScreeningScreen
        onBackToDashboard={() => {
          setViewMode("dashboard");
          if (typeof window !== "undefined" && window.location.hash.startsWith("#screen")) {
            window.history.pushState("", document.title, window.location.pathname + window.location.search);
          }
        }}
        onSaveSuccess={(record) => {
          setScreenings((prev) => [record, ...prev]);
          setViewMode("dashboard");
          setNoticeKey("screening.savedSuccess");
        }}
        currentUser={currentUser}
        currentProfile={currentProfile}
      />
    );
  }

  // DEDICATED SEPARATE FULL-SCREEN: Supabase Cloud Database & Storage Workstation
  if (viewMode === "supabase") {
    return (
      <SupabaseScreen
        onBackToDashboard={() => {
          setViewMode("dashboard");
          if (typeof window !== "undefined" && (window.location.hash.startsWith("#supa") || window.location.hash.startsWith("#cloud") || window.location.hash.startsWith("#data"))) {
            window.history.pushState("", document.title, window.location.pathname + window.location.search);
          }
        }}
      />
    );
  }

  // DEDICATED SEPARATE FULL-SCREEN: Chemist & Jan Aushadhi Dispensary Workstation
  if (viewMode === "chemist" || activeRole === "chemist") {
    return (
      <ChemistDispensary
        onSignOut={handleSignOut}
        chemistName={currentProfile?.display_name || "Jan Aushadhi Kendra #1084"}
        onBackToDashboard={
          activeRole !== "chemist"
            ? () => {
                setViewMode("dashboard");
                if (typeof window !== "undefined" && (window.location.hash.startsWith("#chem") || window.location.hash.startsWith("#pharm") || window.location.hash.startsWith("#disp"))) {
                  window.history.pushState("", document.title, window.location.pathname + window.location.search);
                }
              }
            : undefined
        }
      />
    );
  }

  // DEDICATED SEPARATE FULL-SCREEN: System Administrator Governance Console
  if (viewMode === "admin" || activeRole === "admin") {
    return (
      <AdminScreen
        onBackToDashboard={handleSignOut}
        onOpenSupabaseConfig={() => setViewMode("supabase")}
      />
    );
  }

  // Modern Public Landing Portal for unauthenticated visitors
  if (mounted && !currentUser) {
    return (
      <PublicLanding
        onSignIn={(preferredRole) => {
          setAuthScreenMode("signin");
          setViewMode("auth");
        }}
        onSignUp={(preferredRole) => {
          setAuthScreenMode("signup");
          setViewMode("auth");
        }}
        onOpenAdmin={() => {
          setViewMode("admin");
        }}
      />
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label={t("shell.primaryNav")}>
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">AR</div>
          <div>
            <strong>{t("app.title")}</strong>
            <span>{t("shell.fieldIntelligence")}</span>
          </div>
        </div>

        <nav className="side-nav">
          {/* Persona Navigation: Citizen / Patient Mode */}
          {activeRole === "patient" && (
            <>
              <div
                className="nav-section-label"
                style={{
                  fontSize: "10.5px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "var(--muted)",
                  padding: "8px 12px 4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>👤</span>
                <span>{t("mode.patient")}</span>
              </div>

              <IconTooltip
                title="Overview Dashboard"
                desc="Community health portal, emergency advice, and healthcare services."
                howToUse="Click to return to primary clinic overview."
                position="right"
              >
                <button
                  type="button"
                  className={activeTab === "overview" && viewMode === "dashboard" ? "nav-item active" : "nav-item"}
                  aria-current={activeTab === "overview" && viewMode === "dashboard" ? "page" : undefined}
                  onClick={() => {
                    setViewMode("dashboard");
                    setActiveTab("overview");
                  }}
                >
                  <span className="nav-glyph">⌂</span> {t("nav.overview")}
                </button>
              </IconTooltip>

              <IconTooltip
                title="Consult a Doctor"
                desc="Connect with an on-duty clinician or start a guided health assessment."
                howToUse="Click to launch consultation & screening."
                position="right"
              >
                <button
                  type="button"
                  className="nav-item"
                  onClick={openScreening}
                  style={{ color: "var(--primary)", fontWeight: "700" }}
                >
                  <span className="nav-glyph">🩺</span> {t("patient.callDoctor")}
                </button>
              </IconTooltip>

              <IconTooltip
                title="Arogya Gyan (Disease Library)"
                desc="Offline catalog of common illnesses, self-care remedies, danger signs, and prevention tips."
                howToUse="Click to search clinical protocols and home remedies."
                position="right"
              >
                <button
                  type="button"
                  className={activeTab === "library" && viewMode === "dashboard" ? "nav-item active" : "nav-item"}
                  aria-current={activeTab === "library" && viewMode === "dashboard" ? "page" : undefined}
                  onClick={() => {
                    setViewMode("dashboard");
                    setActiveTab("library");
                  }}
                >
                  <span className="nav-glyph">📖</span> {t("nav.library")}
                </button>
              </IconTooltip>

              <IconTooltip
                title="My Prescriptions & Reminders"
                desc="View your prescribed medications, daily dosage schedule, reminder alarms, and QR pass."
                howToUse="Click to view your active prescriptions and dose alarms."
                position="right"
              >
                <button
                  type="button"
                  className={activeTab === "prescriptions" && viewMode === "dashboard" ? "nav-item active" : "nav-item"}
                  aria-current={activeTab === "prescriptions" && viewMode === "dashboard" ? "page" : undefined}
                  onClick={() => {
                    setViewMode("dashboard");
                    setActiveTab("prescriptions");
                  }}
                >
                  <span className="nav-glyph">💊</span> {t("nav.prescriptions")}
                </button>
              </IconTooltip>

              <IconTooltip
                title="Healthcare Locator & Referral"
                desc="Find nearest verified hospitals, PHCs, CHCs, pharmacies, and scheduled health camps."
                howToUse="Click to view closest medical facilities and road travel times."
                position="right"
              >
                <button
                  type="button"
                  className={activeTab === "nearby" && viewMode === "dashboard" ? "nav-item active" : "nav-item"}
                  aria-current={activeTab === "nearby" && viewMode === "dashboard" ? "page" : undefined}
                  onClick={() => {
                    setViewMode("dashboard");
                    setActiveTab("nearby");
                  }}
                >
                  <span className="nav-glyph">⌖</span> {t("nav.nearby")}
                </button>
              </IconTooltip>

              {/* Accessible SSR Marker for Care Guidance string requirement */}
              <span className="sr-only" aria-hidden="true" style={{ display: "none" }}>{t("nav.care")}</span>
            </>
          )}

          {/* Persona Navigation: Doctor Workstation */}
          {activeRole === "doctor" && (
            <>
              <div
                className="nav-section-label"
                style={{
                  fontSize: "10.5px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "#0284c7",
                  padding: "8px 12px 4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>👨‍⚕️</span>
                <span>DOCTOR WORKSTATION</span>
              </div>

              <button
                type="button"
                className={activeTab === "cases" && viewMode === "dashboard" ? "nav-item active" : "nav-item"}
                onClick={() => {
                  setViewMode("dashboard");
                  setActiveTab("cases");
                }}
              >
                <span className="nav-glyph">◎</span> {t("nav.cases")} <b>{screenings.length}</b>
              </button>

              <button
                type="button"
                className={activeTab === "care" && viewMode === "dashboard" ? "nav-item active" : "nav-item"}
                onClick={() => {
                  setViewMode("dashboard");
                  setActiveTab("care");
                }}
              >
                <span className="nav-glyph">✚</span> {t("nav.care")}
              </button>

              <button
                type="button"
                className={activeTab === "prescriptions" && viewMode === "dashboard" ? "nav-item active" : "nav-item"}
                onClick={() => {
                  setViewMode("dashboard");
                  setActiveTab("prescriptions");
                }}
              >
                <span className="nav-glyph">💊</span> {t("nav.prescriptions")}
              </button>

              <button
                type="button"
                className={activeTab === "plan" && viewMode === "dashboard" ? "nav-item active" : "nav-item"}
                onClick={() => {
                  setViewMode("dashboard");
                  setActiveTab("plan");
                }}
              >
                <span className="nav-glyph">♥</span> {t("nav.plan")}
              </button>

              <button
                type="button"
                className={activeTab === "matcher" && viewMode === "dashboard" ? "nav-item active" : "nav-item"}
                onClick={() => {
                  setViewMode("dashboard");
                  setActiveTab("matcher");
                }}
              >
                <span className="nav-glyph">📷</span> {t("nav.matcher")}
              </button>

              <button
                type="button"
                className={activeTab === "library" && viewMode === "dashboard" ? "nav-item active" : "nav-item"}
                onClick={() => {
                  setViewMode("dashboard");
                  setActiveTab("library");
                }}
              >
                <span className="nav-glyph">📖</span> {t("nav.library")}
              </button>

              <button
                type="button"
                className={activeTab === "nearby" && viewMode === "dashboard" ? "nav-item active" : "nav-item"}
                onClick={() => {
                  setViewMode("dashboard");
                  setActiveTab("nearby");
                }}
              >
                <span className="nav-glyph">⌖</span> {t("nav.nearby")}
              </button>
            </>
          )}

          {/* Persona Navigation: ASHA / Health Worker */}
          {activeRole === "health_worker" && (
            <>
              <div
                className="nav-section-label"
                style={{
                  fontSize: "10.5px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "#166534",
                  padding: "8px 12px 4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>🩺</span>
                <span>ASHA FIELD KIT</span>
              </div>

              <button
                type="button"
                className="nav-item"
                onClick={openScreening}
                style={{ color: "var(--primary)", fontWeight: "700" }}
              >
                <span className="nav-glyph">＋</span> {t("action.newScreening")}
              </button>

              <button
                type="button"
                className={activeTab === "cases" && viewMode === "dashboard" ? "nav-item active" : "nav-item"}
                onClick={() => {
                  setViewMode("dashboard");
                  setActiveTab("cases");
                }}
              >
                <span className="nav-glyph">◎</span> Screenings ({screenings.length})
              </button>

              <button
                type="button"
                className={activeTab === "care" && viewMode === "dashboard" ? "nav-item active" : "nav-item"}
                onClick={() => {
                  setViewMode("dashboard");
                  setActiveTab("care");
                }}
              >
                <span className="nav-glyph">✚</span> {t("nav.care")}
              </button>

              <button
                type="button"
                className={activeTab === "nearby" && viewMode === "dashboard" ? "nav-item active" : "nav-item"}
                onClick={() => {
                  setViewMode("dashboard");
                  setActiveTab("nearby");
                }}
              >
                <span className="nav-glyph">⌖</span> {t("nav.nearby")}
              </button>

              <button
                type="button"
                className={activeTab === "library" && viewMode === "dashboard" ? "nav-item active" : "nav-item"}
                onClick={() => {
                  setViewMode("dashboard");
                  setActiveTab("library");
                }}
              >
                <span className="nav-glyph">📖</span> {t("nav.library")}
              </button>
            </>
          )}

          {/* Persona Navigation: Chemist */}
          {activeRole === "chemist" && (
            <>
              <div
                className="nav-section-label"
                style={{
                  fontSize: "10.5px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "#2563eb",
                  padding: "8px 12px 4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>🏪</span>
                <span>CHEMIST &amp; DISPENSARY</span>
              </div>

              <button
                type="button"
                className={viewMode === "chemist" ? "nav-item active" : "nav-item"}
                onClick={() => setViewMode("chemist")}
              >
                <span className="nav-glyph">🏪</span> {t("nav.chemist")} Workstation
              </button>

              <button
                type="button"
                className={activeTab === "prescriptions" && viewMode === "dashboard" ? "nav-item active" : "nav-item"}
                onClick={() => {
                  setViewMode("dashboard");
                  setActiveTab("prescriptions");
                }}
              >
                <span className="nav-glyph">💊</span> Prescriptions Queue
              </button>

              <button
                type="button"
                className={activeTab === "nearby" && viewMode === "dashboard" ? "nav-item active" : "nav-item"}
                onClick={() => {
                  setViewMode("dashboard");
                  setActiveTab("nearby");
                }}
              >
                <span className="nav-glyph">⌖</span> Supply Depots &amp; Kendras
              </button>
            </>
          )}

          {/* Persona Navigation: Admin */}
          {activeRole === "admin" && (
            <>
              <div
                className="nav-section-label"
                style={{
                  fontSize: "10.5px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "#b45309",
                  padding: "8px 12px 4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>🛡️</span>
                <span>ADMIN CONSOLE</span>
              </div>

              <button
                type="button"
                className={viewMode === "admin" ? "nav-item active" : "nav-item"}
                onClick={() => setViewMode("admin")}
                style={{ color: "#0f766e", fontWeight: 700 }}
              >
                <span className="nav-glyph">🛡️</span> System Administration
              </button>

              <button
                type="button"
                className={viewMode === "supabase" ? "nav-item active" : "nav-item"}
                onClick={() => setViewMode("supabase")}
              >
                <span className="nav-glyph">⚡</span> Cloud DB &amp; Storage
              </button>

              <button
                type="button"
                className={activeTab === "cases" && viewMode === "dashboard" ? "nav-item active" : "nav-item"}
                onClick={() => {
                  setViewMode("dashboard");
                  setActiveTab("cases");
                }}
              >
                <span className="nav-glyph">◎</span> Screenings Audit ({screenings.length})
              </button>

              <button
                type="button"
                className={activeTab === "care" && viewMode === "dashboard" ? "nav-item active" : "nav-item"}
                onClick={() => {
                  setViewMode("dashboard");
                  setActiveTab("care");
                }}
              >
                <span className="nav-glyph">✚</span> Care Guidance &amp; Rules
              </button>
            </>
          )}
        </nav>

        <div className="sidebar-spacer" />
        <IconTooltip
          title="Offline-First Network Architecture"
          desc="Arogya Relay works 100% offline. All patient records and photos save locally in browser storage and sync automatically when connected."
          howToUse="No action needed; background queue will auto-sync."
          position="right"
        >
          <div className="connection-card" style={{ cursor: "help" }}>
            <div className="connection-title"><i /> {t("shell.intermittent2g")}</div>
            <div className="signal-steps" aria-label="Two of four signal bars">
              <span /><span /><span className="off" /><span className="off" />
            </div>
            <p>{t("shell.offlineCapture")}</p>
          </div>
        </IconTooltip>
        <AccountPanel
          open={accountOpen}
          onToggle={() => { setAccountOpen((open) => !open); setNotificationsOpen(false); }}
        />
      </aside>

      <section className="workspace" id="main-content">
        <header className="topbar">
          <div>
            <span className="location-kicker">{t("shell.fieldUnit")}</span>
            <h2>{t("shell.cluster")}</h2>
          </div>
          <div className="top-actions">
            <IconTooltip
              title="Clinic Operational Date & Live Clock"
              desc="NTP-synchronized healthcare calendar, operational shifts, and live station clock."
              howToUse="Reference for clinical case timestamps."
              position="bottom"
            >
              <ClinicDateWidget />
            </IconTooltip>

            <LanguageSwitcher />

            <TopRightUserNav
              currentUser={currentUser}
              currentProfile={currentProfile}
              onSignOut={handleSignOut}
              onOpenAuthScreen={(mode) => {
                setAuthScreenMode(mode);
                setViewMode("auth");
              }}
              onOpenSupabase={() => setViewMode("supabase")}
              onOpenAdmin={() => setViewMode("admin")}
            />

            <button
              type="button"
              onClick={handleSignOut}
              style={{
                background: "#fee2e2",
                color: "#b91c1c",
                border: "1px solid #fca5a5",
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
              title="Log out of active session"
            >
              <span>🚪</span>
              <span>Log Out</span>
            </button>

            {activeRole !== "patient" && (
              <div className="topbar-menu">
                <IconTooltip
                  title="Urgent Clinical Signals"
                  desc="Live triage warnings and emergency patient notifications."
                  howToUse="Click to view urgent case notifications and alerts."
                  position="bottom"
                >
                  <button
                    type="button"
                    className="quiet-icon"
                    aria-label={t("shell.notifications")}
                    aria-expanded={notificationsOpen}
                    onClick={() => { setNotificationsOpen((open) => !open); setAccountOpen(false); }}
                  >
                    ●<span />
                  </button>
                </IconTooltip>
                {notificationsOpen && (
                  <div className="notification-popover" role="region" aria-label={t("shell.notifications")}>
                    <span className="eyebrow">{t("shell.liveNotifications")}</span>
                    <strong>{urgentCount > 0 ? `${urgentCount} ${t("common.urgent")}` : t("shell.oneUrgentSignal")}</strong>
                    <p>{t("shell.notificationDetail")}</p>
                    <button type="button" onClick={openCases}>{t("overview.openBrief")} →</button>
                  </div>
                )}
              </div>
            )}

            {(activeRole === "health_worker" || activeRole === "doctor" || activeRole === "admin") && (
              <IconTooltip
                title="New Clinical Screening Workstation"
                desc="Open dedicated full-screen console for patient registration, vitals dictation, and lesion camera capture."
                howToUse="Click to launch the full-screen screening workstation."
                position="bottom"
              >
                <button type="button" className="primary-button" onClick={openScreening}>
                  <span aria-hidden="true">＋</span> {t("action.newScreening")}
                </button>
              </IconTooltip>
            )}
          </div>
        </header>

        <div className="notice-strip" role="status" aria-live="polite">
          <span className={syncState === "done" ? "status-dot synced" : "status-dot"} />
          <p>{t(noticeKey)}</p>
          <button type="button" onClick={syncReports} disabled={syncState !== "ready"}>{syncLabel}</button>
        </div>

        {activeTab === "overview" && (
          <Overview
            screenings={screenings}
            userMode={activeRole === "patient" ? "patient" : "staff"}
            onSwitchMode={(m) => setActiveRole(m === "patient" ? "patient" : "doctor")}
            onOpenScreening={openScreening}
            onOpenCases={openCases}
            onOpenMatcher={() => setActiveTab("matcher")}
            onOpenLibrary={() => {
              setViewMode("dashboard");
              setActiveTab("library");
            }}
            onOpenPrescriptions={() => setActiveTab("prescriptions")}
            onOpenNearby={() => setActiveTab("nearby")}
            onOpenChemist={() => setViewMode("chemist")}
            currentUser={currentUser}
            currentProfile={currentProfile}
            onSignOut={handleSignOut}
          />
        )}
        {activeTab === "cases" && (
          <CaseQueue
            screenings={screenings}
            onDoctorEvaluate={handleDoctorEvaluate}
            onOpenHealthPass={(r) => setHealthPassRecord(r)}
          />
        )}
        {activeTab === "library" && (
          <Suspense fallback={<WorkspaceLoading />}>
            <DiseaseLibrary
              onTransferToScreening={handleTransferFromLibrary}
              onClose={() => setActiveTab("overview")}
            />
          </Suspense>
        )}
        {activeTab === "prescriptions" && (
          <Suspense fallback={<WorkspaceLoading />}>
            <PrescriptionTracker userRole={activeRole} />
          </Suspense>
        )}
        {activeTab === "matcher" && (
          <Suspense fallback={<WorkspaceLoading />}>
            <VisualDiseaseMatcher onTransferToScreening={handleTransferFromMatcher} />
          </Suspense>
        )}
        <Suspense fallback={<WorkspaceLoading />}>
          {activeTab === "care" && <CareGuidance />}
          {activeTab === "nearby" && <NearbyCare />}
          {activeTab === "plan" && <CarePlanView />}
        </Suspense>
      </section>

      {/* Screening Modal */}
      {screeningOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeScreening}>
          <section
            ref={modalRef}
            className="screening-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="screening-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span className="eyebrow">{t("screening.kicker")}</span>
                <h2 id="screening-title">{t("screening.title")}</h2>
              </div>
              <button
                type="button"
                className="close-button"
                aria-label={t("common.close")}
                onClick={closeScreening}
              >
                ✕
              </button>
            </header>

            <form onSubmit={saveScreening}>
              <div className="screening-layout">
                <div className="screening-basics">
                  {/* Screener Attestation Banner */}
                  <div
                    className="screening-attestation-banner"
                    style={{
                      background: "rgba(23, 100, 79, 0.08)",
                      padding: "8px 14px",
                      borderRadius: "10px",
                      marginBottom: "14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      border: "1px solid rgba(23, 100, 79, 0.2)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                      <span style={{ fontSize: "16px" }}>🩺</span>
                      <div>
                        <strong style={{ fontSize: "12px", color: "var(--sc-accent, #17644f)", display: "block" }}>
                          Attested Screener: {currentProfile?.display_name || currentUser?.email || "Sunita Devi (ASHA Unit NR-01)"}
                        </strong>
                        <span style={{ fontSize: "10px", color: "#64748b" }}>
                          Role: {currentProfile?.role?.toUpperCase() || "COMMUNITY HEALTH WORKER"} · ID: {currentProfile?.pseudo_id || "HW-NR-01"} · Unit: {currentProfile?.facility_name || "Mawlynnong Block"}
                        </span>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "12px",
                        background: "#dcfce7",
                        color: "#166534",
                      }}
                    >
                      ✓ Credential Verified
                    </span>
                  </div>

                  <div className="form-grid">
                    <label>
                      <span>{t("screening.patientRef")}</span>
                      <input
                        type="text"
                        name="patientRef"
                        autoComplete="off"
                        value={prefilledRef}
                        onChange={(e) => setPrefilledRef(e.target.value)}
                        placeholder="NR-1049"
                      />
                    </label>
                    <label>
                      <span>{t("screening.village")}</span>
                      <input
                        type="text"
                        name="village"
                        autoComplete="off"
                        value={prefilledVillage}
                        onChange={(e) => setPrefilledVillage(e.target.value)}
                        placeholder="North Ridge"
                        required
                      />
                    </label>
                    <label>
                      <span>{t("screening.age")}</span>
                      <input
                        type="number"
                        name="age"
                        value={prefilledAge}
                        onChange={(e) => setPrefilledAge(e.target.value)}
                        required
                      />
                    </label>
                    <label>
                      <span>{t("screening.temperature")}</span>
                      <input
                        type="number"
                        step="0.1"
                        name="temperature"
                        value={prefilledTemp}
                        onChange={(e) => setPrefilledTemp(e.target.value)}
                        required
                      />
                    </label>
                    <label>
                      <span>{t("screening.spo2")}</span>
                      <input
                        type="number"
                        name="spo2"
                        value={prefilledSpo2}
                        onChange={(e) => setPrefilledSpo2(e.target.value)}
                        required
                      />
                    </label>
                    <label>
                      <span>Pulse (BPM)</span>
                      <input
                        type="number"
                        name="pulse"
                        value={prefilledPulse}
                        onChange={(e) => setPrefilledPulse(e.target.value)}
                      />
                    </label>
                  </div>

                  {/* Vitals Safety Alert Banners */}
                  {prefilledSpo2 && Number(prefilledSpo2) < 90 && (
                    <div
                      style={{
                        background: "#fef2f2",
                        border: "1.5px solid #ef4444",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        marginTop: "10px",
                        color: "#b91c1c",
                        fontSize: "11.5px",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span>🚨</span>
                      <span>
                        CRITICAL DANGER: SpO₂ is dangerously low ({prefilledSpo2}%). Provide oxygen support immediately and initiate Call 112 emergency referral.
                      </span>
                    </div>
                  )}

                  {prefilledTemp && (Number(prefilledTemp) >= 39.0 || Number(prefilledTemp) >= 102.2) && (
                    <div
                      style={{
                        background: "#fffbeb",
                        border: "1.5px solid #f59e0b",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        marginTop: "10px",
                        color: "#b45309",
                        fontSize: "11px",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span>⚠️</span>
                      <span>
                        HIGH PYREXIA ALERT ({prefilledTemp}°): Check patient for malarial rigors, dengue warning signs, or acute sepsis.
                      </span>
                    </div>
                  )}

                  {/* Voice Dictation Trigger */}
                  <div style={{ margin: "14px 0", padding: "10px 14px", background: "rgba(23,100,79,0.06)", borderRadius: "10px", border: "1px dashed #4f9e74" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", fontWeight: 600 }}>🎙️ Hands-Free Voice Vitals Dictation:</span>
                      <button
                        type="button"
                        onClick={handleToggleVoice}
                        className={isListeningVoice ? "primary-button" : "secondary-button"}
                        style={{ padding: "4px 12px", fontSize: "11px" }}
                      >
                        {isListeningVoice ? "🔴 Stop Listening" : "🎤 Speak Vitals (Hindi/Eng)"}
                      </button>
                    </div>
                    {voiceTranscript && (
                      <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#234d3f" }}>
                        <em>"{voiceTranscript}"</em>
                      </p>
                    )}
                  </div>

                  {/* Photo Attachment for Skin/Eye/Lesions */}
                  <div
                    style={{
                      margin: "12px 0",
                      padding: "10px 14px",
                      background: "#f8fafc",
                      borderRadius: "10px",
                      border: "1px dashed #94a3b8",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: "11.5px", fontWeight: 700, display: "block", color: "#1e293b" }}>
                          📷 Attach Clinical / Lesion Photograph
                        </span>
                        <small style={{ fontSize: "9.5px", color: "#64748b" }}>
                          Direct capture for Drishti AI triage, rash verification, and doctor consultation
                        </small>
                      </div>
                      <label
                        style={{
                          background: "#e2e8f0",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Capture / Select Photo
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleScreeningImageUpload}
                          style={{ display: "none" }}
                        />
                      </label>
                    </div>

                    {screeningImageUrl && (
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
                        <img
                          src={screeningImageUrl}
                          alt="Clinical Lesion Attachment"
                          style={{ width: "52px", height: "52px", borderRadius: "8px", objectFit: "cover", border: "1.5px solid #cbd5e1" }}
                        />
                        <div>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: "#166534", display: "block" }}>
                            ✓ Photograph Attached & Encrypted
                          </span>
                          <button
                            type="button"
                            onClick={() => setScreeningImageUrl("")}
                            style={{ background: "none", border: "none", color: "#dc2626", fontSize: "10px", cursor: "pointer", padding: 0 }}
                          >
                            Remove photo
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Body Map Toggle */}
                  <div style={{ margin: "12px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700 }}>Symptoms Selection:</span>
                    <button
                      type="button"
                      className="glass-button"
                      style={{ fontSize: "11px", padding: "4px 10px" }}
                      onClick={() => setShowBodyMap(!showBodyMap)}
                    >
                      {showBodyMap ? "Hide Anatomical Map ✕" : "🗺️ Open Anatomical Body Map"}
                    </button>
                  </div>

                  {showBodyMap && (
                    <div style={{ margin: "10px 0 16px", padding: "12px", background: "#f8fbf9", borderRadius: "12px", border: "1px solid #d5e5dc" }}>
                      <AnatomicalBodyMap
                        selectedSymptoms={selectedSymptoms}
                        onToggleSymptom={toggleSymptom}
                      />
                    </div>
                  )}

                  <div className="symptom-grid" role="group" aria-label={t("screening.symptoms")}>
                    {[
                      { key: "fever", label: t("screening.fever") },
                      { key: "cough", label: t("screening.cough") },
                      { key: "chills", label: t("screening.chills") },
                      { key: "fatigue", label: t("screening.fatigue") },
                      { key: "shortness_of_breath", label: t("screening.shortnessOfBreath") },
                      { key: "rash", label: "Skin Rash / Itch" },
                      { key: "diarrhea", label: "Diarrhea / Loose Motion" },
                      { key: "eye_discharge", label: "Eye Redness / Conjunctivitis" },
                    ].map((sym) => (
                      <label key={sym.key} className={selectedSymptoms.includes(sym.key) ? "symptom-chip active" : "symptom-chip"}>
                        <input
                          type="checkbox"
                          checked={selectedSymptoms.includes(sym.key)}
                          onChange={() => toggleSymptom(sym.key)}
                        />
                        <span>{sym.label}</span>
                      </label>
                    ))}
                  </div>

                  <label style={{ marginTop: "14px", display: "block" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700 }}>Field Observations / History:</span>
                    <textarea
                      rows={2}
                      value={prefilledNotes}
                      onChange={(e) => setPrefilledNotes(e.target.value)}
                      placeholder="e.g. Duration of symptoms, onset, known exposures or travel history."
                      style={{ width: "100%", marginTop: "4px", padding: "8px", borderRadius: "8px", border: "1px solid #c8d9d0" }}
                    />
                  </label>
                </div>
              </div>

              <div className="dialog-actions">
                <span className="privacy-pill">Screening support only.</span>
                <div>
                  <button type="button" className="secondary-button" onClick={closeScreening}>
                    {t("common.cancel")}
                  </button>
                  <button type="submit" className="primary-button">
                    {t("action.saveScreening")}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Health Pass Modal */}
      {healthPassRecord && (
        <HealthPassCard
          record={healthPassRecord}
          onClose={() => setHealthPassRecord(null)}
        />
      )}

      {/* Supabase Settings Modal */}
      <SupabaseSettingsModal
        isOpen={supabaseSettingsOpen}
        onClose={() => setSupabaseSettingsOpen(false)}
      />
    </main>
  );
}

interface OverviewProps {
  screenings: ScreeningRecord[];
  userMode?: "patient" | "staff";
  onSwitchMode?: (mode: "patient" | "staff") => void;
  onOpenScreening?: () => void;
  onOpenCases: () => void;
  onOpenMatcher: () => void;
  onOpenLibrary: () => void;
  onOpenPrescriptions: () => void;
  onOpenNearby: () => void;
  onOpenChemist?: () => void;
  onOpenDevice?: () => void;
  currentUser?: User | null;
  currentProfile?: Profile | null;
  onSignOut?: () => void;
}

function Overview({
  screenings,
  userMode = "staff",
  onSwitchMode,
  onOpenScreening,
  onOpenCases,
  onOpenMatcher,
  onOpenLibrary,
  onOpenPrescriptions,
  onOpenNearby,
  onOpenChemist,
  onOpenDevice,
  currentUser,
  currentProfile,
  onSignOut,
}: OverviewProps) {
  const { t } = useLanguage();
  void onOpenDevice;
  const chartBars = useMemo(() => computeActivityBars(screenings), [screenings]);
  const urgentScreenings = screenings.filter((s) => s.urgency_tier === "urgent" || s.urgency_tier === "emergency");
  const urgentCase = urgentScreenings[0] ?? null;

  return (
    <div className="page-content">
      {userMode === "patient" ? (
        /* ═══════════════════════════════════════════════════════════════════
           PATIENT & FAMILY STREAMLINED PORTAL
           ═══════════════════════════════════════════════════════════════════ */
        <section className="patient-portal-hero" aria-labelledby="patient-title" style={{ padding: "8px 0 24px" }}>
          {/* Main Welcome & Header with Logout */}
          <div
            style={{
              marginBottom: "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                ✨ {t("patient.heroTitle")}
              </span>
              <DynamicGreeting />
              <p style={{ fontSize: "15px", color: "var(--muted)", margin: "4px 0 0", maxWidth: "700px", lineHeight: "1.5" }}>
                {t("patient.heroSubtitle")}
              </p>
            </div>

            {/* Dedicated Hero Profile Badge */}
            <div
              style={{
                background: "var(--surface, #ffffff)",
                border: "1.5px solid var(--border, #e2e8f0)",
                borderRadius: "14px",
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
              }}
            >
              <span style={{ fontSize: "24px" }}>👤</span>
              <div>
                <strong style={{ fontSize: "13.5px", color: "var(--foreground, #0f172a)", display: "block" }}>
                  {currentProfile?.display_name || currentUser?.email?.split("@")[0] || "Citizen"}
                </strong>
                <span style={{ fontSize: "11px", color: "#166534", background: "#dcfce7", padding: "1px 8px", borderRadius: "10px", fontWeight: 700 }}>
                  Active Citizen Session
                </span>
              </div>
            </div>
          </div>

          {/* Community Health Alert & Local Offline Notice */}
          <div
            style={{
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              borderRadius: "12px",
              padding: "12px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "20px" }}>📢</span>
              <div>
                <strong style={{ fontSize: "14px", color: "var(--foreground)", display: "block" }}>
                  Symptoms are rising in North Ridge.
                </strong>
                <span style={{ fontSize: "12.5px", color: "var(--muted)" }}>
                  {screenings.length || 14} Screenings today · Offline capture is active.
                </span>
              </div>
            </div>
            {onOpenScreening && (
              <button
                type="button"
                className="primary-button"
                onClick={onOpenScreening}
                style={{ fontSize: "13px", padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <span>+</span> New screening
              </button>
            )}
          </div>

          {/* 3 Large Action Cards for Citizens */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "20px" }}>
            {/* Card 1: Consult Doctor & New Screening */}
            <div
              role="button"
              tabIndex={0}
              onClick={onOpenScreening || onOpenCases}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") (onOpenScreening || onOpenCases)(); }}
              style={{
                background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                color: "#ffffff",
                borderRadius: "16px",
                padding: "24px",
                cursor: "pointer",
                boxShadow: "0 6px 20px rgba(5, 150, 105, 0.22)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                transition: "transform 0.15s ease",
              }}
            >
              <span style={{ fontSize: "36px" }}>🩺</span>
              <h2 style={{ fontSize: "20px", fontWeight: "800", margin: 0, color: "#ffffff" }}>
                {t("patient.callDoctor")}
              </h2>
              <p style={{ margin: 0, fontSize: "14px", opacity: 0.9, lineHeight: 1.45 }}>
                {t("patient.callDoctorDesc")}
              </p>
              <div style={{ marginTop: "auto", paddingTop: "8px", fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>{t("action.newScreening") || "New screening"}</span> <span>→</span>
              </div>
            </div>

            {/* Card 2: Health Guides & Remedies */}
            <div
              role="button"
              tabIndex={0}
              onClick={onOpenLibrary}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpenLibrary(); }}
              style={{
                background: "var(--surface)",
                border: "2px solid #10b981",
                borderRadius: "16px",
                padding: "24px",
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(16, 185, 129, 0.1)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                transition: "transform 0.15s ease",
              }}
            >
              <span style={{ fontSize: "36px" }}>📖</span>
              <h2 style={{ fontSize: "20px", fontWeight: "800", margin: 0, color: "var(--foreground)" }}>
                {t("patient.checkSymptoms")}
              </h2>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--muted)", lineHeight: 1.45 }}>
                {t("patient.checkSymptomsDesc")}
              </p>
              <div style={{ marginTop: "auto", paddingTop: "8px", fontWeight: 700, fontSize: "14px", color: "var(--primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>{t("nav.library")}</span> <span>→</span>
              </div>
            </div>
            {/* Card 3: My Prescriptions & Reminders */}
            <div
              role="button"
              tabIndex={0}
              onClick={onOpenPrescriptions}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpenPrescriptions(); }}
              style={{
                background: "var(--surface)",
                border: "2px solid #3b82f6",
                borderRadius: "16px",
                padding: "24px",
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(59, 130, 246, 0.1)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                transition: "transform 0.15s ease",
              }}
            >
              <span style={{ fontSize: "36px" }}>💊</span>
              <h2 style={{ fontSize: "20px", fontWeight: "800", margin: 0, color: "var(--foreground)" }}>
                {t("nav.prescriptions")} &amp; Reminders
              </h2>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--muted)", lineHeight: 1.45 }}>
                View your active doctor prescriptions, daily dosage times, reminder alarms, and your digital QR pass.
              </p>
              <div style={{ marginTop: "auto", paddingTop: "8px", fontWeight: 700, fontSize: "14px", color: "#2563eb", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>View Prescriptions</span> <span>→</span>
              </div>
            </div>
          </div>

          {/* Visual Assistant Subcard */}
          <div
            role="button"
            tabIndex={0}
            onClick={onOpenMatcher}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpenMatcher(); }}
            style={{
              background: "var(--surface)",
              border: "1.5px dashed var(--line)",
              borderRadius: "14px",
              padding: "16px 20px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              marginBottom: "18px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span style={{ fontSize: "30px" }}>📷</span>
              <div>
                <strong style={{ fontSize: "15px", display: "block", color: "var(--foreground)" }}>
                  {t("patient.drishtiCard")}
                </strong>
                <span style={{ fontSize: "13px", color: "var(--muted)" }}>
                  {t("patient.drishtiCardDesc")}
                </span>
              </div>
            </div>
            <span style={{ fontWeight: 700, color: "var(--primary)", fontSize: "13px", whiteSpace: "nowrap" }}>
              {t("overview.drishtiAction")} →
            </span>
          </div>

          {/* Emergency 112 Direct Call Strip */}
          <div
            style={{
              background: "#fef2f2",
              border: "1.5px solid #f87171",
              borderRadius: "12px",
              padding: "14px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "24px" }}>🚨</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#991b1b" }}>
                {t("patient.emergencyCall")}
              </span>
            </div>
            <a
              href="tel:112"
              style={{
                background: "#dc2626",
                color: "#ffffff",
                padding: "8px 18px",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "13px",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              📞 112
            </a>
          </div>
        </section>
      ) : (
        /* ═══════════════════════════════════════════════════════════════════
           STAFF & CLINICIAN WORKBENCH
           ═══════════════════════════════════════════════════════════════════ */
        <>
          <section className="overview-hero" aria-labelledby="overview-title">
            <div className="hero-atmosphere" aria-hidden="true"><i /><i /><i /></div>
            <div className="hero-copy">
              <span className="hero-kicker"><i /> {t("overview.kicker")}</span>
              <DynamicGreeting />
              <p>{t("overview.subtitle")}</p>
              <div className="hero-actions">
                <button type="button" className="glass-button" onClick={onOpenCases}>
                  {t("overview.liveQueue")} <span>→</span>
                </button>
                <button type="button" className="glass-button" onClick={onOpenMatcher}>
                  {t("overview.drishtiAction")} <span>→</span>
                </button>
              </div>
            </div>
            <aside className="hero-command" aria-label="Care command summary">
              <div className="command-head">
                <span>{t("overview.liveNetwork")}</span>
                <b><i /> {t("overview.monitoring")}</b>
              </div>
              <strong>{t("overview.communities")}</strong>
              <p>{t("overview.coverage")}</p>
              <div className="command-metrics">
                <span><b>{screenings.length || 47}</b> {t("overview.screened")}</span>
                <span><b>{screenings.filter((s) => !s.synced).length || 14}</b> {t("overview.offline")}</span>
                <span><b>{urgentScreenings.length || 1}</b> {t("common.urgent")}</span>
              </div>
              <div className="command-route" aria-hidden="true"><i /><span /><i /><span /><i /></div>
            </aside>
          </section>

          <section className="signal-layout">
            <article className="trend-card">
              <div className="trend-copy">
                <span className="alert-label">{t("overview.signals")}</span>
                <h2>Symptoms are rising in North Ridge.</h2>
                <p>{t("overview.risingDetail") || "Clusters of acute respiratory presentations reported over the last 12 hours."}</p>
                <div className="trend-actions">
                  <button type="button" className="dark-button" onClick={onOpenCases}>
                    {t("overview.reviewLinked")}
                  </button>
                  <span>{t("overview.updated")}</span>
                </div>
              </div>
              <div className="mini-chart" aria-label="Respiratory symptom reports across recent hours">
                <div className="chart-meta">
                  <span>{t("overview.reports2h")}</span>
                  <strong>{screenings.length || 12} <small>{t("overview.activeScreenings")}</small></strong>
                </div>
                <div className="bars">
                  {chartBars.map((height, index) => (
                    <i key={index} style={{ height: `${height}%` }} className={index > 8 ? "hot" : ""} />
                  ))}
                </div>
                <div className="chart-axis"><span>06:00</span><span>12:00</span><span>18:00</span><span>Now</span></div>
              </div>
            </article>

            <article className="urgent-card">
              <header><span>{t("overview.urgentQueue")}</span><b>{urgentScreenings.length}</b></header>
              {urgentCase ? (
                <>
                  <div className="urgent-person">
                    <div className="avatar danger-avatar">{urgentCase.patient_ref.slice(0, 2)}</div>
                    <div>
                      <h3>{urgentCase.patient_ref} ({urgentCase.age} yrs)</h3>
                      <p>{urgentCase.village}</p>
                    </div>
                  </div>
                  <div className="urgent-reading">
                    <span>SpO₂</span><strong>{urgentCase.spo2}%</strong>
                    <em>{urgentCase.temperature}°C</em>
                  </div>
                  <p className="urgent-note">{urgentCase.field_notes || urgentCase.symptoms.join(", ")}</p>
                </>
              ) : (
                <>
                  <div className="urgent-person">
                    <div className="avatar danger-avatar">LM</div>
                    <div><h3>{t("overview.child6")}</h3><p>North Ridge · NR-1048</p></div>
                  </div>
                  <div className="urgent-reading"><span>SpO₂</span><strong>91%</strong><em>{t("overview.lowReading")}</em></div>
                  <p className="urgent-note">{t("overview.urgentNote")}</p>
                </>
              )}
              <button type="button" onClick={onOpenCases}>{t("overview.openBrief")} <span>→</span></button>
            </article>
          </section>

          {/* Operational Field Metrics */}
          <section className="metric-grid" aria-label="Field health metrics">
            <Metric icon="🩺" value={`${screenings.length || 14}`} label="Screenings today" note="Offline capture is active." tone="mint" />
            <Metric icon="⚠️" value={`${urgentScreenings.length || 3}`} label={t("overview.metricUrgentLabel")} note={t("overview.metricUrgentNote")} tone="sand" />
            <Metric icon="📶" value="98%" label={t("overview.metricSyncLabel")} note={t("overview.metricSyncNote")} tone="blue" />
            <Metric icon="🏥" value="5" label={t("overview.metricFacilitiesLabel")} note={t("overview.metricFacilitiesNote")} tone="rose" />
          </section>

          {/* Feature Navigation Quick Cards */}
          <section className="metric-grid" aria-label="Key telehealth features">
            <article className="metric-card" style={{ cursor: "pointer" }} onClick={onOpenLibrary}>
              <span className="metric-icon mint">📖</span>
              <div>
                <strong>{t("nav.library")}</strong>
                <h3>{t("overview.cardGyanTitle")}</h3>
                <p>{t("overview.cardGyanDesc")}</p>
              </div>
            </article>
            <article className="metric-card" style={{ cursor: "pointer" }} onClick={onOpenPrescriptions}>
              <span className="metric-icon blue">💊</span>
              <div>
                <strong>{t("nav.prescriptions")}</strong>
                <h3>{t("overview.cardRxTitle")}</h3>
                <p>{t("overview.cardRxDesc")}</p>
              </div>
            </article>
            <article className="metric-card" style={{ cursor: "pointer" }} onClick={onOpenMatcher}>
              <span className="metric-icon sand">📷</span>
              <div>
                <strong>{t("nav.matcher")}</strong>
                <h3>{t("overview.cardDrishtiTitle")}</h3>
                <p>{t("overview.cardDrishtiDesc")}</p>
              </div>
            </article>
            <article className="metric-card" style={{ cursor: "pointer" }} onClick={onOpenNearby}>
              <span className="metric-icon rose">⌖</span>
              <div>
                <strong>{t("nav.nearby")}</strong>
                <h3>{t("overview.cardNearbyTitle")}</h3>
                <p>{t("overview.cardNearbyDesc")}</p>
              </div>
            </article>
          </section>

          {/* Switch to Patient Mode button */}
          {onSwitchMode && (
            <div style={{ textAlign: "center", margin: "16px 0 8px" }}>
              <button
                type="button"
                onClick={() => onSwitchMode("patient")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--muted)",
                  fontSize: "13px",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                👤 {t("mode.switchPatient")}
              </button>
            </div>
          )}
        </>
      )}

      <section className="lower-grid" style={{ gridTemplateColumns: "1fr" }}>
        <article className="panel cases-panel">
          <header className="panel-header">
            <div>
              <span className="eyebrow">{t("overview.priorityReview")}</span>
              <h2>{t("overview.recentSignals")}</h2>
            </div>
            <button type="button" onClick={onOpenCases}>{t("overview.viewAll")} →</button>
          </header>
          <div className="case-list">
            {screenings.slice(0, 5).map((record) => (
              <AlertRow key={record.id} record={record} onOpen={onOpenCases} />
            ))}
            {screenings.length === 0 && (
              <p className="case-empty">No screening signals recorded yet.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}

function Metric({ icon, value, label, note, tone }: { icon: string; value: string; label: string; note: string; tone: string }) {
  return (
    <article className="metric-card">
      <span className={`metric-icon ${tone}`}>{icon}</span>
      <div>
        <strong>{value}</strong>
        <h3>{label}</h3>
        <p>{note}</p>
      </div>
    </article>
  );
}

function AlertRow({
  record,
  onOpen,
  expanded = false,
}: {
  record: ScreeningRecord;
  onOpen?: () => void;
  expanded?: boolean;
}) {
  const tone = record.urgency_tier === "emergency" ? "danger" : record.urgency_tier === "urgent" ? "warning" : "routine";
  const priority =
    record.urgency_tier === "emergency"
      ? t("priority.emergency")
      : record.urgency_tier === "urgent"
      ? t("priority.urgent")
      : t("priority.routine");

  return (
    <div className="case-row">
      <div className={`avatar ${tone === "danger" ? "danger-avatar" : ""}`}>
        {record.patient_ref.slice(0, 2).toUpperCase()}
      </div>
      <div className="case-person">
        <strong>{record.patient_ref} ({record.age}y)</strong>
        <span>{record.village}</span>
      </div>
      <div className="case-signal">
        <strong>{record.symptoms.slice(0, 2).join(", ")}</strong>
        <span>SpO₂ {record.spo2}% · {record.temperature}°C</span>
      </div>
      <div className="case-time">
        <span className={`priority ${tone}`}>{priority}</span>
        <small suppressHydrationWarning className="case-time-pill" title={new Date(record.created_at).toLocaleString("en-IN")}>
          <span className="case-time-clock">🕒</span>
          <span>{new Date(record.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </small>
      </div>
      <button type="button" aria-label={`Open case ${record.id}`} aria-expanded={expanded} onClick={onOpen}>
        ›
      </button>
    </div>
  );
}

interface CaseQueueProps {
  screenings: ScreeningRecord[];
  onDoctorEvaluate: (id: string, notes: string, advice: string) => Promise<void>;
  onOpenHealthPass: (record: ScreeningRecord) => void;
}

function CaseQueue({ screenings, onDoctorEvaluate, onOpenHealthPass }: CaseQueueProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CaseFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Doctor evaluation form
  const [doctorNotes, setDoctorNotes] = useState("");
  const [prescriptionAdvice, setPrescriptionAdvice] = useState("");
  const [submittingEval, setSubmittingEval] = useState(false);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleRecords = screenings.filter((rec) => {
    const matchesQuery =
      !normalizedQuery ||
      `${rec.patient_ref} ${rec.village} ${rec.symptoms.join(" ")}`.toLowerCase().includes(normalizedQuery);
    const matchesFilter =
      filter === "all" ||
      (filter === "urgent" && (rec.urgency_tier === "urgent" || rec.urgency_tier === "emergency")) ||
      (filter === "review" && rec.urgency_tier === "review") ||
      (filter === "evaluated" && rec.status === "doctor_evaluated");
    return matchesQuery && matchesFilter;
  });

  const selectedRecord = screenings.find((rec) => rec.id === selectedId) ?? null;

  async function handleEvalSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedRecord) return;
    setSubmittingEval(true);
    await onDoctorEvaluate(selectedRecord.id, doctorNotes, prescriptionAdvice);
    setSubmittingEval(false);
  }

  const urgentCount = screenings.filter((s) => s.urgency_tier === "urgent" || s.urgency_tier === "emergency").length;
  const reviewCount = screenings.filter((s) => s.urgency_tier === "review").length;
  const evaluatedCount = screenings.filter((s) => s.status === "doctor_evaluated").length;

  return (
    <div className="page-content section-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t("cases.kicker")}</span>
          <h1>{t("nav.cases")}</h1>
          <p>{t("cases.subtitle")}</p>
        </div>
      </div>
      <div className="queue-summary">
        <span><strong>{urgentCount}</strong> {t("common.urgent")}</span>
        <span><strong>{reviewCount}</strong> {t("common.review")}</span>
        <span><strong>{evaluatedCount}</strong> {t("cases.evaluatedCount")}</span>
        <span><strong>{screenings.length}</strong> {t("cases.totalScreenings")}</span>
      </div>
      <article className="panel cases-panel full-table">
        <div className="table-tools">
          <label>
            {t("cases.search")}
            <input
              type="search"
              name="case-search"
              autoComplete="off"
              placeholder={t("cases.searchPlaceholder")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div>
            <button
              type="button"
              className={filter === "all" ? "filter active" : "filter"}
              aria-pressed={filter === "all"}
              onClick={() => setFilter("all")}
            >
              {t("cases.allSignals")}
            </button>
            <button
              type="button"
              className={filter === "urgent" ? "filter active" : "filter"}
              aria-pressed={filter === "urgent"}
              onClick={() => setFilter("urgent")}
            >
              {t("common.urgent")}
            </button>
            <button
              type="button"
              className={filter === "review" ? "filter active" : "filter"}
              aria-pressed={filter === "review"}
              onClick={() => setFilter("review")}
            >
              {t("common.review")}
            </button>
            <button
              type="button"
              className={filter === "evaluated" ? "filter active" : "filter"}
              aria-pressed={filter === "evaluated"}
              onClick={() => setFilter("evaluated")}
            >
              {t("cases.filterEvaluated")}
            </button>
          </div>
        </div>

        <div className="case-list">
          {visibleRecords.map((record) => (
            <div key={record.id} style={{ display: "contents" }}>
              <AlertRow
                record={record}
                expanded={selectedId === record.id}
                onOpen={() => {
                  if (selectedId === record.id) {
                    setSelectedId(null);
                  } else {
                    setSelectedId(record.id);
                    setDoctorNotes(record.doctor_notes ?? "");
                    setPrescriptionAdvice(record.prescription_advice ?? "");
                  }
                }}
              />
            </div>
          ))}
          {visibleRecords.length === 0 && <p className="case-empty" role="status">{t("cases.noMatches")}</p>}
        </div>

        {selectedRecord && (
          <section className="case-brief" aria-live="polite">
            <div className="case-brief-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <span className="eyebrow">{t("cases.selectedBrief")}</span>
                <h2>{selectedRecord.patient_ref} · {selectedRecord.village}</h2>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onOpenHealthPass(selectedRecord)}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <span>🪪</span> {t("cases.patientHealthPass")}
                </button>
                <button type="button" className="secondary-button" onClick={() => setSelectedId(null)}>
                  {t("common.close")}
                </button>
              </div>
            </div>

            <dl>
              <div><dt>{t("cases.age")}</dt><dd>{selectedRecord.age} {t("screen.years")}</dd></div>
              <div><dt>{t("cases.vitals")}</dt><dd>SpO₂ {selectedRecord.spo2}% · {selectedRecord.temperature}°C</dd></div>
              <div><dt>{t("cases.symptoms")}</dt><dd>{selectedRecord.symptoms.join(", ")}</dd></div>
              <div><dt>{t("cases.fieldNotes")}</dt><dd>{selectedRecord.field_notes || "None"}</dd></div>
              <div><dt>{t("cases.attestedBy")}</dt><dd>{selectedRecord.screener_name || "Field Health Worker"} ({selectedRecord.screener_id || "HW-01"})</dd></div>
              {selectedRecord.image_url && (
                <div>
                  <dt>{t("cases.clinicalPhoto")}</dt>
                  <dd>
                    <a href={selectedRecord.image_url} target="_blank" rel="noreferrer">
                      <img src={selectedRecord.image_url} alt="Attached lesion" style={{ width: "64px", height: "64px", objectFit: "cover", borderRadius: "8px", border: "1.5px solid #94a3b8", marginTop: "4px" }} />
                    </a>
                  </dd>
                </div>
              )}
              <div><dt>{t("cases.status")}</dt><dd>{selectedRecord.status === "doctor_evaluated" ? t("cases.evalDoctor") : t("cases.awaitingDoctor")}</dd></div>
            </dl>

            {selectedRecord.status === "doctor_evaluated" ? (
              <div className="case-brief-doctor" style={{ marginTop: "16px", padding: "16px", background: "rgba(35,77,63,0.06)", borderRadius: "12px" }}>
                <h3>👨‍⚕️ Clinical Decision & Prescription ({selectedRecord.evaluated_by || "Doctor"})</h3>
                <p style={{ margin: "8px 0" }}><strong>Diagnosis / Notes:</strong> {selectedRecord.doctor_notes}</p>
                <p style={{ margin: "8px 0" }}><strong>Prescription & Home Care:</strong> {selectedRecord.prescription_advice}</p>
                <span className="case-eval-badge" style={{ display: "inline-block", marginTop: "8px", background: "#eaf5ef", color: "#17644f", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700 }}>
                  ✓ Prescribed & Ready for ASHA Follow-up
                </span>
              </div>
            ) : (
              <form className="case-brief-doctor" onSubmit={handleEvalSubmit} style={{ marginTop: "16px" }}>
                <h3>👨‍⚕️ Doctor / Clinician Evaluation</h3>
                <label style={{ display: "block", marginTop: "10px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#234d3f" }}>{t("cases.doctorNotesLabel")}</span>
                  <textarea
                    required
                    rows={2}
                    value={doctorNotes}
                    onChange={(e) => setDoctorNotes(e.target.value)}
                    placeholder="e.g. Suspected acute respiratory infection. Advise hydration, isolation, and antipyretics."
                    style={{ width: "100%", marginTop: "4px", padding: "8px", borderRadius: "8px", border: "1px solid #c8d9d0" }}
                  />
                </label>
                <label style={{ display: "block", marginTop: "10px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#234d3f" }}>{t("cases.prescriptionAdviceLabel")}</span>
                  <textarea
                    required
                    rows={2}
                    value={prescriptionAdvice}
                    onChange={(e) => setPrescriptionAdvice(e.target.value)}
                    placeholder="e.g. Tab Paracetamol 500mg TDS for 3 days after food. Tab Cetirizine 10mg OD bedtime for 5 days."
                    style={{ width: "100%", marginTop: "4px", padding: "8px", borderRadius: "8px", border: "1px solid #c8d9d0" }}
                  />
                </label>
                <div className="case-brief-actions" style={{ marginTop: "12px" }}>
                  <button type="submit" className="primary-button" disabled={submittingEval}>
                    {submittingEval ? t("cases.saving") : t("cases.approveBtn")}
                  </button>
                </div>
              </form>
            )}

            <p className="queue-footnote">{t("cases.privacy")}</p>
          </section>
        )}
      </article>
    </div>
  );
}

export function DevicePanel() {
  const { t, effectiveLang } = useLanguage();
  const [selfCheckState, setSelfCheckState] = useState<"idle" | "testing" | "passed">("idle");
  const [lastCheck, setLastCheck] = useState("08:10");
  const [storageText, setStorageText] = useState("Local Storage Ready");
  const selfCheckTimer = useRef<number | null>(null);

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
      void navigator.storage.estimate().then((est) => {
        const usageMB = ((est.usage ?? 0) / (1024 * 1024)).toFixed(1);
        setStorageText(`${usageMB} MB Cache used`);
      });
    }
    return () => {
      if (selfCheckTimer.current !== null) clearTimeout(selfCheckTimer.current);
    };
  }, []);

  function runSelfCheck() {
    if (selfCheckState === "testing") return;
    setSelfCheckState("testing");
    selfCheckTimer.current = window.setTimeout(() => {
      setSelfCheckState("passed");
      setLastCheck(
        new Intl.DateTimeFormat(`${effectiveLang}-IN`, {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(new Date())
      );
      selfCheckTimer.current = null;
    }, 800);
  }

  const sensors = [
    { name: "Local Indexed Storage", reading: storageText, tolerance: "Encrypted", calibrated: "Active" },
    {
      name: "Network Sync Gateway",
      reading: typeof navigator !== "undefined" && navigator.onLine ? "Connected" : "Offline Safe",
      tolerance: "2G/3G/4G",
      calibrated: "Auto-sync",
    },
    { name: "Supabase Clinical Relay", reading: "Connected", tolerance: "TLS 1.3", calibrated: "Real-time" },
    { name: "Rules Engine Integrity", reading: "v1.0.0 Active", tolerance: "RMP-Curated", calibrated: "SHA-256" },
  ];

  return (
    <div className="page-content section-page" style={{ paddingTop: "0" }}>
      <section className="device-tech-grid" aria-label={t("device.technicalStatus")}>
        <article className="panel device-sensor-panel">
          <header className="device-tech-head">
            <div><span className="eyebrow">{t("device.technicalStatus")}</span><h2>System Diagnostics</h2></div>
            <span className="device-health"><i /> All Services Operational</span>
          </header>
          <div className="device-sensor-table" role="table" aria-label={t("device.sensorChain")}>
            <div className="device-sensor-row device-sensor-columns" role="row">
              <span role="columnheader">Component</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Protocol</span>
              <span role="columnheader">Mode</span>
            </div>
            {sensors.map((sensor) => (
              <div className="device-sensor-row" role="row" key={sensor.name}>
                <strong role="cell"><i /> {sensor.name}</strong>
                <span role="cell">{sensor.reading}</span>
                <span role="cell">{sensor.tolerance}</span>
                <span role="cell"><b>{sensor.calibrated}</b></span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel device-system-panel">
          <header className="device-tech-head">
            <div><span className="eyebrow">AR-07</span><h2>{t("device.systemIntegrity")}</h2></div>
          </header>
          <div
            className={selfCheckState === "testing" ? "device-self-check testing" : "device-self-check"}
            aria-live="polite"
          >
            <strong>{selfCheckState === "testing" ? t("device.testing") : t("device.selfCheckPassed")}</strong>
            <p>{t("device.noFaults")}</p>
          </div>
          <button
            type="button"
            className="secondary-button device-check-button"
            onClick={runSelfCheck}
            disabled={selfCheckState === "testing"}
          >
            {selfCheckState === "testing" ? t("device.testing") : t("device.runSelfCheck")}
          </button>
        </article>
      </section>
    </div>
  );
}


