/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "./client";
import { settleDoctorEscrow } from "../payments/escrow-engine.ts";

export type UrgencyTier = "emergency" | "urgent" | "review" | "cleared";
export type CaseStatus = "pending_doctor_review" | "doctor_evaluated" | "completed";

export type ScreeningRecord = {
  id: string;
  patient_ref: string;
  age: number;
  temperature: number;
  spo2: number;
  symptoms: string[];
  field_notes?: string;
  village: string;
  urgency_tier: UrgencyTier;
  status: CaseStatus;
  doctor_notes?: string;
  prescription_advice?: string;
  evaluated_by?: string;
  screener_id?: string;
  screener_name?: string;
  screener_role?: string;
  image_url?: string;
  created_at: string;
  updated_at?: string;
  synced?: boolean;
};

const STORAGE_KEY = "arogya.screenings.local";

export const ODISHA_SURVEILLANCE_SCREENINGS: ScreeningRecord[] = [
  {
    id: "SCR-OD-2026-01",
    patient_ref: "PT-MW3WL4EP",
    age: 48,
    temperature: 98.4,
    spo2: 98,
    symptoms: ["Severe morning dizziness", "Elevated resting BP (146/92)", "Postural lightheadedness"],
    field_notes: "Hypertension patient reporting morning dizziness after concurrent morning dosing. Digital home BP log reviewed.",
    village: "Unit-6, Bhubaneswar (Khurda District)",
    urgency_tier: "urgent",
    status: "doctor_evaluated",
    doctor_notes: "Reviewed by Dr. Bishnu Prasad Satapathy, MBBS (OMC-2018-88412): Taper Amlodipine to 2.5mg OD at bedtime. Telmisartan morning.",
    prescription_advice: "Tab. Amlodipine 2.5mg HS + Tab. Telmisartan 40mg OD",
    evaluated_by: "Dr. Bishnu Prasad Satapathy, MBBS",
    screener_name: "Priya Devi (Senior ASHA Facilitator)",
    screener_role: "health_worker",
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    synced: true,
  },
  {
    id: "SCR-OD-2026-02",
    patient_ref: "PT-RESP-881",
    age: 16,
    temperature: 100.4,
    spo2: 96,
    symptoms: ["Paroxysmal spasmodic cough", "Bilateral expiratory wheezing", "Low-grade fever"],
    field_notes: "Acute coughing bouts worse at night. Audible rhonchi on chest examination.",
    village: "Mangalabag, Cuttack (SCB Medical Outreach)",
    urgency_tier: "urgent",
    status: "doctor_evaluated",
    doctor_notes: "Reviewed by Dr. Samarpit Biswal, MD (OMC-2020-54190): Acute hyper-reactive airway disease. Prescribed Duolin MDI inhaler + Amoxicillin 625mg.",
    prescription_advice: "Duolin Inhaler 2 puffs TID + Tab. Amoxicillin-Clav 625mg BD",
    evaluated_by: "Dr. Samarpit Biswal, MD",
    screener_name: "SCB Outreach Triage Desk",
    screener_role: "health_worker",
    created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    synced: true,
  },
  {
    id: "SCR-OD-2026-03",
    patient_ref: "PT-MAT-104",
    age: 24,
    temperature: 98.6,
    spo2: 99,
    symptoms: ["Second trimester pallor", "General fatigue", "Mild pedal edema"],
    field_notes: "ANC 2nd trimester routine checkup. Suspected moderate nutritional anemia. Routine obstetric consult required.",
    village: "Baripada Sub-Division (Mayurbhanj District)",
    urgency_tier: "review",
    status: "pending_doctor_review",
    screener_name: "Priya Devi (Senior ASHA Facilitator)",
    screener_role: "health_worker",
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    synced: true,
  },
  {
    id: "SCR-OD-2026-04",
    patient_ref: "PT-EMG-902",
    age: 62,
    temperature: 99.1,
    spo2: 93,
    symptoms: ["Sharp substernal chest discomfort", "Dyspnea on exertion", "Diaphoresis"],
    field_notes: "Elderly male with sudden chest heaviness and desaturation (SpO2 93%). STAT emergency transfer initiated.",
    village: "Konark Coastal Block (Puri District)",
    urgency_tier: "emergency",
    status: "doctor_evaluated",
    doctor_notes: "108 Ambulance dispatch confirmed. Patient admitted to Capital Hospital Apex Cardiac ICU.",
    evaluated_by: "Dr. Bishnu Prasad Satapathy, MBBS",
    screener_name: "Konark PHC Emergency Triage",
    screener_role: "health_worker",
    created_at: new Date(Date.now() - 36 * 3600000).toISOString(),
    synced: true,
  },
];

export function getLocalScreenings(): ScreeningRecord[] {
  if (typeof window === "undefined") return ODISHA_SURVEILLANCE_SCREENINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ODISHA_SURVEILLANCE_SCREENINGS));
      return ODISHA_SURVEILLANCE_SCREENINGS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ODISHA_SURVEILLANCE_SCREENINGS));
      return ODISHA_SURVEILLANCE_SCREENINGS;
    }
    return parsed;
  } catch {
    return ODISHA_SURVEILLANCE_SCREENINGS;
  }
}

export function saveLocalScreening(record: ScreeningRecord): void {
  if (typeof window === "undefined") return;
  const current = getLocalScreenings();
  const index = current.findIndex((item) => item.id === record.id);
  let next: ScreeningRecord[];
  if (index >= 0) {
    next = [...current];
    next[index] = record;
  } else {
    next = [record, ...current];
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function fetchAllScreenings(): Promise<ScreeningRecord[]> {
  const local = getLocalScreenings();
  try {
    const supabase = createClient();
    const { data, error } = await (supabase.from("screenings") as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) {
      return local;
    }

    // Merge remote and local with clinical conflict resolution
    const remoteMap = new Map<string, ScreeningRecord>();
    for (const item of (data as any[])) {
      remoteMap.set(item.id, { ...item, synced: true });
    }
    for (const item of local) {
      const remote = remoteMap.get(item.id);
      if (!remote) {
        remoteMap.set(item.id, item);
      } else if (!item.synced) {
        // Clinical safeguard: if remote has been evaluated by a doctor, preserve the doctor's review
        if (remote.status === "doctor_evaluated" && item.status !== "doctor_evaluated") {
          remoteMap.set(item.id, {
            ...item,
            status: remote.status,
            doctor_notes: remote.doctor_notes,
            prescription_advice: remote.prescription_advice,
            evaluated_by: remote.evaluated_by,
            updated_at: remote.updated_at,
            synced: true,
          });
        } else {
          const localTime = new Date(item.updated_at || item.created_at).getTime();
          const remoteTime = new Date(remote.updated_at || remote.created_at).getTime();
          if (localTime >= remoteTime) {
            remoteMap.set(item.id, item);
          }
        }
      }
    }
    return Array.from(remoteMap.values());
  } catch {
    return local;
  }
}

export async function submitScreening(
  record: Omit<ScreeningRecord, "id" | "created_at" | "status" | "synced">
): Promise<ScreeningRecord> {
  const newRecord: ScreeningRecord = {
    ...record,
    id: `SCR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    status: "pending_doctor_review",
    created_at: new Date().toISOString(),
    synced: false,
  };

  saveLocalScreening(newRecord);

  // Try saving to Supabase if connected
  try {
    const supabase = createClient();
    const { error } = await (supabase.from("screenings") as any).insert({
      id: newRecord.id,
      patient_ref: newRecord.patient_ref,
      age: newRecord.age,
      temperature: newRecord.temperature,
      spo2: newRecord.spo2,
      symptoms: newRecord.symptoms,
      field_notes: newRecord.field_notes ?? "",
      village: newRecord.village,
      urgency_tier: newRecord.urgency_tier,
      status: newRecord.status,
      created_at: newRecord.created_at,
    });

    if (!error) {
      newRecord.synced = true;
      saveLocalScreening(newRecord);
    }
  } catch {
    // Offline - stays in local queue
  }

  return newRecord;
}

export async function submitDoctorEvaluation(
  id: string,
  doctorNotes: string,
  prescriptionAdvice: string,
  doctorName = "Dr. On Call"
): Promise<boolean> {
  const current = getLocalScreenings();
  const record = current.find((item) => item.id === id);
  if (record) {
    record.doctor_notes = doctorNotes;
    record.prescription_advice = prescriptionAdvice;
    record.evaluated_by = doctorName;
    record.status = "doctor_evaluated";
    record.updated_at = new Date().toISOString();
    record.synced = false;
    saveLocalScreening(record);
  }

  // Settle doctor consultation fee from escrow
  try {
    settleDoctorEscrow(id);
  } catch {
    // Escrow ledger local fallback
  }

  try {
    const supabase = createClient();
    const { error } = await (supabase.from("screenings") as any)
      .update({
        doctor_notes: doctorNotes,
        prescription_advice: prescriptionAdvice,
        evaluated_by: doctorName,
        status: "doctor_evaluated",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (!error && record) {
      record.synced = true;
      saveLocalScreening(record);
      return true;
    }
  } catch {
    // Handled locally
  }
  return true;
}

export async function syncPendingScreenings(): Promise<number> {
  const local = getLocalScreenings();
  const pending = local.filter((item) => !item.synced);
  if (pending.length === 0) return 0;

  let syncedCount = 0;
  try {
    const supabase = createClient();
    for (const item of pending) {
      const { error } = await (supabase.from("screenings") as any).upsert({
        id: item.id,
        patient_ref: item.patient_ref,
        age: item.age,
        temperature: item.temperature,
        spo2: item.spo2,
        symptoms: item.symptoms,
        field_notes: item.field_notes ?? "",
        village: item.village,
        urgency_tier: item.urgency_tier,
        status: item.status,
        doctor_notes: item.doctor_notes ?? null,
        prescription_advice: item.prescription_advice ?? null,
        evaluated_by: item.evaluated_by ?? null,
        created_at: item.created_at,
        updated_at: item.updated_at ?? null,
      });

      if (!error) {
        item.synced = true;
        saveLocalScreening(item);
        syncedCount++;
      }
    }
  } catch {
    // Network still down
  }
  return syncedCount;
}


