"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import {
  getLocalPrescriptions,
  saveLocalPrescription,
  getTodayReminders,
  logAdherence,
  requestNotificationPermission,
  triggerMedicineNotification,
  syncPrescriptions,
  type TodayReminderSlot,
} from "@/lib/prescriptions/storage";
import type { PatientPrescription, ScheduledMedicine, MedicineForm, FoodRelation } from "@/lib/prescriptions/types";
import { useLanguage } from "@/lib/i18n/provider";
import { ReadAloud } from "./read-aloud";

import { createClient, uploadToStorage, type Profile } from "@/lib/supabase/client";

interface PrescriptionTrackerProps {
  userRole?: "patient" | "doctor" | "health_worker" | "chemist" | "admin";
}

export default function PrescriptionTracker({ userRole }: PrescriptionTrackerProps = {}) {
  const { t } = useLanguage();
  const [prescriptions, setPrescriptions] = useState<PatientPrescription[]>([]);
  const [todayReminders, setTodayReminders] = useState<TodayReminderSlot[]>([]);
  const [pushGranted, setPushGranted] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"reminders" | "add">("reminders");
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);

  // Form states for adding prescription
  const [patientRef, setPatientRef] = useState("NR-1001");
  const [doctorName, setDoctorName] = useState("Dr. R. Sharma (PHC)");
  const [diagnosis, setDiagnosis] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Current medicines in the prescription being authored
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

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Load local data on mount and check doctor session
  useEffect(() => {
    const list = getLocalPrescriptions();
    setPrescriptions(list);
    setTodayReminders(getTodayReminders(list));

    if (typeof window !== "undefined" && "Notification" in window) {
      setPushGranted(Notification.permission === "granted");
    }

    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle<Profile>().then(({ data: prof }) => {
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

    // Try background sync
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
    triggerMedicineNotification("Paracetamol 500mg", "1 tablet", "Take after food with water.");
  }

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

    // Reset form
    setMedicinesList([]);
    setImagePreview(null);
    setDiagnosis("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setActiveSubTab("reminders");
    setStatusMessage("Prescription saved! Dose reminders are now active.");

    // Trigger test reminder chime
    if (newPrescription.medicines.length > 0) {
      triggerMedicineNotification(
        newPrescription.medicines[0].name,
        newPrescription.medicines[0].dose,
        "Prescription logged successfully."
      );
    }

    // Try sync in background
    void syncPrescriptions();
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

  const takenCount = todayReminders.filter((r) => r.taken).length;
  const adherencePercent = todayReminders.length > 0 ? Math.round((takenCount / todayReminders.length) * 100) : 100;

  return (
    <div className="prescription-tracker-container" style={{ padding: "0 4px" }}>
      <header className="page-heading" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <span className="eyebrow">
              {userRole === "patient" ? "CITIZEN PRESCRIPTION WALLET & DOSAGE ALARMS" : "CLINICAL PRESCRIPTIONS & DOSAGE ENGINE"}
            </span>
            <h1>{userRole === "patient" ? "My Prescriptions & Reminder Alarms" : "Prescription Tracker & Push Notifications"}</h1>
            <p>
              {userRole === "patient"
                ? "View your active doctor prescriptions, medication dosage times, daily alarms, and your digital QR pass for the pharmacy."
                : "Submit doctor prescriptions, schedule automatic medication reminder alarms, track daily dose adherence, and receive Web Push notifications."}
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => setActiveSubTab("reminders")}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid var(--line)",
                background: activeSubTab === "reminders" ? "var(--primary)" : "var(--surface)",
                color: activeSubTab === "reminders" ? "#ffffff" : "inherit",
                fontWeight: "600",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              ⏰ {userRole === "patient" ? "My Daily Medication Alarms" : "Today's Reminders"} ({todayReminders.length})
            </button>
            {userRole !== "patient" && (
              <button
                type="button"
                onClick={() => setActiveSubTab("add")}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid var(--line)",
                  background: activeSubTab === "add" ? "var(--primary)" : "var(--surface)",
                  color: activeSubTab === "add" ? "#ffffff" : "inherit",
                  fontWeight: "600",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                ＋ Author Prescription
              </button>
            )}
          </div>
        </div>
      </header>

      {statusMessage && (
        <div
          style={{
            padding: "10px 16px",
            marginBottom: "16px",
            borderRadius: "8px",
            background: "rgba(16, 185, 129, 0.12)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            color: "#059669",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>✓ {statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: "bold" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* SUB-TAB 1: TODAY'S DOSAGE REMINDERS & NOTIFICATION STATUS */}
      {activeSubTab === "reminders" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Notification Permission Card */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "12px",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "24px" }}>🔔</span>
              <div>
                <strong style={{ fontSize: "14px", display: "block" }}>
                  Web Push Notification Alerts: {pushGranted ? "Active (Enabled)" : "Not Active"}
                </strong>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                  {pushGranted
                    ? "Your browser will ring alerts and show popups when it is time to take your medicines."
                    : "Enable browser push notifications to get reminders even when this tab is closed."}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              {!pushGranted ? (
                <button type="button" onClick={handleEnablePush} className="primary-button" style={{ fontSize: "13px" }}>
                  🔔 Enable Push Notifications
                </button>
              ) : (
                <button type="button" onClick={handleTestChime} className="secondary-button" style={{ fontSize: "12px" }}>
                  🔊 Test Alarm Chime
                </button>
              )}
            </div>
          </div>

          {/* Adherence Progress Bar */}
          {todayReminders.length > 0 && (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "12px",
                padding: "16px 20px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
                <strong>Today&apos;s Medication Adherence</strong>
                <span>
                  {takenCount} of {todayReminders.length} doses taken ({adherencePercent}%)
                </span>
              </div>
              <div style={{ height: "8px", background: "var(--surface-muted)", borderRadius: "4px", overflow: "hidden" }}>
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
            <h3 style={{ fontSize: "15px", margin: "4px 0 0", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>Daily Dose Schedule</span>
              <ReadAloud text={`You have ${todayReminders.length} doses scheduled today. ${takenCount} completed.`} />
            </h3>

            {todayReminders.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "48px 16px",
                  background: "var(--surface)",
                  borderRadius: "12px",
                  border: "1px dashed var(--line)",
                }}
              >
                <p style={{ fontSize: "15px", fontWeight: "500", margin: "0 0 6px" }}>No active medicine reminders for today</p>
                <p style={{ fontSize: "13px", color: "var(--muted)", margin: "0 0 16px" }}>
                  Click &quot;Submit Prescription&quot; to upload a doctor&apos;s prescription and set automated alarms.
                </p>
                <button type="button" onClick={() => setActiveSubTab("add")} className="primary-button" style={{ fontSize: "13px" }}>
                  ＋ Submit Your First Prescription
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
                      background: slot.taken ? "rgba(16, 185, 129, 0.04)" : "var(--surface)",
                      border: slot.taken ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid var(--line)",
                      borderRadius: "12px",
                      padding: "16px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "12px",
                      opacity: slot.status === "skipped" ? 0.6 : 1,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <div
                        style={{
                          width: "56px",
                          textAlign: "center",
                          padding: "6px 4px",
                          background: slot.taken ? "rgba(16, 185, 129, 0.12)" : "var(--surface-muted)",
                          borderRadius: "8px",
                          fontWeight: "bold",
                          fontSize: "14px",
                        }}
                      >
                        <span style={{ fontSize: "10px", display: "block", textTransform: "uppercase", color: "var(--muted)" }}>
                          {slot.slotName}
                        </span>
                        {slot.timeSlot}
                      </div>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <strong style={{ fontSize: "15px" }}>
                            {slot.medicine.name} {slot.medicine.strength}
                          </strong>
                          <span
                            style={{
                              fontSize: "11px",
                              padding: "2px 6px",
                              borderRadius: "6px",
                              background: "var(--surface-muted)",
                              color: "var(--muted)",
                              textTransform: "capitalize",
                            }}
                          >
                            {slot.medicine.form}
                          </span>
                        </div>
                        <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--muted)" }}>
                          Dose: {slot.medicine.dose} · 🍽️ {foodLabel} · {slot.medicine.instructions}
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
                            padding: "6px 12px",
                            borderRadius: "6px",
                            background: "rgba(16, 185, 129, 0.12)",
                            color: "#059669",
                            fontSize: "12px",
                            fontWeight: "600",
                          }}
                        >
                          ✓ Dose Taken
                        </span>
                      ) : slot.status === "skipped" ? (
                        <span style={{ fontSize: "12px", color: "var(--muted)", fontStyle: "italic" }}>Skipped</span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleTakeDose(slot)}
                            className="primary-button"
                            style={{ fontSize: "12px", padding: "6px 14px" }}
                          >
                            ✓ Mark Taken
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSkipDose(slot)}
                            className="secondary-button"
                            style={{ fontSize: "12px", padding: "6px 10px" }}
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

      {/* SUB-TAB 2: SUBMIT PRESCRIPTION FORM */}
      {activeSubTab === "add" && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "14px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: "16px" }}>Submit Doctor Prescription</h3>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>
              Upload an image of your prescription slip and enter the medicines to generate your custom push notification alarm schedule.
            </p>
          </div>

          {currentUserProfile?.role === "doctor" && currentUserProfile?.verification_status === "pending_verification" && (
            <div style={{ background: "#fffbeb", border: "1.5px solid #f59e0b", borderRadius: "10px", padding: "10px 14px", color: "#92400e", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "16px" }}>⚠️</span>
              <div>
                <strong>NMC Medical Council Verification Pending</strong>
                <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#b45309" }}>
                  Your doctor profile (Reg: {currentUserProfile?.medical_reg_no || "NMC-Pending"}) is under review by System Administrator. Prescriptions authored now will be stamped as provisional drafts.
                </p>
              </div>
            </div>
          )}

          {currentUserProfile?.role === "doctor" && currentUserProfile?.verification_status === "verified" && (
            <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: "10px", padding: "8px 14px", color: "#166534", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "15px" }}>✅</span>
              <div>
                <strong>Verified Prescribing Practitioner</strong>: {currentUserProfile.display_name} · Council: {currentUserProfile.council_name || "NMC"} · Reg: {currentUserProfile.medical_reg_no || "Verified"}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            <label style={{ fontSize: "13px", display: "flex", flexDirection: "column", gap: "6px" }}>
              Patient Reference / ID:
              <input
                type="text"
                value={patientRef}
                onChange={(e) => setPatientRef(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--line)" }}
                placeholder="e.g. NR-1001"
              />
            </label>

            <label style={{ fontSize: "13px", display: "flex", flexDirection: "column", gap: "6px" }}>
              Prescribing Doctor / Hospital:
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--line)" }}
                placeholder="e.g. Dr. R. Sharma (PHC)"
              />
            </label>

            <label style={{ fontSize: "13px", display: "flex", flexDirection: "column", gap: "6px" }}>
              Diagnosis / Reason for Visit:
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--line)" }}
                placeholder="e.g. Fever & Throat Infection"
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
              <strong style={{ fontSize: "13px" }}>📷 Attach Prescription Photo (Camera / Scan)</strong>
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
              capture="environment"
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
                  placeholder="e.g. Paracetamol, Amoxicillin"
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--line)" }}
                />
              </label>

              <label style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                Strength:
                <input
                  type="text"
                  value={medStrength}
                  onChange={(e) => setMedStrength(e.target.value)}
                  placeholder="e.g. 500mg, 250mg"
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
                  placeholder="e.g. 1 tablet, 5 ml"
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
                Daily Alarm Timings (Check all that apply):
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
            <button type="button" onClick={() => setActiveSubTab("reminders")} className="secondary-button">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
