import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const ADMIN_EMAIL = "pratyushkiranrath4@gmail.com";
export const SUPABASE_ORG_ID = "ufohydwnepbmjoigycfj";
export const SUPABASE_PROJECT_REF = "tinwzrwomldbbbrwnazn";
export const SUPABASE_ORG_URL = "https://supabase.com/dashboard/org/ufohydwnepbmjoigycfj";
export const SUPABASE_PROJECT_URL = "https://supabase.com/dashboard/project/tinwzrwomldbbbrwnazn";
export const SUPABASE_SQL_URL = "https://supabase.com/dashboard/project/tinwzrwomldbbbrwnazn/sql/new";
export const SUPABASE_API_SETTINGS_URL = "https://supabase.com/dashboard/project/tinwzrwomldbbbrwnazn/settings/api";
export const S3_STORAGE_ENDPOINT = "https://tinwzrwomldbbbrwnazn.supabase.co/storage/v1/s3";

export function isAdminEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export type StorageBucket = "screenings" | "prescriptions" | "doctor-credentials" | "patient-records";

export type Profile = {
  id: string;
  email?: string | null;
  role: "admin" | "doctor" | "health_worker" | "reviewer" | "patient" | "caregiver" | "chemist";
  display_name: string | null;
  pseudo_id: string;
  facility_name?: string | null;
  phone?: string | null;
  address?: string | null;
  gov_id?: string | null;
  medical_reg_no?: string | null;
  council_name?: string | null;
  qualification?: string | null;
  specialization?: string | null;
  experience_years?: number | null;
  verification_status?: "pending_verification" | "verified" | "rejected";
  verification_notes?: string | null;
  license_document_url?: string | null;
  verified_at?: string | null;
  verified_by?: string | null;
};

export const DEFAULT_DEMO_USERS: Profile[] = [
  {
    id: "doc-demo-1",
    email: "dr.ananya@health.gov.in",
    display_name: "Dr. Ananya Sharma, MD",
    role: "doctor",
    pseudo_id: "DOC-ANANYA",
    medical_reg_no: "NMC-2022-84920",
    council_name: "Delhi Medical Council",
    specialization: "General Physician / Internal Medicine",
    facility_name: "Pynursla CHC",
    verification_status: "pending_verification",
    verification_notes: "NMC license proof uploaded. Awaiting admin approval.",
    license_document_url: "https://tinwzrwomldbbbrwnazn.supabase.co/storage/v1/object/public/doctor-credentials/nmc-sample-license.pdf",
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
    verified_at: "2026-09-30T10:00:00.000Z",
  },
  {
    id: "hw-demo-1",
    email: "asha.priya@field.arogya.org",
    display_name: "Priya Devi (ASHA Facilitator)",
    role: "health_worker",
    pseudo_id: "HW-PRIYA-04",
    facility_name: "Mawlynnong Community Sub-Center",
    phone: "+91 98765 43210",
  },
  {
    id: "chem-demo-1",
    email: "jan.aushadhi.kendra@pharma.org",
    display_name: "Jan Aushadhi Kendra #1084",
    role: "chemist",
    pseudo_id: "PHARM-1084",
    facility_name: "Kendra Dispensary - North Ridge",
    address: "Market Complex, Sector 4",
  },
  {
    id: "pat-demo-1",
    email: "citizen.ramesh@gmail.com",
    display_name: "Ramesh Soren",
    role: "patient",
    pseudo_id: "PAT-SOREN-92",
    address: "North Ridge Hamlet #12",
  },
];

let browserClient: ReturnType<typeof createSupabaseClient> | null = null;

const STORAGE_URL_KEY = "arogya.supabase.url";
const STORAGE_KEY_KEY = "arogya.supabase.anon_key";

export function getActiveSupabaseConfig() {
  if (typeof window !== "undefined") {
    const savedUrl = localStorage.getItem(STORAGE_URL_KEY);
    const savedKey = localStorage.getItem(STORAGE_KEY_KEY);
    if (savedUrl && savedKey) {
      return { url: savedUrl, key: savedKey, source: "user_custom", orgId: SUPABASE_ORG_ID, projectRef: SUPABASE_PROJECT_REF };
    }
  }

  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tinwzrwomldbbbrwnazn.supabase.co",
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_i4H4gOhMqL_hkCioArUEPQ_owYL8smN",
    source: "default",
    orgId: process.env.NEXT_PUBLIC_SUPABASE_ORG_ID || SUPABASE_ORG_ID,
    projectRef: SUPABASE_PROJECT_REF,
  };
}

export function setCustomSupabaseConfig(url: string, key: string) {
  if (typeof window === "undefined") return;
  const trimmedUrl = url.trim();
  const trimmedKey = key.trim();
  try {
    const parsed = new URL(trimmedUrl);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
      throw new Error("Supabase URL must use HTTPS.");
    }
  } catch (err) {
    throw new Error(`Invalid Supabase URL: ${err instanceof Error ? err.message : String(err)}`);
  }
  localStorage.setItem(STORAGE_URL_KEY, trimmedUrl);
  localStorage.setItem(STORAGE_KEY_KEY, trimmedKey);
  browserClient = null; // force re-creation
}

export function clearCustomSupabaseConfig() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_URL_KEY);
  localStorage.removeItem(STORAGE_KEY_KEY);
  browserClient = null;
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getActiveSupabaseConfig();
  return Boolean(url && key);
}

export function createClient() {
  if (browserClient) return browserClient;

  const { url, key } = getActiveSupabaseConfig();
  browserClient = createSupabaseClient(url, key);
  return browserClient;
}

export interface StoredFileInfo {
  name: string;
  id?: string;
  size?: number;
  created_at?: string;
  url: string;
  source: "supabase_storage" | "local_cache";
  bucket: StorageBucket;
}

const LOCAL_STORAGE_FILES_KEY = "arogya.local_s3_files";

function getLocalStoredFiles(): StoredFileInfo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_FILES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalStoredFile(item: StoredFileInfo) {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalStoredFiles();
    const updated = [item, ...existing.filter((f) => f.name !== item.name)].slice(0, 50);
    localStorage.setItem(LOCAL_STORAGE_FILES_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Could not save to local storage file index", err);
  }
}

/**
 * Robust S3/Supabase storage uploader with offline IndexedDB fallback.
 * Automatically downscales images on the client to ~150KB before upload,
 * conserving rural cellular bandwidth and preventing localStorage quota overflow.
 */
export async function uploadToStorage(
  bucket: StorageBucket,
  fileName: string,
  file: File | Blob
): Promise<{ url: string; source: "supabase_storage" | "local_cache"; name: string }> {
  const cleanPath = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  let uploadPayload: Blob = file;
  try {
    const { downscaleImage } = await import("../storage/offline-db.ts");
    uploadPayload = await downscaleImage(file);
  } catch {
    // Proceed with original file if downscaling module is unavailable
  }

  try {
    const supabase = createClient();

    const { data, error } = await supabase.storage.from(bucket).upload(cleanPath, uploadPayload, {
      cacheControl: "3600",
      upsert: true,
      contentType: uploadPayload.type || "image/jpeg",
    });

    if (!error && data?.path) {
      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      if (publicUrlData?.publicUrl) {
        const item: StoredFileInfo = {
          name: cleanPath,
          url: publicUrlData.publicUrl,
          source: "supabase_storage",
          bucket,
          size: uploadPayload.size,
          created_at: new Date().toISOString(),
        };
        saveLocalStoredFile(item);
        return { url: publicUrlData.publicUrl, source: "supabase_storage", name: cleanPath };
      }
    }
  } catch (err) {
    console.warn("Storage upload failed or offline; using local IndexedDB fallback", err);
  }

  // Robust Offline Fallback: save blob into IndexedDB
  try {
    const { saveOfflineFile } = await import("../storage/offline-db.ts");
    const blobUrl = await saveOfflineFile(cleanPath, fileName, bucket, uploadPayload);
    if (blobUrl) {
      return { url: blobUrl, source: "local_cache", name: cleanPath };
    }
  } catch (idbErr) {
    console.warn("IndexedDB offline fallback error", idbErr);
  }

  // Final fallback to memory object URL
  const objectUrl = typeof window !== "undefined" ? URL.createObjectURL(uploadPayload) : "";
  return { url: objectUrl, source: "local_cache", name: cleanPath };
}

export async function listStorageFiles(bucket: StorageBucket): Promise<StoredFileInfo[]> {
  const localItems = getLocalStoredFiles().filter((f) => f.bucket === bucket);
  try {
    const supabase = createClient();
    const { data, error } = await supabase.storage.from(bucket).list("", {
      limit: 50,
      sortBy: { column: "created_at", order: "desc" },
    });

    if (!error && data && data.length > 0) {
      const remoteItems: StoredFileInfo[] = data.map((d) => {
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(d.name);
        return {
          name: d.name,
          id: d.id,
          size: d.metadata?.size,
          created_at: d.created_at,
          url: pub?.publicUrl || "",
          source: "supabase_storage",
          bucket,
        };
      });

      // Merge remote with local items
      const names = new Set(remoteItems.map((r) => r.name));
      const filteredLocals = localItems.filter((l) => !names.has(l.name));
      return [...remoteItems, ...filteredLocals];
    }
  } catch {
    // offline
  }
  return localItems;
}

export async function deleteStorageFile(bucket: StorageBucket, fileName: string): Promise<boolean> {
  let success = false;
  try {
    const supabase = createClient();
    const { error } = await supabase.storage.from(bucket).remove([fileName]);
    if (!error) success = true;
  } catch {
    // offline
  }
  if (typeof window !== "undefined") {
    try {
      const existing = getLocalStoredFiles();
      localStorage.setItem(
        LOCAL_STORAGE_FILES_KEY,
        JSON.stringify(existing.filter((f) => f.name !== fileName))
      );
      success = true;
    } catch {
      // ignore
    }
  }
  return success;
}
