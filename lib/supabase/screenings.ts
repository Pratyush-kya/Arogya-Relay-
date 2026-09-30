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

export function getLocalScreenings(): ScreeningRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
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


