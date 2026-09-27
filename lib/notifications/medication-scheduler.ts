/**
 * Browser-Native Medication Push Reminder & Alarm Scheduler
 * 100% Free, zero third-party API keys or paid push gateways required.
 * Uses standard Web Notifications API + Web Audio API synthesizer for audible alarms.
 */

export interface MedicationReminder {
  id: string;
  medicineName: string;
  dosage: string;
  timing: "morning" | "afternoon" | "evening" | "night";
  hour: number;
  minute: number;
  enabled: boolean;
  patientName?: string;
}

const STORAGE_KEY = "arogya.medication_reminders";

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export function playAudibleChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // Audio context may be restricted before user gesture
  }
}

export function triggerDoseAlert(reminder: MedicationReminder) {
  playAudibleChime();

  if (isNotificationSupported() && Notification.permission === "granted") {
    try {
      new Notification(`💊 Dose Reminder: ${reminder.medicineName}`, {
        body: `Time to take ${reminder.dosage} (${reminder.timing.toUpperCase()}). Please take with water as prescribed.`,
        icon: "/favicon.ico",
        tag: `dose-${reminder.id}`,
      });
    } catch {
      // Fallback
    }
  }
}

export function getSavedReminders(): MedicationReminder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }

  // Default initial reminder set
  const defaults: MedicationReminder[] = [
    {
      id: "rem-1",
      medicineName: "Paracetamol 500mg",
      dosage: "1 Tablet after food",
      timing: "morning",
      hour: 8,
      minute: 30,
      enabled: true,
      patientName: "Active Patient",
    },
    {
      id: "rem-2",
      medicineName: "ORS Solution (1 Glass)",
      dosage: "200ml oral solution",
      timing: "afternoon",
      hour: 13,
      minute: 0,
      enabled: true,
      patientName: "Active Patient",
    },
    {
      id: "rem-3",
      medicineName: "Cetirizine 10mg",
      dosage: "1 Tablet before bed",
      timing: "night",
      hour: 21,
      minute: 0,
      enabled: true,
      patientName: "Active Patient",
    },
  ];

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    } catch {
      // ignore
    }
  }

  return defaults;
}

export function saveReminder(reminder: MedicationReminder): MedicationReminder[] {
  const current = getSavedReminders();
  const existingIndex = current.findIndex((r) => r.id === reminder.id);
  let updated: MedicationReminder[];

  if (existingIndex >= 0) {
    updated = [...current];
    updated[existingIndex] = reminder;
  } else {
    updated = [reminder, ...current];
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }
  return updated;
}

export function toggleReminderState(id: string): MedicationReminder[] {
  const current = getSavedReminders();
  const updated = current.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }
  return updated;
}
