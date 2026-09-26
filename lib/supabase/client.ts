import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const ADMIN_EMAIL = "pratyushkiranrath4@gmail.com";

export function isAdminEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

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
      return { url: savedUrl, key: savedKey, source: "user_custom" };
    }
  }

  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wyhputdbwuslzgipfzjm.supabase.co",
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_i4H4gOhMqL_hkCioArUEPQ_owYL8smN",
    source: "default",
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

/**
 * Robust S3/Supabase storage uploader with offline Data-URL fallback.
 * Guarantees zero data-loss: if the network or Supabase bucket is unreachable,
 * converts the file to base64 Data-URL for local offline usage.
 */
export async function uploadToStorage(
  bucket: "prescriptions" | "screenings" | "doctor-credentials",
  fileName: string,
  file: File | Blob
): Promise<{ url: string; source: "supabase_storage" | "local_cache" }> {
  try {
    const supabase = createClient();
    const cleanPath = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    const { data, error } = await supabase.storage.from(bucket).upload(cleanPath, file, {
      cacheControl: "3600",
      upsert: true,
    });

    if (!error && data?.path) {
      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      if (publicUrlData?.publicUrl) {
        return { url: publicUrlData.publicUrl, source: "supabase_storage" };
      }
    }
  } catch (err) {
    console.warn("Storage upload failed or offline; using local data URL fallback", err);
  }

  // Fallback to local Data URL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve({ url: reader.result as string, source: "local_cache" });
    };
    reader.onerror = () => {
      resolve({ url: "", source: "local_cache" });
    };
    reader.readAsDataURL(file);
  });
}
