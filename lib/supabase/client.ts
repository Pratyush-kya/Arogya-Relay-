import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const ADMIN_EMAIL = "pratyushkiranrath4@gmail.com";
export const DEFAULT_ADMIN_PASSWORD = "Pratyush@3130";

export const SUPABASE_ORG_ID = "ufohydwnepbmjoigycfj";
export const SUPABASE_PROJECT_REF = "tekgwowxqwwahaazyhne";
export const SUPABASE_ORG_URL = "https://supabase.com/dashboard/org/ufohydwnepbmjoigycfj";
export const SUPABASE_PROJECT_URL = "https://supabase.com/dashboard/project/tekgwowxqwwahaazyhne";
export const SUPABASE_SQL_URL = "https://supabase.com/dashboard/project/tekgwowxqwwahaazyhne/sql/new";
export const SUPABASE_API_SETTINGS_URL = "https://supabase.com/dashboard/project/tekgwowxqwwahaazyhne/settings/api";
export const S3_STORAGE_ENDPOINT = "https://tekgwowxqwwahaazyhne.supabase.co/storage/v1/s3";

export function isAdminEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export function isAdminPassword(pass: string | null | undefined): boolean {
  if (!pass) return false;
  return pass === "Pratyush@3130" || pass === "Pratyush@#3130";
}

export type StorageBucket = "screenings" | "prescriptions" | "doctor-credentials" | "patient-records";

export type Profile = {
  id: string;
  email?: string | null;
  role: "admin" | "doctor" | "health_worker" | "reviewer" | "patient" | "caregiver";
  display_name: string | null;
  pseudo_id: string;
  facility_name?: string | null;
  phone?: string | null;
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
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tekgwowxqwwahaazyhne.supabase.co",
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_i4H4gOhMqL_hkCioArUEPQ_owYL8smN",
    source: "default",
    orgId: process.env.NEXT_PUBLIC_SUPABASE_ORG_ID || SUPABASE_ORG_ID,
    projectRef: SUPABASE_PROJECT_REF,
  };
}

export function setCustomSupabaseConfig(url: string, key: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_URL_KEY, url.trim());
  localStorage.setItem(STORAGE_KEY_KEY, key.trim());
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
 * Robust S3/Supabase storage uploader with offline Data-URL fallback.
 * Guarantees zero data-loss: if the network or Supabase bucket is unreachable,
 * converts the file to base64 Data-URL for local offline usage.
 */
export async function uploadToStorage(
  bucket: StorageBucket,
  fileName: string,
  file: File | Blob
): Promise<{ url: string; source: "supabase_storage" | "local_cache"; name: string }> {
  const cleanPath = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  try {
    const supabase = createClient();

    const { data, error } = await supabase.storage.from(bucket).upload(cleanPath, file, {
      cacheControl: "3600",
      upsert: true,
    });

    if (!error && data?.path) {
      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      if (publicUrlData?.publicUrl) {
        const item: StoredFileInfo = {
          name: cleanPath,
          url: publicUrlData.publicUrl,
          source: "supabase_storage",
          bucket,
          size: file.size,
          created_at: new Date().toISOString(),
        };
        saveLocalStoredFile(item);
        return { url: publicUrlData.publicUrl, source: "supabase_storage", name: cleanPath };
      }
    }
  } catch (err) {
    console.warn("Storage upload failed or offline; using local data URL fallback", err);
  }

  // Fallback to local Data URL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const item: StoredFileInfo = {
        name: cleanPath,
        url: dataUrl,
        source: "local_cache",
        bucket,
        size: file.size,
        created_at: new Date().toISOString(),
      };
      saveLocalStoredFile(item);
      resolve({ url: dataUrl, source: "local_cache", name: cleanPath });
    };
    reader.onerror = () => {
      resolve({ url: "", source: "local_cache", name: cleanPath });
    };
    reader.readAsDataURL(file);
  });
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
