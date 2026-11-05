import { createClient } from "../supabase/client";
import type { PatientPrescription, ScheduledMedicine, AdherenceLog, PrescriptionFollowUpRequest } from "./types";

const PRESCRIPTION_STORAGE_KEY = "arogya.prescriptions.local";
const ADHERENCE_STORAGE_KEY = "arogya.adherence.local";
const FOLLOWUP_STORAGE_KEY = "arogya.followups.local";

const SEED_PRESCRIPTIONS: PatientPrescription[] = [];

const SEED_FOLLOWUPS: PrescriptionFollowUpRequest[] = [];

export function getLocalPrescriptions(): PatientPrescription[] {
  if (typeof window === "undefined") return SEED_PRESCRIPTIONS;
  try {
    const raw = localStorage.getItem(PRESCRIPTION_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PRESCRIPTION_STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [];
    }

    // Purge fake mock prescriptions (RX-9021, PT-RAMESH-01, Kendra #7402)
    // Prescriptions should only exist once generated/approved by the real doctor
    const cleaned = parsed.filter((rx) => {
      if (!rx || typeof rx !== "object") return false;
      if (rx.id === "RX-9021") return false;
      if (rx.patientRef === "PT-RAMESH-01") return false;
      if (rx.suggestedChemist?.name?.includes("#7402")) return false;
      return true;
    });

    let modified = cleaned.length !== parsed.length;
    const sanitized = cleaned.map((rx) => {
      const r = { ...rx };
      if (r.doctorName?.toLowerCase().includes("rajesh") || r.doctorName?.toLowerCase().includes("patel")) {
        r.doctorName = "Dr. Bishnu Prasad Satapathy, MBBS";
        modified = true;
      } else if (r.doctorName?.toLowerCase().includes("ananya")) {
        r.doctorName = "Dr. Samarpit Biswal, MD";
        modified = true;
      }
      return r;
    });

    // Deduplicate identical duplicate prescriptions (e.g. from repeat imports of same doctor response)
    const deduplicated: PatientPrescription[] = [];
    for (const rx of sanitized) {
      const medSig = (rx.medicines || [])
        .map((m) => `${m.name.toLowerCase().trim()}-${m.strength.toLowerCase().trim()}`)
        .sort()
        .join(";");
      const existing = deduplicated.find((d) => {
        const dSig = (d.medicines || [])
          .map((m) => `${m.name.toLowerCase().trim()}-${m.strength.toLowerCase().trim()}`)
          .sort()
          .join(";");
        return dSig === medSig;
      });

      if (!existing) {
        deduplicated.push(rx);
      } else {
        modified = true;
        // Merge adherence logs and keep the more complete/recent one
        if ((rx.adherenceLogs && rx.adherenceLogs.length > (existing.adherenceLogs?.length || 0)) || new Date(rx.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
          const idx = deduplicated.indexOf(existing);
          deduplicated[idx] = {
            ...rx,
            adherenceLogs: [...(rx.adherenceLogs || []), ...(existing.adherenceLogs || [])].filter(
              (log, i, arr) => arr.findIndex((x) => x.scheduledTime === log.scheduledTime && x.medicineId === log.medicineId) === i
            ),
          };
        }
      }
    }

    if (modified) {
      localStorage.setItem(PRESCRIPTION_STORAGE_KEY, JSON.stringify(deduplicated));
      return deduplicated;
    }

    return deduplicated;
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

    // Retrieve active logged-in doctor profile if any
    let activeDoctorProfile: any = null;
    try {
      const rawProfile = localStorage.getItem("arogya.local_profile");
      if (rawProfile) {
        const prof = JSON.parse(rawProfile);
        if (prof && prof.role === "doctor") {
          activeDoctorProfile = prof;
        }
      }
    } catch {}

    // Purge legacy demo cases (Ramesh Soren, PT-RAMESH-01, FUP-101, FUP-102, RX-REV-MVUM27HG, etc.)
    let modified = false;
    const realUserCases = parsed.filter((item: PrescriptionFollowUpRequest) => {
      const isDemo =
        item.id === "FUP-101" ||
        item.id === "FUP-102" ||
        item.patientRef === "PT-RAMESH-01" ||
        item.patientName === "Ramesh Soren" ||
        item.prescriptionId === "RX-REV-MVUM27HG" ||
        (item.patientMessage && item.patientMessage.includes("Amlodipine 5mg I am feeling slight dizziness"));
      return !isDemo;
    });

    if (realUserCases.length !== parsed.length) {
      modified = true;
    }

    const sanitized = realUserCases.map((item: PrescriptionFollowUpRequest) => {
      const next = { ...item };

      // Eradicate legacy fake doctor names
      if (
        next.doctorName?.toLowerCase().includes("rajesh") ||
        next.doctorName?.toLowerCase().includes("patel") ||
        next.doctorEmail?.toLowerCase().includes("patel")
      ) {
        next.doctorName = "Dr. Bishnu Prasad Satapathy, MBBS";
        next.doctorNmc = "OMC-2018-88412";
        next.doctorEmail = "bishnuprasadsatapathy7846@gmail.com";
        modified = true;
      } else if (
        next.doctorName?.toLowerCase().includes("ananya") ||
        next.doctorEmail?.toLowerCase().includes("ananya")
      ) {
        next.doctorName = "Dr. Samarpit Biswal, MD";
        next.doctorNmc = "OMC-2020-54190";
        next.doctorEmail = "samarpitbiswal966@gmail.com";
        modified = true;
      }

      // Synchronize with active doctor profile if email matches
      if (
        activeDoctorProfile &&
        activeDoctorProfile.email &&
        next.doctorEmail?.toLowerCase() === activeDoctorProfile.email.toLowerCase()
      ) {
        const dynamicName = activeDoctorProfile.display_name || activeDoctorProfile.full_name;
        if (dynamicName && next.doctorName !== dynamicName) {
          next.doctorName = dynamicName;
          modified = true;
        }
        const dynamicReg = activeDoctorProfile.medical_reg_no || activeDoctorProfile.nmc_registration_number;
        if (dynamicReg && next.doctorNmc !== dynamicReg) {
          next.doctorNmc = dynamicReg;
          modified = true;
        }
      }

      return next;
    });

    if (modified) {
      localStorage.setItem(FOLLOWUP_STORAGE_KEY, JSON.stringify(sanitized));
      return sanitized;
    }

    return parsed;
  } catch {
    return SEED_FOLLOWUPS;
  }
}

let followupRealtimeChannel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;

export function initFollowupRealtimeSync(onUpdate?: (req: PrescriptionFollowUpRequest) => void) {
  if (typeof window === "undefined") return () => {};
  try {
    const supabase = createClient();
    if (!followupRealtimeChannel) {
      followupRealtimeChannel = supabase.channel("arogya-followups-sync");
      followupRealtimeChannel
        .on("broadcast", { event: "followup_updated" }, ({ payload }: { payload: PrescriptionFollowUpRequest }) => {
          if (payload && payload.id) {
            const current = getLocalFollowUps();
            const idx = current.findIndex((f) => f.id === payload.id);
            let next: PrescriptionFollowUpRequest[];
            if (idx >= 0) {
              next = [...current];
              next[idx] = payload;
            } else {
              next = [payload, ...current];
            }
            localStorage.setItem(FOLLOWUP_STORAGE_KEY, JSON.stringify(next));
            window.dispatchEvent(new CustomEvent("arogya:followup:updated", { detail: payload }));
            if (onUpdate) onUpdate(payload);
          }
        })
        .subscribe();
    }
  } catch {
    // Offline resilience
  }

  return () => {
    // Keep channel alive
  };
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
  window.dispatchEvent(new CustomEvent("arogya:followup:updated", { detail: request }));

  // Broadcast to all devices/browsers in Realtime via Supabase
  try {
    const supabase = createClient();
    const ch = followupRealtimeChannel || supabase.channel("arogya-followups-sync");
    void ch.send({
      type: "broadcast",
      event: "followup_updated",
      payload: request,
    });
  } catch {
    // Offline resilience
  }
}

export function getFollowUpsForPatient(patientRef: string): PrescriptionFollowUpRequest[] {
  const all = getLocalFollowUps();
  return all.filter((f) => f.patientRef === patientRef || f.patientRef.toLowerCase().includes(patientRef.toLowerCase()));
}

export function getFollowUpsForDoctor(doctorQuery?: string): PrescriptionFollowUpRequest[] {
  const all = getLocalFollowUps();
  if (!doctorQuery) return all;
  const q = doctorQuery.toLowerCase();
  return all.filter(
    (f) =>
      !f.doctorName ||
      f.doctorName.toLowerCase().includes(q) ||
      (f.doctorEmail && f.doctorEmail.toLowerCase().includes(q)) ||
      q.includes("bishnu") ||
      q.includes("satapathy") ||
      q.includes("samarpit") ||
      q.includes("biswal")
  );
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
  doctorName?: string;
  medicine: ScheduledMedicine;
  timeSlot: string; // "07:30", "08:00", "08:30", "13:00", "18:00", "21:00"
  slotName: "Morning" | "Afternoon" | "Evening" | "Night";
  taken: boolean;
  status?: "taken" | "skipped" | "snoozed";
  startDate?: string;
  endDate?: string;
  durationDays?: number;
  dayNumber?: number;
}

export function getTodayReminders(prescriptions: PatientPrescription[]): TodayReminderSlot[] {
  const slots: TodayReminderSlot[] = [];
  const adherence = getLocalAdherence();
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const now = new Date();

  // Helper to determine clinical staggered timing based on food relation
  const getSlotTime = (slot: "morning" | "afternoon" | "evening" | "night", foodRelation?: string, existingCountInSlot: number = 0): { time: string; name: "Morning" | "Afternoon" | "Evening" | "Night" } => {
    if (slot === "morning") {
      if (foodRelation === "empty_stomach") return { time: "07:00", name: "Morning" };
      if (foodRelation === "before_food") return { time: "07:30", name: "Morning" };
      if (foodRelation === "after_food") {
        return existingCountInSlot > 0 ? { time: "08:30", name: "Morning" } : { time: "08:00", name: "Morning" };
      }
      return existingCountInSlot > 0 ? { time: "08:30", name: "Morning" } : { time: "08:00", name: "Morning" };
    }
    if (slot === "afternoon") {
      return foodRelation === "before_food" ? { time: "12:30", name: "Afternoon" } : { time: "13:00", name: "Afternoon" };
    }
    if (slot === "evening") {
      return { time: "18:00", name: "Evening" };
    }
    // night
    return foodRelation === "before_food" ? { time: "20:30", name: "Night" } : { time: "21:00", name: "Night" };
  };

  const slotMorningCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  const seenMedicineSignatures = new Set<string>();

  for (const pres of prescriptions) {
    for (const med of pres.medicines) {
      // De-duplicate duplicate prescriptions prescribing the exact same medicine
      const normalizedMedKey = `${med.name.toLowerCase().trim()}-${med.strength.toLowerCase().trim()}`;
      if (seenMedicineSignatures.has(normalizedMedKey)) {
        continue;
      }
      seenMedicineSignatures.add(normalizedMedKey);

      const timesToCheck: { time: string; name: "Morning" | "Afternoon" | "Evening" | "Night" }[] = [];

      if (med.slots.morning) {
        timesToCheck.push(getSlotTime("morning", med.foodRelation, slotMorningCounts.morning++));
      }
      if (med.slots.afternoon) {
        timesToCheck.push(getSlotTime("afternoon", med.foodRelation, slotMorningCounts.afternoon++));
      }
      if (med.slots.evening) {
        timesToCheck.push(getSlotTime("evening", med.foodRelation, slotMorningCounts.evening++));
      }
      if (med.slots.night) {
        timesToCheck.push(getSlotTime("night", med.foodRelation, slotMorningCounts.night++));
      }

      if (timesToCheck.length === 0 && med.customTimes && med.customTimes.length > 0) {
        for (const ct of med.customTimes) {
          timesToCheck.push({ time: ct, name: "Morning" });
        }
      }

      // Calculate Course Dates
      const startStr = med.startDate || pres.createdAt?.slice(0, 10) || todayDateStr;
      const duration = med.durationDays || 14;
      const startMs = new Date(startStr).getTime();
      const endMs = startMs + Math.max(0, duration - 1) * 86400000;
      const endStr = new Date(endMs).toISOString().slice(0, 10);
      const daysSinceStart = Math.floor((now.getTime() - startMs) / 86400000);
      const dayNumber = Math.max(1, Math.min(duration, daysSinceStart + 1));

      for (const t of timesToCheck) {
        const scheduledTimeKey = `${todayDateStr}T${t.time}:00`;
        const log = adherence.find(
          (a) => a.prescriptionId === pres.id && a.medicineId === med.id && a.scheduledTime.startsWith(scheduledTimeKey.slice(0, 16))
        );

        slots.push({
          prescriptionId: pres.id,
          doctorName: pres.doctorName,
          medicine: med,
          timeSlot: t.time,
          slotName: t.name,
          taken: log?.status === "taken",
          status: log?.status,
          startDate: startStr,
          endDate: endStr,
          durationDays: duration,
          dayNumber,
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

/** Play a gentle, high-clarity harmonic medical chime (E-G#-B-E melody with soft bell resonance) */
export function playHarmonicMedicalChime(): void {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    // Melodic sequence: E5 (659.25Hz), G#5 (830.61Hz), B5 (987.77Hz), resolving E6 (1318.51Hz)
    const melody = [
      { freq: 659.25, start: 0.00, dur: 0.35, gain: 0.18 },
      { freq: 830.61, start: 0.14, dur: 0.38, gain: 0.20 },
      { freq: 987.77, start: 0.28, dur: 0.42, gain: 0.22 },
      { freq: 1318.51, start: 0.42, dur: 0.70, gain: 0.18 },
    ];

    melody.forEach((note) => {
      // Primary pure bell tone (sine)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.start);

      // Subtle celestial harmonic overtone (triangle)
      const overtone = ctx.createOscillator();
      const overGain = ctx.createGain();
      overtone.type = "triangle";
      overtone.frequency.setValueAtTime(note.freq * 2, ctx.currentTime + note.start);

      // Smooth envelope attack and exponential decay
      const t = ctx.currentTime + note.start;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(note.gain, t + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + note.dur);

      overGain.gain.setValueAtTime(0.0001, t);
      overGain.gain.exponentialRampToValueAtTime(note.gain * 0.25, t + 0.02);
      overGain.gain.exponentialRampToValueAtTime(0.0001, t + note.dur * 0.65);

      osc.connect(gain);
      gain.connect(ctx.destination);
      overtone.connect(overGain);
      overGain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + note.dur + 0.05);
      overtone.start(t);
      overtone.stop(t + note.dur * 0.65 + 0.05);
    });
  } catch {
    // Audio context not allowed or failed
  }
}

export function triggerMedicineNotification(medicineName: string, dose: string, instructions?: string) {
  if (typeof window === "undefined") return;

  const title = `⏰ Medicine Reminder: ${medicineName}`;
  const body = `Take ${dose} now. ${instructions ? `(${instructions})` : ""}`;

  // Native Web Push / Screen Notification with proper Medical Bell Icon (NEVER QR code)
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, {
        body,
        icon: "/medicine-alarm-icon.png",
        badge: "/medicine-alarm-icon.png",
        tag: `med-${medicineName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      });
    } catch {
      // Fallback
    }
  }

  // Play rich, comforting harmonic chime
  playHarmonicMedicalChime();

  // Dispatch interactive in-app visual alarm event
  try {
    window.dispatchEvent(
      new CustomEvent("arogya.medicine_alarm", {
        detail: {
          medicineName,
          dose,
          instructions: instructions || "Take with clean drinking water as prescribed.",
          timestamp: new Date().toISOString(),
        },
      })
    );
  } catch {
    // Ignore event dispatch failure
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
