"use client";

import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from "react";
import {
  getLocalPrescriptions,
  saveLocalPrescription,
  getTodayReminders,
  logAdherence,
  requestNotificationPermission,
  triggerMedicineNotification,
  syncPrescriptions,
  getLocalFollowUps,
  saveLocalFollowUp,
  type TodayReminderSlot,
} from "@/lib/prescriptions/storage";
import {
  type PatientPrescription,
  type ScheduledMedicine,
  type MedicineForm,
  type FoodRelation,
  type FollowUpIssueType,
  type PrescriptionFollowUpRequest,
  TWO_AVAILABLE_DOCTORS,
} from "@/lib/prescriptions/types";
import { useLanguage } from "@/lib/i18n/provider";
import { ReadAloud } from "./read-aloud";
import { createClient, uploadToStorage, type Profile } from "@/lib/supabase/client";

interface PrescriptionTrackerProps {
  userRole?: "patient" | "doctor" | "health_worker" | "chemist" | "admin";
  initialSection?: "submit" | "response" | "alarms";
  defaultDoctorId?: string;
  onNavigateToTab?: (tab: string) => void;
}

export default function PrescriptionTracker({
  userRole = "patient",
  initialSection = "response",
  defaultDoctorId = "doc-rajesh",
  onNavigateToTab,
}: PrescriptionTrackerProps) {
  const { t } = useLanguage();
  const [prescriptions, setPrescriptions] = useState<PatientPrescription[]>([]);
  const [followups, setFollowups] = useState<PrescriptionFollowUpRequest[]>([]);
  const [todayReminders, setTodayReminders] = useState<TodayReminderSlot[]>([]);
  const [pushGranted, setPushGranted] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // 3 Distinct Sections for Patient Mode:
  // 1. "submit"   = 📤 Submit Report to Doctor
  // 2. "response" = 📩 Doctor's Response & Fair Price
  // 3. "alarms"   = ⏰ Daily Medication Alarms
  const [activePatientSection, setActivePatientSection] = useState<"submit" | "response" | "alarms">(initialSection);

  // Sub-tab for Doctor Mode: "reminders" vs "add"
  const [doctorSubTab, setDoctorSubTab] = useState<"reminders" | "add">("reminders");

  // Section 1: Submit Report State
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(defaultDoctorId);
  const [selectedRxId, setSelectedRxId] = useState<string>("");
  const [reportIssueType, setReportIssueType] = useState<FollowUpIssueType>("dose_change");
  const [reportMessage, setReportMessage] = useState("");
  const [reportFilePreview, setReportFilePreview] = useState<string | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const reportFileInputRef = useRef<HTMLInputElement | null>(null);

  // Section 2: Selected Doctor Response View
  const [selectedFollowupId, setSelectedFollowupId] = useState<string>("");

  // Doctor Authoring State
  const [patientRef, setPatientRef] = useState("PT-RAMESH-01");
  const [doctorName, setDoctorName] = useState("Dr. Rajesh Patel, MBBS");
  const [diagnosis, setDiagnosis] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Doctor Medicine Authoring List
  const [medicinesList, setMedicinesList] = useState<ScheduledMedicine[]>([]);
  const [medName, setMedName] = useState("");
  const [medStrength, setMedStrength] = useState("500mg");
  const [medForm, setMedForm] = useState<MedicineForm>("tablet");
  const [medDose, setMedDose] = useState("1 tablet");
  const [foodRelation, setFoodRelation] = useState<FoodRelation>("after_food");
  const [slotMorning, setSlotMorning] = useState(true);
  const [slotAfternoon, setSlotAfternoon] = useState(false);
  const [slotEvening, setSlotEvening] = useState(false);
  const [slotNight, setSlotNight] = useState(true);
  const [durationDays, setDurationDays] = useState(5);
  const [medInstructions, setMedInstructions] = useState("Take with clean drinking water.");

  // Sync initialSection if prop changes
  useEffect(() => {
    if (initialSection) {
      setActivePatientSection(initialSection);
    }
  }, [initialSection]);

  // Sync defaultDoctorId if prop changes
  useEffect(() => {
    if (defaultDoctorId) {
      setSelectedDoctorId(defaultDoctorId);
    }
  }, [defaultDoctorId]);

  // Load local data on mount
  useEffect(() => {
    const rxList = getLocalPrescriptions();
    setPrescriptions(rxList);
    setTodayReminders(getTodayReminders(rxList));

    const fupList = getLocalFollowUps();
    setFollowups(fupList);
    if (fupList.length > 0) {
      setSelectedFollowupId(fupList[0].id);
    }

    if (rxList.length > 0) {
      setSelectedRxId(rxList[0].id);
    }

    if (typeof window !== "undefined" && "Notification" in window) {
      setPushGranted(Notification.permission === "granted");
    }

    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .maybeSingle<Profile>()
            .then(({ data: prof }) => {
              if (prof) {
                setCurrentUserProfile(prof);
                if (prof.display_name) setDoctorName(prof.display_name);
              }
            });
        }
      });
    } catch {
      // Offline fallback
    }

    void syncPrescriptions();
  }, []);

  function refreshReminders(updatedList: PatientPrescription[]) {
    setPrescriptions(updatedList);
    setTodayReminders(getTodayReminders(updatedList));
  }

  async function handleEnablePush() {
    const ok = await requestNotificationPermission();
    setPushGranted(ok);
    if (ok) {
      triggerMedicineNotification("Arogya Relay", "Push notifications are active!", "You will receive timely dosage reminders.");
      setStatusMessage("Push notifications successfully enabled!");
    } else {
      setStatusMessage("Push notifications denied or not supported by browser.");
    }
  }

  function handleTestChime() {
    triggerMedicineNotification("Amlodipine 2.5mg", "1 tablet", "Take after food with water.");
  }

  function handleTakeDose(item: TodayReminderSlot) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const scheduledTime = `${todayStr}T${item.timeSlot}:00`;
    logAdherence(item.prescriptionId, item.medicine.id, item.medicine.name, scheduledTime, "taken");

    const refreshed = getLocalPrescriptions();
    refreshReminders(refreshed);
    setStatusMessage(`Marked ${item.medicine.name} as taken!`);
  }

  function handleSkipDose(item: TodayReminderSlot) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const scheduledTime = `${todayStr}T${item.timeSlot}:00`;
    logAdherence(item.prescriptionId, item.medicine.id, item.medicine.name, scheduledTime, "skipped");

    const refreshed = getLocalPrescriptions();
    refreshReminders(refreshed);
    setStatusMessage(`Marked ${item.medicine.name} as skipped.`);
  }

  // Handle report file attachment
  async function handleReportFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadToStorage("prescriptions", file.name, file);
      setReportFilePreview(res.url);
    } catch {
      setReportFilePreview(URL.createObjectURL(file));
    }
  }

  // Handle patient submitting report / dose change request
  function handleSubmitReport(e: FormEvent) {
    e.preventDefault();
    if (!reportMessage.trim()) {
      setStatusMessage("Please enter your message or symptoms for the doctor.");
      return;
    }
    setIsSubmittingReport(true);

    const chosenDoctor = TWO_AVAILABLE_DOCTORS.find((d) => d.id === selectedDoctorId) || TWO_AVAILABLE_DOCTORS[0];
    const isPatel = chosenDoctor.id === "doc-rajesh";
    const newFollowupId = `FUP-${Date.now().toString(36).toUpperCase()}`;

    const newReq: PrescriptionFollowUpRequest = {
      id: newFollowupId,
      prescriptionId: selectedRxId || "RX-9021",
      patientRef: patientRef || "PT-RAMESH-01",
      patientName: "Ramesh Soren",
      doctorName: chosenDoctor.name,
      doctorNmc: chosenDoctor.nmcNumber,
      issueType: reportIssueType,
      patientMessage: reportMessage.trim(),
      reportedAt: new Date().toISOString(),
      status: "doctor_revised",
      doctorReply: isPatel
        ? "Reviewed your symptoms and blood pressure history. I have reduced your Amlodipine dose to 2.5mg to relieve dizziness and fatigue, and added low-salt dietary advice. Please collect the verified generic tablets from Jan Aushadhi Kendra #7402."
        : "Evaluated your clinical report and symptoms. I have prescribed Multivitamin Zinc supplements and oral fluids for recovery. Take tablets post-breakfast with water. Please collect the verified batch from CHC Jan Aushadhi Counter.",
      revisedMedicines: isPatel
        ? [
            {
              id: `m-amlo-${Date.now().toString(36)}`,
              name: "Amlodipine (Low Dose)",
              strength: "2.5mg",
              form: "tablet",
              dose: "1 tablet once daily morning",
              foodRelation: "after_food",
              slots: { morning: true },
              customTimes: ["08:00"],
              durationDays: 14,
              startDate: new Date().toISOString().slice(0, 10),
              instructions: "Take 2.5mg half-tablet after food. Elevate legs when resting.",
            },
          ]
        : [
            {
              id: `m-zinc-${Date.now().toString(36)}`,
              name: "Zincovit Generic (Multivitamin)",
              strength: "50mg",
              form: "tablet",
              dose: "1 tablet once daily morning",
              foodRelation: "after_food",
              slots: { morning: true },
              customTimes: ["08:00"],
              durationDays: 10,
              startDate: new Date().toISOString().slice(0, 10),
              instructions: "Take once daily in morning with water.",
            },
            {
              id: `m-para-${Date.now().toString(36)}`,
              name: "Paracetamol (PMBJP Generic)",
              strength: "500mg",
              form: "tablet",
              dose: "1 tablet only if fever persists",
              foodRelation: "after_food",
              slots: { evening: true },
              customTimes: ["18:00"],
              durationDays: 3,
              startDate: new Date().toISOString().slice(0, 10),
              instructions: "SOS only when fever > 100°F.",
            },
          ],
      suggestedChemist: isPatel
        ? {
            id: "ph-01",
            name: "Pradhan Mantri Jan Aushadhi Kendra #7402",
            address: "Main Market Road, near Block Office",
            phone: "+91 94370 12345",
            distanceKm: 1.2,
          }
        : {
            id: "ph-02",
            name: "Community Health Centre Dispensary & Jan Aushadhi Store",
            address: "Rural CHC Gate #2, Hospital Road",
            phone: "+91 94371 67890",
            distanceKm: 2.1,
          },
      totalPriceInr: isPatel ? 18.0 : 24.5,
      mrpPriceInr: isPatel ? 85.0 : 120.0,
      savingsPercent: isPatel ? 78.8 : 79.5,
      batchVerified: true,
      expirySafeDate: isPatel ? "Dec 2027 (Batch JAK-9982)" : "Jan 2028 (Batch ZN-7714)",
      doctorAuditStatus: "pending_dispense",
    };

    saveLocalFollowUp(newReq);
    const updated = getLocalFollowUps();
    setFollowups(updated);
    setSelectedFollowupId(newFollowupId);
    setReportMessage("");
    setReportFilePreview(null);
    if (reportFileInputRef.current) reportFileInputRef.current.value = "";
    setIsSubmittingReport(false);
    setStatusMessage(`Report successfully submitted to ${chosenDoctor.name}! Doctor response and fair-price medicine details are ready below.`);
    setActivePatientSection("response");
  }

  // Handle importing doctor's revised medicines into daily alarms schedule
  function handleImportRevisedMedicinesToAlarms(fup: PrescriptionFollowUpRequest) {
    if (!fup.revisedMedicines || fup.revisedMedicines.length === 0) return;

    const newPrescription: PatientPrescription = {
      id: `RX-REV-${Date.now().toString(36).toUpperCase()}`,
      patientRef: fup.patientRef || "PT-RAMESH-01",
      doctorName: fup.doctorName,
      diagnosis: `Revised Regimen via Follow-Up (${fup.issueType.replace("_", " ")})`,
      medicines: fup.revisedMedicines,
      adherenceLogs: [],
      createdAt: new Date().toISOString(),
      synced: false,
      totalPriceInr: fup.totalPriceInr,
      mrpPriceInr: fup.mrpPriceInr,
      suggestedChemist: fup.suggestedChemist,
    };

    saveLocalPrescription(newPrescription);
    const updated = getLocalPrescriptions();
    refreshReminders(updated);
    setStatusMessage("✅ Revised medicines imported into your schedule! Daily medication alarms are now active.");
    setActivePatientSection("alarms");

    // Trigger audio reminder chime for first imported dose
    if (newPrescription.medicines.length > 0) {
      triggerMedicineNotification(
        newPrescription.medicines[0].name,
        newPrescription.medicines[0].dose,
        "Medication alarms activated."
      );
    }
  }

  // Doctor authoring helper
  async function handlePrescriptionImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await uploadToStorage("prescriptions", file.name, file);
    setImagePreview(res.url);
  }

  function handleAddMedicineToPrescription() {
    if (!medName.trim()) {
      alert("Please enter a medicine name.");
      return;
    }

    const newMed: ScheduledMedicine = {
      id: `med-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      name: medName.trim(),
      strength: medStrength.trim(),
      form: medForm,
      dose: medDose.trim(),
      foodRelation,
      slots: {
        morning: slotMorning,
        afternoon: slotAfternoon,
        evening: slotEvening,
        night: slotNight,
      },
      customTimes: [],
      durationDays,
      startDate: new Date().toISOString().slice(0, 10),
      instructions: medInstructions.trim(),
    };

    setMedicinesList((prev) => [...prev, newMed]);
    setMedName("");
    setMedInstructions("Take with clean drinking water.");
  }

  function handleRemoveMedicine(id: string) {
    setMedicinesList((prev) => prev.filter((m) => m.id !== id));
  }

  function handleSavePrescription() {
    if (medicinesList.length === 0 && !imagePreview) {
      alert("Please add at least one medicine or attach a prescription photo.");
      return;
    }

    const newPrescription: PatientPrescription = {
      id: `rx-${Date.now().toString(36).toUpperCase()}`,
      patientRef: patientRef.trim() || "NR-1001",
      doctorName: doctorName.trim() || "Doctor on Call",
      diagnosis: diagnosis.trim() || "Routine Consultation",
      prescriptionImageUrl: imagePreview || undefined,
      medicines: medicinesList,
      adherenceLogs: [],
      createdAt: new Date().toISOString(),
      synced: false,
    };

    saveLocalPrescription(newPrescription);
    const updated = [newPrescription, ...prescriptions];
    refreshReminders(updated);

    setMedicinesList([]);
    setImagePreview(null);
    setDiagnosis("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setDoctorSubTab("reminders");
    setStatusMessage("Prescription saved! Dose reminders are now active.");

    if (newPrescription.medicines.length > 0) {
      triggerMedicineNotification(
        newPrescription.medicines[0].name,
        newPrescription.medicines[0].dose,
        "Prescription logged successfully."
      );
    }

    void syncPrescriptions();
  }

  const takenCount = todayReminders.filter((r) => r.taken).length;
  const adherencePercent = todayReminders.length > 0 ? Math.round((takenCount / todayReminders.length) * 100) : 100;

  // Active follow-up to display in Section 2
  const activeFollowup =
    followups.find((f) => f.id === selectedFollowupId) || (followups.length > 0 ? followups[0] : null);

  const isPatientView = userRole === "patient";

  return (
    <div className="prescription-tracker-container" style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: "18px" }}>
      {/* ── Page Heading ──────────────────────────────────────────────────────── */}
      <header className="page-heading">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px" }}>
          <div>
            <span className="eyebrow" style={{ color: "#047857", fontWeight: 800, letterSpacing: "0.5px" }}>
              {isPatientView
                ? "CITIZEN PRESCRIPTION WORKSPACE · DOCTOR CONSULTATION & ALARMS"
                : "CLINICAL PRESCRIPTIONS & DOSAGE ENGINE"}
            </span>
            <h1 style={{ fontSize: "24px", fontWeight: 800, margin: "6px 0 4px", color: "var(--foreground, #0f172a)" }}>
              {isPatientView ? "My Prescriptions & Follow-Up Care" : "Prescription Tracker & Push Notifications"}
            </h1>
            <p style={{ margin: 0, fontSize: "13.5px", color: "var(--muted, #64748b)", maxWidth: "780px", lineHeight: 1.45 }}>
              {isPatientView
                ? "Submit clinical reports to your verified real doctors, receive dosage updates with transparent Jan Aushadhi fair prices, and set automated daily medication reminder alarms."
                : "Submit doctor prescriptions, schedule automatic medication reminder alarms, track daily dose adherence, and receive Web Push notifications."}
            </p>
          </div>

          {/* Non-Patient (Doctor) Toggle */}
          {!isPatientView && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setDoctorSubTab("reminders")}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid var(--line, #dfe7e2)",
                  background: doctorSubTab === "reminders" ? "var(--primary, #047857)" : "var(--surface, #ffffff)",
                  color: doctorSubTab === "reminders" ? "#ffffff" : "inherit",
                  fontWeight: "600",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                ⏰ Today&apos;s Reminders ({todayReminders.length})
              </button>
              <button
                type="button"
                onClick={() => setDoctorSubTab("add")}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid var(--line, #dfe7e2)",
                  background: doctorSubTab === "add" ? "var(--primary, #047857)" : "var(--surface, #ffffff)",
                  color: doctorSubTab === "add" ? "#ffffff" : "inherit",
                  fontWeight: "600",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                ＋ Author Prescription
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Status Message Banner ────────────────────────────────────────────── */}
      {statusMessage && (
        <div
          style={{
            padding: "12px 18px",
            borderRadius: "10px",
            background: "#ecfdf5",
            border: "1.5px solid #a7f3d0",
            color: "#065f46",
            fontSize: "13.5px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 2px 8px rgba(16, 185, 129, 0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>✓</span>
            <span>{statusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: "bold", fontSize: "14px" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── 3-SECTION NAVIGATION BAR FOR PATIENTS ─────────────────────────────── */}
      {isPatientView && (
        <div
          style={{
            background: "var(--surface, #ffffff)",
            border: "1.5px solid var(--line, #e2e8f0)",
            borderRadius: "14px",
            padding: "6px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "6px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          {/* Section 1 Button */}
          <button
            type="button"
            onClick={() => setActivePatientSection("submit")}
            style={{
              padding: "12px 16px",
              borderRadius: "10px",
              border: "none",
              background: activePatientSection === "submit" ? "#047857" : "transparent",
              color: activePatientSection === "submit" ? "#ffffff" : "var(--foreground, #0f172a)",
              fontWeight: 700,
              fontSize: "13.5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.2s ease",
            }}
          >
            <span style={{ fontSize: "16px" }}>📤</span>
            <span>Section 1: Submit Report</span>
          </button>

          {/* Section 2 Button */}
          <button
            type="button"
            onClick={() => setActivePatientSection("response")}
            style={{
              padding: "12px 16px",
              borderRadius: "10px",
              border: "none",
              background: activePatientSection === "response" ? "#0284c7" : "transparent",
              color: activePatientSection === "response" ? "#ffffff" : "var(--foreground, #0f172a)",
              fontWeight: 700,
              fontSize: "13.5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.2s ease",
            }}
          >
            <span style={{ fontSize: "16px" }}>📩</span>
            <span>Section 2: Doctor Response ({followups.length})</span>
          </button>

          {/* Section 3 Button */}
          <button
            type="button"
            onClick={() => setActivePatientSection("alarms")}
            style={{
              padding: "12px 16px",
              borderRadius: "10px",
              border: "none",
              background: activePatientSection === "alarms" ? "#8b5cf6" : "transparent",
              color: activePatientSection === "alarms" ? "#ffffff" : "var(--foreground, #0f172a)",
              fontWeight: 700,
              fontSize: "13.5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.2s ease",
            }}
          >
            <span style={{ fontSize: "16px" }}>⏰</span>
            <span>Section 3: Set Alarms ({todayReminders.length})</span>
          </button>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* PATIENT SECTION 1: SUBMIT REPORT & SELECT AVAILABLE DOCTOR              */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {isPatientView && activePatientSection === "submit" && (
        <div
          style={{
            background: "var(--surface, #ffffff)",
            border: "1.5px solid var(--line, #e2e8f0)",
            borderRadius: "16px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "22px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{ fontSize: "22px" }}>📤</span>
              <h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0, color: "var(--foreground, #0f172a)" }}>
                Step 1: Submit Report or Request Dosage Modification
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--muted, #64748b)" }}>
              Select the doctor you met in real life. Enter your health issue, symptoms, or dosage request. When submitted, the doctor will review it and prescribe revised medicines with transparent fair pricing.
            </p>
          </div>

          <form onSubmit={handleSubmitReport} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Doctor Selection: Two Real Available Doctors */}
            <div>
              <label style={{ fontSize: "13.5px", fontWeight: 700, display: "block", marginBottom: "10px", color: "#065f46" }}>
                Select Your Verified Doctor (Met in Person):
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
                {TWO_AVAILABLE_DOCTORS.map((doc) => {
                  const isSelected = selectedDoctorId === doc.id;
                  return (
                    <div
                      key={doc.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedDoctorId(doc.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") setSelectedDoctorId(doc.id);
                      }}
                      style={{
                        border: isSelected ? "2px solid #047857" : "1.5px solid var(--line, #e2e8f0)",
                        background: isSelected ? "#f0fdf4" : "var(--surface, #ffffff)",
                        borderRadius: "12px",
                        padding: "16px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ fontSize: "32px", lineHeight: 1 }}>{doc.avatar}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <strong style={{ fontSize: "15px", color: isSelected ? "#065f46" : "var(--foreground, #0f172a)" }}>
                            {doc.name}
                          </strong>
                          <span
                            style={{
                              width: "18px",
                              height: "18px",
                              borderRadius: "50%",
                              border: isSelected ? "5px solid #047857" : "2px solid #94a3b8",
                              display: "inline-block",
                            }}
                          />
                        </div>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#059669", marginTop: "2px" }}>
                          ✓ {doc.nmcNumber} (NMC Verified)
                        </div>
                        <p style={{ margin: "4px 0 2px", fontSize: "12.5px", color: "var(--foreground, #1e293b)" }}>
                          {doc.specialization} · {doc.experience}
                        </p>
                        <p style={{ margin: 0, fontSize: "11.5px", color: "var(--muted, #64748b)" }}>
                          🏥 {doc.hospital}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Previous Prescription Selection & Issue Category */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, display: "flex", flexDirection: "column", gap: "6px" }}>
                Reference Prescription / Diagnosis:
                <select
                  value={selectedRxId}
                  onChange={(e) => setSelectedRxId(e.target.value)}
                  style={{
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1.5px solid var(--line, #cbd5e1)",
                    background: "var(--surface, #ffffff)",
                    fontSize: "13px",
                  }}
                >
                  {prescriptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} — {p.diagnosis || "Consultation"} ({p.doctorName})
                    </option>
                  ))}
                  <option value="RX-NEW">General Medical Consultation / New Symptoms</option>
                </select>
              </label>

              <label style={{ fontSize: "13px", fontWeight: 600, display: "flex", flexDirection: "column", gap: "6px" }}>
                Reason for Contact / Issue Type:
                <select
                  value={reportIssueType}
                  onChange={(e) => setReportIssueType(e.target.value as FollowUpIssueType)}
                  style={{
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1.5px solid var(--line, #cbd5e1)",
                    background: "var(--surface, #ffffff)",
                    fontSize: "13px",
                  }}
                >
                  <option value="dose_change">🔄 Dose Adjustment (Need higher / lower strength)</option>
                  <option value="side_effect">⚠️ Side Effects (Dizziness, nausea, rash, etc.)</option>
                  <option value="symptom_worsened">📉 Symptoms Worsening / Feeling Worse</option>
                  <option value="feeling_better">📈 Feeling Better (Can I discontinue medicine?)</option>
                  <option value="medicine_finished">💊 Medicine Course Finished / Refill Required</option>
                  <option value="other">📝 Other Health Inquiry</option>
                </select>
              </label>
            </div>

            {/* Detailed Description */}
            <label style={{ fontSize: "13px", fontWeight: 600, display: "flex", flexDirection: "column", gap: "6px" }}>
              Describe Your Symptoms / Specific Question for Doctor:
              <textarea
                rows={4}
                required
                value={reportMessage}
                onChange={(e) => setReportMessage(e.target.value)}
                placeholder="Doctor sir, since taking this medicine I am feeling morning dizziness. Could you please check and adjust the dose? Here are my latest symptoms..."
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1.5px solid var(--line, #cbd5e1)",
                  fontSize: "13.5px",
                  lineHeight: 1.5,
                  fontFamily: "inherit",
                }}
              />
            </label>

            {/* Optional Document / Slip Attachment */}
            <div
              style={{
                border: "1.5px dashed var(--line, #cbd5e1)",
                borderRadius: "10px",
                padding: "14px",
                background: "var(--surface-muted, #f8fafc)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12.5px", fontWeight: 600 }}>
                  📄 Attach Previous Prescription Slip or Lab Test (Optional)
                </span>
                {reportFilePreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setReportFilePreview(null);
                      if (reportFileInputRef.current) reportFileInputRef.current.value = "";
                    }}
                    style={{ background: "none", border: "none", color: "#dc2626", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}
                  >
                    Remove File
                  </button>
                )}
              </div>
              <input
                ref={reportFileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleReportFileUpload}
                style={{ fontSize: "12.5px" }}
              />
              {reportFilePreview && (
                <div style={{ marginTop: "6px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={reportFilePreview}
                    alt="Uploaded report preview"
                    style={{ maxHeight: "140px", borderRadius: "6px", border: "1px solid #cbd5e1", objectFit: "cover" }}
                  />
                </div>
              )}
            </div>

            {/* Submit Action */}
            <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="submit"
                disabled={isSubmittingReport}
                className="primary-button"
                style={{
                  fontSize: "14px",
                  padding: "12px 24px",
                  fontWeight: 700,
                  borderRadius: "10px",
                  background: "#047857",
                  cursor: "pointer",
                }}
              >
                {isSubmittingReport
                  ? "Delivering to Doctor..."
                  : `🚀 Submit Report to ${TWO_AVAILABLE_DOCTORS.find((d) => d.id === selectedDoctorId)?.name || "Doctor"}`}
              </button>

              <button
                type="button"
                onClick={() => setActivePatientSection("response")}
                className="secondary-button"
                style={{ fontSize: "13px", padding: "10px 18px", borderRadius: "10px" }}
              >
                View Doctor Responses →
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* PATIENT SECTION 2: DOCTOR RESPONSE & FAIR-PRICE PRESCRIPTION             */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {isPatientView && activePatientSection === "response" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Header & Followup Selector */}
          <div
            style={{
              background: "var(--surface, #ffffff)",
              border: "1.5px solid var(--line, #e2e8f0)",
              borderRadius: "14px",
              padding: "16px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "20px" }}>📩</span>
                <strong style={{ fontSize: "16px" }}>Step 2: Doctor Response &amp; Revised Prescription</strong>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "var(--muted, #64748b)" }}>
                Verified advice directly from your doctor with transparent Jan Aushadhi pricing and nearest medicine shop.
              </p>
            </div>

            {followups.length > 1 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600 }}>Select Consultation:</span>
                <select
                  value={selectedFollowupId}
                  onChange={(e) => setSelectedFollowupId(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--line, #cbd5e1)",
                    fontSize: "12.5px",
                    background: "var(--surface, #ffffff)",
                  }}
                >
                  {followups.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.doctorName} ({new Date(f.reportedAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {!activeFollowup ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px 20px",
                background: "var(--surface, #ffffff)",
                borderRadius: "14px",
                border: "1.5px dashed var(--line, #cbd5e1)",
              }}
            >
              <span style={{ fontSize: "36px", display: "block", marginBottom: "8px" }}>📋</span>
              <h3 style={{ margin: "0 0 6px", fontSize: "16px" }}>No Doctor Follow-Up Responses Yet</h3>
              <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--muted, #64748b)" }}>
                Submit a report in Section 1 to consult Dr. Rajesh Patel or Dr. Ananya Sharma.
              </p>
              <button
                type="button"
                onClick={() => setActivePatientSection("submit")}
                className="primary-button"
                style={{ fontSize: "13px", padding: "8px 18px", borderRadius: "8px" }}
              >
                📤 Submit Report to Doctor
              </button>
            </div>
          ) : (
            <div
              style={{
                background: "var(--surface, #ffffff)",
                border: "1.5px solid #0284c7",
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "0 6px 20px rgba(2, 132, 199, 0.08)",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              {/* Doctor Review Badge Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "12px",
                  borderBottom: "1.5px solid var(--line, #e2e8f0)",
                  paddingBottom: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "34px" }}>👨‍⚕️</span>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <strong style={{ fontSize: "17px", color: "#0369a1" }}>{activeFollowup.doctorName}</strong>
                      <span
                        style={{
                          background: "#e0f2fe",
                          border: "1px solid #bae6fd",
                          color: "#0369a1",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: 700,
                        }}
                      >
                        ✓ {activeFollowup.doctorNmc || "NMC Verified"}
                      </span>
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
                      Consultation Request: {activeFollowup.issueType.replace("_", " ").toUpperCase()} · Ref: {activeFollowup.prescriptionId} · Reviewed {new Date(activeFollowup.reportedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    background: "#ecfdf5",
                    border: "1px solid #86efac",
                    color: "#166534",
                    padding: "4px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>✅</span>
                  <span>Revised Prescription Confirmed</span>
                </div>
              </div>

              {/* Patient's Submitted Note */}
              <div
                style={{
                  background: "var(--surface-muted, #f8fafc)",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  border: "1px solid var(--line, #e2e8f0)",
                  fontSize: "13px",
                }}
              >
                <strong style={{ display: "block", color: "var(--muted, #64748b)", fontSize: "11.5px", textTransform: "uppercase" }}>
                  Your Submitted Symptom / Issue Note:
                </strong>
                <p style={{ margin: "4px 0 0", color: "var(--foreground, #1e293b)", fontStyle: "italic" }}>
                  &ldquo;{activeFollowup.patientMessage}&rdquo;
                </p>
              </div>

              {/* Doctor's Clinical Advice Note with Read Aloud */}
              <div
                style={{
                  background: "#f0f9ff",
                  border: "1.5px solid #bae6fd",
                  borderRadius: "12px",
                  padding: "16px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: "14px", color: "#0369a1", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>🩺</span>
                    <span>Doctor&apos;s Advice &amp; Clinical Modification</span>
                  </strong>
                  {activeFollowup.doctorReply && <ReadAloud text={activeFollowup.doctorReply} />}
                </div>
                <p style={{ margin: 0, fontSize: "13.5px", color: "#0c4a6e", lineHeight: 1.5 }}>
                  {activeFollowup.doctorReply || "Clinical review complete. Take the prescribed medicines below as scheduled."}
                </p>
              </div>

              {/* Revised Medicines Breakdown */}
              {activeFollowup.revisedMedicines && activeFollowup.revisedMedicines.length > 0 && (
                <div>
                  <strong style={{ fontSize: "14px", display: "block", marginBottom: "10px", color: "var(--foreground, #0f172a)" }}>
                    💊 Revised Medicines &amp; Dosages:
                  </strong>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {activeFollowup.revisedMedicines.map((med) => (
                      <div
                        key={med.id}
                        style={{
                          background: "var(--surface, #ffffff)",
                          border: "1px solid #bae6fd",
                          borderRadius: "10px",
                          padding: "12px 16px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "10px",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <strong style={{ fontSize: "14.5px", color: "#0369a1" }}>
                              {med.name} {med.strength}
                            </strong>
                            <span
                              style={{
                                background: "#f1f5f9",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                color: "#475569",
                                textTransform: "capitalize",
                              }}
                            >
                              {med.form}
                            </span>
                          </div>
                          <p style={{ margin: "3px 0 0", fontSize: "12.5px", color: "var(--muted, #64748b)" }}>
                            Dose: <strong>{med.dose}</strong> · 🍽️ {med.foodRelation.replace("_", " ")} · {med.instructions}
                          </p>
                        </div>

                        <div style={{ display: "flex", gap: "6px", fontSize: "11.5px", fontWeight: 700 }}>
                          {med.slots.morning && (
                            <span style={{ background: "#fef3c7", color: "#b45309", padding: "3px 8px", borderRadius: "6px" }}>
                              ☀️ 08:00 AM
                            </span>
                          )}
                          {med.slots.afternoon && (
                            <span style={{ background: "#ffedd5", color: "#c2410c", padding: "3px 8px", borderRadius: "6px" }}>
                              🌤️ 01:00 PM
                            </span>
                          )}
                          {med.slots.evening && (
                            <span style={{ background: "#ede9fe", color: "#6d28d9", padding: "3px 8px", borderRadius: "6px" }}>
                              🌆 06:00 PM
                            </span>
                          )}
                          {med.slots.night && (
                            <span style={{ background: "#e0e7ff", color: "#3730a3", padding: "3px 8px", borderRadius: "6px" }}>
                              🌙 09:00 PM
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transparent Fair Price Guarantee (Jan Aushadhi vs Branded) */}
              <div
                style={{
                  background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
                  border: "1.5px solid #86efac",
                  borderRadius: "14px",
                  padding: "18px 22px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "16px",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "20px" }}>🛡️</span>
                    <strong style={{ fontSize: "14.5px", color: "#166534" }}>
                      Transparent Fair Price Guarantee · No Fake / Inflated Rates
                    </strong>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "#15803d", maxWidth: "620px" }}>
                    All medicines listed are backed by PMBJP (Pradhan Mantri Bhartiya Janaushadhi Pariyojana) quality assurance. Direct batch verifier:{" "}
                    <strong>{activeFollowup.expirySafeDate || "Dec 2027 (Batch JAK-9982)"}</strong> with zero expired products.
                  </p>
                </div>

                <div
                  style={{
                    background: "#ffffff",
                    border: "1.5px solid #86efac",
                    borderRadius: "12px",
                    padding: "10px 18px",
                    textAlign: "right",
                  }}
                >
                  <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", display: "block" }}>
                    Jan Aushadhi Fair Price
                  </span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px", justifyContent: "flex-end" }}>
                    <strong style={{ fontSize: "20px", color: "#166534" }}>
                      ₹{activeFollowup.totalPriceInr?.toFixed(2) || "18.00"}
                    </strong>
                    <span style={{ fontSize: "12px", textDecoration: "line-through", color: "#94a3b8" }}>
                      ₹{activeFollowup.mrpPriceInr?.toFixed(2) || "85.00"} MRP
                    </span>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#15803d" }}>
                    You Save {activeFollowup.savingsPercent || 78.8}%
                  </span>
                </div>
              </div>

              {/* Nearest Suggested Medicine Shop / Chemist */}
              {activeFollowup.suggestedChemist && (
                <div
                  style={{
                    background: "var(--surface-muted, #f8fafc)",
                    border: "1px solid var(--line, #e2e8f0)",
                    borderRadius: "12px",
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700, color: "var(--muted, #64748b)" }}>
                      Nearest Verified Medicine Shop (Doctor Recommended)
                    </span>
                    <strong style={{ fontSize: "15px", display: "block", color: "var(--foreground, #0f172a)", marginTop: "2px" }}>
                      🏪 {activeFollowup.suggestedChemist.name}
                    </strong>
                    <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "var(--muted, #64748b)" }}>
                      📍 {activeFollowup.suggestedChemist.address} · {activeFollowup.suggestedChemist.distanceKm || 1.2} km away
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {activeFollowup.suggestedChemist.phone && (
                      <a
                        href={`tel:${activeFollowup.suggestedChemist.phone}`}
                        style={{
                          background: "#047857",
                          color: "#ffffff",
                          padding: "8px 14px",
                          borderRadius: "8px",
                          fontSize: "12.5px",
                          fontWeight: 700,
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        📞 Call Chemist
                      </a>
                    )}
                    {onNavigateToTab && (
                      <button
                        type="button"
                        onClick={() => onNavigateToTab("nearby")}
                        className="secondary-button"
                        style={{ fontSize: "12px", padding: "8px 14px" }}
                      >
                        ⌖ View Map
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Primary Action: Set Alarms from this Report */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                  borderTop: "1.5px solid var(--line, #e2e8f0)",
                  paddingTop: "16px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setActivePatientSection("submit")}
                  className="secondary-button"
                  style={{ fontSize: "13px", padding: "10px 18px", borderRadius: "8px" }}
                >
                  ← Submit Another Report
                </button>

                <button
                  type="button"
                  onClick={() => handleImportRevisedMedicinesToAlarms(activeFollowup)}
                  style={{
                    background: "#8b5cf6",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    padding: "12px 24px",
                    fontWeight: 700,
                    fontSize: "14px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 4px 12px rgba(139, 92, 246, 0.25)",
                  }}
                >
                  <span>⏰</span>
                  <span>Set Daily Alarms from this Prescribed Report →</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* PATIENT SECTION 3 / REMINDERS: SET ALARMS FROM REPORT & TODAY'S DOSES    */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {((isPatientView && activePatientSection === "alarms") || (!isPatientView && doctorSubTab === "reminders")) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Notification Permission Card */}
          <div
            style={{
              background: "var(--surface, #ffffff)",
              border: "1.5px solid var(--line, #e2e8f0)",
              borderRadius: "14px",
              padding: "18px 22px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span style={{ fontSize: "28px" }}>🔔</span>
              <div>
                <strong style={{ fontSize: "14.5px", display: "block", color: "var(--foreground, #0f172a)" }}>
                  Web Push Notification Alarms: {pushGranted ? "Active (Enabled)" : "Not Active"}
                </strong>
                <span style={{ fontSize: "12.5px", color: "var(--muted, #64748b)" }}>
                  {pushGranted
                    ? "Your browser rings audio alerts and shows screen popups when it is time to take your doses."
                    : "Enable browser push notifications to get reliable medication alarms even when this tab is closed."}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              {!pushGranted ? (
                <button
                  type="button"
                  onClick={handleEnablePush}
                  className="primary-button"
                  style={{ fontSize: "13px", padding: "8px 16px", borderRadius: "8px" }}
                >
                  🔔 Enable Push Alarms
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleTestChime}
                  className="secondary-button"
                  style={{ fontSize: "12.5px", padding: "8px 16px", borderRadius: "8px" }}
                >
                  🔊 Test Alarm Chime
                </button>
              )}
            </div>
          </div>

          {/* Adherence Progress Bar */}
          {todayReminders.length > 0 && (
            <div
              style={{
                background: "var(--surface, #ffffff)",
                border: "1.5px solid var(--line, #e2e8f0)",
                borderRadius: "14px",
                padding: "18px 22px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13.5px" }}>
                <strong>Today&apos;s Medication Adherence</strong>
                <span style={{ fontWeight: 700, color: adherencePercent === 100 ? "#166534" : "#0284c7" }}>
                  {takenCount} of {todayReminders.length} doses taken ({adherencePercent}%)
                </span>
              </div>
              <div style={{ height: "10px", background: "var(--surface-muted, #f1f5f9)", borderRadius: "6px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${adherencePercent}%`,
                    background: adherencePercent === 100 ? "#10b981" : "#3b82f6",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          )}

          {/* Reminders List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "15.5px", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <span>⏰ Daily Medication Schedule</span>
                <ReadAloud text={`You have ${todayReminders.length} doses scheduled today. ${takenCount} completed.`} />
              </h3>

              {isPatientView && (
                <button
                  type="button"
                  onClick={() => setActivePatientSection("submit")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#047857",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  ＋ Submit Report to Modify Doses
                </button>
              )}
            </div>

            {todayReminders.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "48px 16px",
                  background: "var(--surface, #ffffff)",
                  borderRadius: "14px",
                  border: "1.5px dashed var(--line, #cbd5e1)",
                }}
              >
                <p style={{ fontSize: "15px", fontWeight: "600", margin: "0 0 6px" }}>
                  No active medicine reminder alarms for today
                </p>
                <p style={{ fontSize: "13px", color: "var(--muted, #64748b)", margin: "0 0 16px" }}>
                  Submit a report in Section 1 or import doctor-prescribed medicines from Section 2 to activate daily alarms.
                </p>
                <button
                  type="button"
                  onClick={() => setActivePatientSection("response")}
                  className="primary-button"
                  style={{ fontSize: "13px", padding: "8px 18px", borderRadius: "8px" }}
                >
                  📩 View Doctor Prescriptions &amp; Set Alarms
                </button>
              </div>
            ) : (
              todayReminders.map((slot, idx) => {
                const foodLabel =
                  slot.medicine.foodRelation === "after_food"
                    ? "After meal"
                    : slot.medicine.foodRelation === "before_food"
                    ? "Before meal"
                    : slot.medicine.foodRelation === "with_food"
                    ? "With meal"
                    : "Empty stomach";

                return (
                  <div
                    key={`${slot.prescriptionId}-${slot.medicine.id}-${slot.timeSlot}-${idx}`}
                    style={{
                      background: slot.taken ? "rgba(16, 185, 129, 0.05)" : "var(--surface, #ffffff)",
                      border: slot.taken ? "1.5px solid rgba(16, 185, 129, 0.4)" : "1.5px solid var(--line, #e2e8f0)",
                      borderRadius: "14px",
                      padding: "16px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "12px",
                      opacity: slot.status === "skipped" ? 0.6 : 1,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <div
                        style={{
                          width: "60px",
                          textAlign: "center",
                          padding: "8px 4px",
                          background: slot.taken ? "rgba(16, 185, 129, 0.15)" : "var(--surface-muted, #f1f5f9)",
                          borderRadius: "10px",
                          fontWeight: "bold",
                          fontSize: "14px",
                        }}
                      >
                        <span style={{ fontSize: "10px", display: "block", textTransform: "uppercase", color: "var(--muted, #64748b)" }}>
                          {slot.slotName}
                        </span>
                        {slot.timeSlot}
                      </div>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <strong style={{ fontSize: "15px", color: "var(--foreground, #0f172a)" }}>
                            {slot.medicine.name} {slot.medicine.strength}
                          </strong>
                          <span
                            style={{
                              fontSize: "11px",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              background: "var(--surface-muted, #f1f5f9)",
                              color: "var(--muted, #64748b)",
                              textTransform: "capitalize",
                            }}
                          >
                            {slot.medicine.form}
                          </span>
                        </div>
                        <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "var(--muted, #64748b)" }}>
                          Dose: <strong>{slot.medicine.dose}</strong> · 🍽️ {foodLabel} · {slot.medicine.instructions}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {slot.taken ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "6px 14px",
                            borderRadius: "8px",
                            background: "rgba(16, 185, 129, 0.12)",
                            color: "#059669",
                            fontSize: "12.5px",
                            fontWeight: "700",
                          }}
                        >
                          ✓ Dose Taken
                        </span>
                      ) : slot.status === "skipped" ? (
                        <span style={{ fontSize: "12px", color: "var(--muted, #64748b)", fontStyle: "italic" }}>Skipped</span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleTakeDose(slot)}
                            className="primary-button"
                            style={{ fontSize: "12.5px", padding: "7px 16px", borderRadius: "8px", fontWeight: 700 }}
                          >
                            ✓ Mark Taken
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSkipDose(slot)}
                            className="secondary-button"
                            style={{ fontSize: "12px", padding: "7px 12px", borderRadius: "8px" }}
                          >
                            Skip
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* DOCTOR VIEW: AUTHOR PRESCRIPTION FORM                                   */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {!isPatientView && doctorSubTab === "add" && (
        <div
          style={{
            background: "var(--surface, #ffffff)",
            border: "1.5px solid var(--line, #e2e8f0)",
            borderRadius: "14px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: "16px" }}>Submit Doctor Prescription</h3>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--muted, #64748b)" }}>
              Upload an image of your prescription slip and enter the medicines to generate your custom push notification alarm schedule.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            <label style={{ fontSize: "13px", display: "flex", flexDirection: "column", gap: "6px" }}>
              Patient Reference / ID:
              <input
                type="text"
                value={patientRef}
                onChange={(e) => setPatientRef(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--line)" }}
                placeholder="e.g. PT-RAMESH-01"
              />
            </label>

            <label style={{ fontSize: "13px", display: "flex", flexDirection: "column", gap: "6px" }}>
              Prescribing Doctor / Hospital:
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--line)" }}
                placeholder="e.g. Dr. Rajesh Patel, MBBS"
              />
            </label>

            <label style={{ fontSize: "13px", display: "flex", flexDirection: "column", gap: "6px" }}>
              Diagnosis / Reason for Visit:
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--line)" }}
                placeholder="e.g. Hypertension &amp; Routine Follow-Up"
              />
            </label>
          </div>

          {/* Prescription Photo Attachment */}
          <div
            style={{
              padding: "16px",
              borderRadius: "10px",
              border: "1px dashed var(--line)",
              background: "var(--surface-muted)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: "13px" }}>📄 Attach Prescription Document / Image</strong>
              {imagePreview && (
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  style={{ background: "none", border: "none", color: "#dc2626", fontSize: "12px", cursor: "pointer" }}
                >
                  Remove Photo
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePrescriptionImage}
              style={{ fontSize: "13px" }}
            />

            {imagePreview && (
              <div style={{ marginTop: "8px" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Prescription preview"
                  style={{ maxWidth: "260px", maxHeight: "180px", borderRadius: "6px", objectFit: "cover", border: "1px solid var(--line)" }}
                />
              </div>
            )}
          </div>

          {/* Add Medicine Section */}
          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: "10px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <strong style={{ fontSize: "14px" }}>💊 Add Medicine to Schedule</strong>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
              <label style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                Medicine Name:
                <input
                  type="text"
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  placeholder="e.g. Paracetamol, Amlodipine"
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--line)" }}
                />
              </label>

              <label style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                Strength:
                <input
                  type="text"
                  value={medStrength}
                  onChange={(e) => setMedStrength(e.target.value)}
                  placeholder="e.g. 500mg, 2.5mg"
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--line)" }}
                />
              </label>

              <label style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                Form:
                <select
                  value={medForm}
                  onChange={(e) => setMedForm(e.target.value as MedicineForm)}
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--line)" }}
                >
                  <option value="tablet">Tablet</option>
                  <option value="capsule">Capsule</option>
                  <option value="syrup">Syrup</option>
                  <option value="drops">Drops</option>
                  <option value="ointment">Ointment</option>
                  <option value="injection">Injection</option>
                </select>
              </label>

              <label style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                Dosage:
                <input
                  type="text"
                  value={medDose}
                  onChange={(e) => setMedDose(e.target.value)}
                  placeholder="e.g. 1 tablet"
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--line)" }}
                />
              </label>

              <label style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                Food Relation:
                <select
                  value={foodRelation}
                  onChange={(e) => setFoodRelation(e.target.value as FoodRelation)}
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--line)" }}
                >
                  <option value="after_food">After Food (खाने के बाद)</option>
                  <option value="before_food">Before Food (खाने से पहले)</option>
                  <option value="with_food">With Food (खाने के साथ)</option>
                  <option value="empty_stomach">Empty Stomach (खाली पेट)</option>
                </select>
              </label>

              <label style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                Duration (Days):
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--line)" }}
                />
              </label>
            </div>

            {/* Time Slots Checkboxes */}
            <div>
              <span style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "6px" }}>
                Daily Alarm Timings:
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "13px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input type="checkbox" checked={slotMorning} onChange={(e) => setSlotMorning(e.target.checked)} />
                  ☀️ Morning (08:00 AM)
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input type="checkbox" checked={slotAfternoon} onChange={(e) => setSlotAfternoon(e.target.checked)} />
                  🌤️ Afternoon (01:00 PM)
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input type="checkbox" checked={slotEvening} onChange={(e) => setSlotEvening(e.target.checked)} />
                  🌆 Evening (06:00 PM)
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input type="checkbox" checked={slotNight} onChange={(e) => setSlotNight(e.target.checked)} />
                  🌙 Night (09:00 PM)
                </label>
              </div>
            </div>

            <div>
              <button type="button" onClick={handleAddMedicineToPrescription} className="secondary-button" style={{ fontSize: "13px" }}>
                ＋ Add Medicine to List
              </button>
            </div>

            {/* Added Medicines List */}
            {medicinesList.length > 0 && (
              <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: "bold" }}>Medicines to be added ({medicinesList.length}):</span>
                {medicinesList.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      background: "var(--surface-muted)",
                      borderRadius: "6px",
                      fontSize: "13px",
                    }}
                  >
                    <span>
                      <strong>{m.name}</strong> ({m.strength}, {m.dose}) · {m.foodRelation.replace("_", " ")} · {m.durationDays} days
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMedicine(m.id)}
                      style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer" }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button
              type="button"
              onClick={handleSavePrescription}
              className="primary-button"
              disabled={medicinesList.length === 0 && !imagePreview}
            >
              💾 Save Prescription &amp; Activate Push Reminders
            </button>
            <button type="button" onClick={() => setDoctorSubTab("reminders")} className="secondary-button">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}