import { createClient } from "../supabase/client";
import type { PatientPrescription, ScheduledMedicine, AdherenceLog, PrescriptionFollowUpRequest } from "./types";

const PRESCRIPTION_STORAGE_KEY = "arogya.prescriptions.local";
const ADHERENCE_STORAGE_KEY = "arogya.adherence.local";
const FOLLOWUP_STORAGE_KEY = "arogya.followups.local";

const SEED_PRESCRIPTIONS: PatientPrescription[] = [
  {
    id: "RX-9021",
    patientRef: "PT-RAMESH-01",
    doctorName: "Dr. Rajesh Patel, MBBS",
    diagnosis: "Essential Hypertension Stage 1 & Mild Fatigue",
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    synced: true,
    totalPriceInr: 32.5,
    mrpPriceInr: 168.0,
    suggestedChemist: {
      id: "ph-01",
      name: "Pradhan Mantri Jan Aushadhi Kendra #7402",
      address: "Main Market Road, near Block Office",
      phone: "+91 94370 12345",
      distanceKm: 1.2,
    },
    adherenceLogs: [],
    medicines: [
      {
        id: "m-amlo",
        name: "Amlodipine",
        strength: "5mg",
        form: "tablet",
        dose: "1 tablet once daily morning",
        foodRelation: "after_food",
        slots: { morning: true },
        customTimes: ["08:00"],
        durationDays: 14,
        startDate: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10),
        instructions: "Take with water after breakfast.",
      },
      {
        id: "m-para",
        name: "Paracetamol",
        strength: "500mg",
        form: "tablet",
        dose: "1 tablet as needed for headache",
        foodRelation: "after_food",
        slots: { night: true },
        customTimes: ["21:00"],
        durationDays: 5,
        startDate: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10),
        instructions: "Max 2 tablets a day if headache persists.",
      },
    ],
  },
];

const SEED_FOLLOWUPS: PrescriptionFollowUpRequest[] = [
  {
    id: "FUP-101",
    prescriptionId: "RX-9021",
    patientRef: "PT-RAMESH-01",
    patientName: "Ramesh Soren",
    doctorName: "Dr. Rajesh Patel, MBBS",
    doctorNmc: "NMC-2018-88412",
    issueType: "side_effect",
    patientMessage: "Doctor sir, since starting Amlodipine 5mg I am feeling slight dizziness in the morning and ankle swelling. Can you please check and adjust my dose?",
    reportedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    status: "doctor_revised",
    doctorReply: "Reviewed your blood pressure history. I have reduced Amlodipine to 2.5mg and added a low-salt dietary advice. Please collect the new tablets from Jan Aushadhi Kendra #7402.",
    revisedMedicines: [
      {
        id: "m-amlo-rev",
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
    ],
    suggestedChemist: {
      id: "ph-01",
      name: "Pradhan Mantri Jan Aushadhi Kendra #7402",
      address: "Main Market Road, near Block Office",
      phone: "+91 94370 12345",
      distanceKm: 1.2,
    },
    totalPriceInr: 18.0,
    mrpPriceInr: 85.0,
    savingsPercent: 78.8,
    batchVerified: true,
    expirySafeDate: "Dec 2027 (Batch JAK-9982)",
    doctorAuditStatus: "pending_dispense",
  },
];

export function getLocalPrescriptions(): PatientPrescription[] {
  if (typeof window === "undefined") return SEED_PRESCRIPTIONS;
  try {
    const raw = localStorage.getItem(PRESCRIPTION_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PRESCRIPTION_STORAGE_KEY, JSON.stringify(SEED_PRESCRIPTIONS));
      return SEED_PRESCRIPTIONS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(PRESCRIPTION_STORAGE_KEY, JSON.stringify(SEED_PRESCRIPTIONS));
      return SEED_PRESCRIPTIONS;
    }
    return parsed;
  } catch {
    return SEED_PRESCRIPTIONS;
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

export function getLocalFollowUps(): PrescriptionFollowUpRequest[] {
  if (typeof window === "undefined") return SEED_FOLLOWUPS;
  try {
    const raw = localStorage.getItem(FOLLOWUP_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(FOLLOWUP_STORAGE_KEY, JSON.stringify(SEED_FOLLOWUPS));
      return SEED_FOLLOWUPS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(FOLLOWUP_STORAGE_KEY, JSON.stringify(SEED_FOLLOWUPS));
      return SEED_FOLLOWUPS;
    }
    return parsed;
  } catch {
    return SEED_FOLLOWUPS;
  }
}

export function saveLocalFollowUp(request: PrescriptionFollowUpRequest): void {
  if (typeof window === "undefined") return;
  const current = getLocalFollowUps();
  const idx = current.findIndex((f) => f.id === request.id);
  let next: PrescriptionFollowUpRequest[];
  if (idx >= 0) {
    next = [...current];
    next[idx] = request;
  } else {
    next = [request, ...current];
  }
  localStorage.setItem(FOLLOWUP_STORAGE_KEY, JSON.stringify(next));
}

export function getFollowUpsForPatient(patientRef: string): PrescriptionFollowUpRequest[] {
  const all = getLocalFollowUps();
  return all.filter((f) => f.patientRef === patientRef || f.patientRef.toLowerCase().includes(patientRef.toLowerCase()));
}

export function getFollowUpsForDoctor(doctorQuery?: string): PrescriptionFollowUpRequest[] {
  const all = getLocalFollowUps();
  if (!doctorQuery) return all;
  const q = doctorQuery.toLowerCase();
  return all.filter((f) => !f.doctorName || f.doctorName.toLowerCase().includes(q) || q.includes("rajesh") || q.includes("patel"));
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
