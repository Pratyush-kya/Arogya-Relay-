import { createClient } from "../supabase/client";
import type { PatientPrescription, ScheduledMedicine, AdherenceLog } from "./types";

const PRESCRIPTION_STORAGE_KEY = "arogya.prescriptions.local";
const ADHERENCE_STORAGE_KEY = "arogya.adherence.local";

export function getLocalPrescriptions(): PatientPrescription[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PRESCRIPTION_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLocalPrescription(prescription: PatientPrescription): void {
  if (typeof window === "undefined") return;
  const current = getLocalPrescriptions();
  const idx = current.findIndex((p) => p.id === prescription.id);
  let next: PatientPrescription[];
  if (idx >= 0) {
    next = [...current];
    next[idx] = prescription;
  } else {
    next = [prescription, ...current];
  }
  localStorage.setItem(PRESCRIPTION_STORAGE_KEY, JSON.stringify(next));
}

export function getLocalAdherence(): AdherenceLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ADHERENCE_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function logAdherence(
  prescriptionId: string,
  medicineId: string,
  medicineName: string,
  scheduledTime: string,
  status: "taken" | "skipped" | "snoozed"
): AdherenceLog {
  const log: AdherenceLog = {
    id: `adh-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    prescriptionId,
    medicineId,
    medicineName,
    scheduledTime,
    status,
    loggedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    const all = getLocalAdherence();
    localStorage.setItem(ADHERENCE_STORAGE_KEY, JSON.stringify([log, ...all]));
  }

  // Also update in prescription record
  const prescriptions = getLocalPrescriptions();
  const target = prescriptions.find((p) => p.id === prescriptionId);
  if (target) {
    target.adherenceLogs = [log, ...(target.adherenceLogs || [])];
    target.synced = false;
    saveLocalPrescription(target);
  }

  return log;
}

export interface TodayReminderSlot {
  prescriptionId: string;
  medicine: ScheduledMedicine;
  timeSlot: string; // "08:00", "13:00", "18:00", "21:00"
  slotName: "Morning" | "Afternoon" | "Evening" | "Night";
  taken: boolean;
  status?: "taken" | "skipped" | "snoozed";
}

export function getTodayReminders(prescriptions: PatientPrescription[]): TodayReminderSlot[] {
  const slots: TodayReminderSlot[] = [];
  const adherence = getLocalAdherence();
  const todayDateStr = new Date().toISOString().slice(0, 10);

  const slotTimeMap: Record<string, { time: string; name: "Morning" | "Afternoon" | "Evening" | "Night" }> = {
    morning: { time: "08:00", name: "Morning" },
    afternoon: { time: "13:00", name: "Afternoon" },
    evening: { time: "18:00", name: "Evening" },
    night: { time: "21:00", name: "Night" },
  };

  for (const pres of prescriptions) {
    for (const med of pres.medicines) {
      const timesToCheck: { time: string; name: "Morning" | "Afternoon" | "Evening" | "Night" }[] = [];

      if (med.slots.morning) timesToCheck.push(slotTimeMap.morning);
      if (med.slots.afternoon) timesToCheck.push(slotTimeMap.afternoon);
      if (med.slots.evening) timesToCheck.push(slotTimeMap.evening);
      if (med.slots.night) timesToCheck.push(slotTimeMap.night);

      if (timesToCheck.length === 0 && med.customTimes && med.customTimes.length > 0) {
        for (const ct of med.customTimes) {
          timesToCheck.push({ time: ct, name: "Morning" });
        }
      }

      for (const t of timesToCheck) {
        const scheduledTimeKey = `${todayDateStr}T${t.time}:00`;
        const log = adherence.find(
          (a) => a.prescriptionId === pres.id && a.medicineId === med.id && a.scheduledTime.startsWith(scheduledTimeKey.slice(0, 16))
        );

        slots.push({
          prescriptionId: pres.id,
          medicine: med,
          timeSlot: t.time,
          slotName: t.name,
          taken: log?.status === "taken",
          status: log?.status,
        });
      }
    }
  }

  // Sort chronologically by time slot
  return slots.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
}

/** Web Push / Native Notification trigger with sound and badge */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const res = await Notification.requestPermission();
    return res === "granted";
  }

  return false;
}

export function triggerMedicineNotification(medicineName: string, dose: string, instructions?: string) {
  if (typeof window === "undefined") return;

  // Visual in-app toast / native alert
  const title = `⏰ Medicine Reminder: ${medicineName}`;
  const body = `Take ${dose} now. ${instructions ? `(${instructions})` : ""}`;

  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, {
        body,
        icon: "/hotspot-qr.png",
        badge: "/hotspot-qr.png",
        tag: `med-${medicineName}`,
      });
    } catch {
      // Fallback
    }
  }

  // Play subtle reminder chime if Audio API is supported
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // Ignore audio error
  }
}

/** Sync pending prescriptions to Supabase */
export async function syncPrescriptions(): Promise<number> {
  const local = getLocalPrescriptions();
  const pending = local.filter((p) => !p.synced);
  if (pending.length === 0) return 0;

  let synced = 0;
  try {
    const supabase = createClient();
    for (const p of pending) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("prescriptions") as any).upsert({
        id: p.id,
        patient_ref: p.patientRef,
        doctor_name: p.doctorName,
        diagnosis: p.diagnosis || null,
        prescription_image_url: p.prescriptionImageUrl || null,
        medicines: p.medicines,
        adherence_logs: p.adherenceLogs,
        created_at: p.createdAt,
        updated_at: p.updatedAt || new Date().toISOString(),
      });

      if (!error) {
        p.synced = true;
        saveLocalPrescription(p);
        synced++;
      }
    }
  } catch {
    // Stays queued offline
  }

  return synced;
}
