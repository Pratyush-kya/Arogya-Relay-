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
    email: "samarpitbiswal966@gmail.com",
    display_name: "Dr. Samarpit Biswal, MD",
    role: "doctor",
    pseudo_id: "DOC-SAMARPIT",
    medical_reg_no: "OMC-2020-54190",
    council_name: "Odisha Medical Council",
    specialization: "Internal Medicine & Paediatrics",
    facility_name: "AIIMS Bhubaneswar (Apex Trauma Centre)",
    verification_status: "verified",
    verified_by: ADMIN_EMAIL,
    verified_at: "2026-09-30T10:00:00.000Z",
  },
  {
    id: "doc-demo-2",
    email: "bishnuprasadsatapathy7846@gmail.com",
    display_name: "Dr. Bishnu Prasad Satapathy, MBBS",
    role: "doctor",
    pseudo_id: "DOC-BISHNU",
    medical_reg_no: "OMC-2018-88412",
    council_name: "Odisha Medical Council",
    specialization: "General Medicine & Cardiology",
    facility_name: "Capital Hospital Bhubaneswar / DHH Khurda",
    verification_status: "verified",
    verified_by: ADMIN_EMAIL,
    verified_at: "2026-09-30T10:00:00.000Z",
  },
  {
    id: "hw-demo-1",
    email: "asha.priya@field.arogya.org",
    display_name: "Priya Devi (Senior ASHA Facilitator)",
    role: "health_worker",
    pseudo_id: "HW-PRIYA-04",
    facility_name: "SCB Rural Health Outreach Division, Cuttack",
    phone: "1800-180-8080",
  },
  {
    id: "chem-demo-scb",
    email: "janaushadhi.scb@gov.in",
    display_name: "PMBJP Jan Aushadhi Kendra — SCB Medical College",
    role: "chemist",
    pseudo_id: "PHARM-SCB-01",
    facility_name: "SCB Medical College Campus, Mangalabag, Cuttack",
    address: "Mangalabag, Cuttack, Odisha 753007",
    phone: "1800-180-8080",
  },
  {
    id: "chem-demo-cap",
    email: "janaushadhi.capital@gov.in",
    display_name: "PMBJP Jan Aushadhi Kendra — Capital Hospital",
    role: "chemist",
    pseudo_id: "PHARM-CAP-02",
    facility_name: "Capital Hospital Campus, Unit-6, Bhubaneswar",
    address: "Unit-6, Bhubaneswar, Odisha 751001",
    phone: "1800-180-8080",
  },
  {
    id: "pat-demo-1",
    email: "citizen.patient@arogya.org",
    display_name: "Citizen Patient",
    role: "patient",
    pseudo_id: "PT-CITIZEN-01",
    address: "Bhubaneswar-Cuttack Twin City Corridor, Odisha",
  },
  {
    id: "pat-demo-2",
    email: "debasis.mohanty@gmail.com",
    display_name: "Debasis Mohanty",
    role: "patient",
    pseudo_id: "PT-MW3WL4EP",
    address: "Saheed Nagar, Khurda District, Odisha",
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
    key:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpbnd6cndvbWxkYmJicnduYXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MDAwMjIsImV4cCI6MjEwNjA3NjAyMn0.7OPyz68F-y95QRiwrr9Riw0VsjN8mIs7jXvsrsz-lig",
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
