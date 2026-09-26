/**
 * Arogya Relay — Internationalisation architecture (Problem Statement 3).
 *
 * Design goals (from the PS3 brief):
 *  - Mandatory first-release languages: English, Hindi, Odia, Bengali, Assamese,
 *    Telugu, Marathi, Santali. The registry can add all 22 scheduled Indian
 *    languages without feature-code changes.
 *  - Translation safety tiers: Tier 1 (safety-critical) requires human/clinician
 *    approved text and is NEVER machine-translated at runtime; Tier 2 (clinical
 *    explanatory) may be drafted but needs review; Tier 3 (normal UI) uses the
 *    standard workflow.
 *  - Full English fallback. No string concatenation of fragments. `lang`/`dir`
 *    attributes set correctly; future RTL readiness.
 *  - Offline-first: the core feature must not require an online translation API.
 *
 * PROTOTYPE / SYNTHETIC DATA ONLY. All strings are demonstration text.
 */

/** Script/orthography used so we can pick fonts and `lang`/`dir` correctly. */
export type Script = "latin" | "devanagari" | "odia" | "bengali" | "telugu" | "ol-chiki";

/** Translation-review status for any catalog entry. */
export type ReviewStatus =
  | "approved" // human + clinician reviewed (Tier 1/2) or standard review (Tier 3)
  | "machine_draft" // auto-drafted, NOT patient-facing in production
  | "untranslated"; // falls back to English

/**
 * Safety tier of a translated string.
 *  - tier1: emergency actions, red flags, medicine names/strengths/timings,
 *           allergy warnings, consent, referral and missed-dose instructions.
 *  - tier2: symptom questions, home-care explanations, evidence summaries.
 *  - tier3: navigation, buttons, filters, empty states, non-clinical help.
 */
export type SafetyTier = "tier1" | "tier2" | "tier3";

/** Every language the app can render. Extend this union to add a language. */
export type LanguageCode =
  | "en" // English
  | "hi" // Hindi
  | "or" // Odia
  | "bn" // Bengali
  | "as" // Assamese
  | "te" // Telugu
  | "mr" // Marathi
  | "sat"; // Santali (Ol Chiki)

/**
 * Language registry. Adding a language is a data change here + a catalog entry;
 * no feature code needs to change.
 */
export interface LanguageMeta {
  code: LanguageCode;
  /** Endonym (native name) for the switcher. */
  nativeName: string;
  /** English name for accessibility/labels. */
  englishName: string;
  script: Script;
  /** Text direction. `ltr` now; `rtl` reserved for future languages. */
  dir: "ltr" | "rtl";
  /** Relative quality of the first-release pack (used to flag drafts). */
  packStatus: "complete" | "substantial" | "partial" | "stub";
  /** True for the separately reviewed Khasi pack (Meghalaya) when enabled. */
  optional?: boolean;
}

export const LANGUAGES: LanguageMeta[] = [
  { code: "en", nativeName: "English", englishName: "English", script: "latin", dir: "ltr", packStatus: "complete" },
  { code: "hi", nativeName: "हिन्दी", englishName: "Hindi", script: "devanagari", dir: "ltr", packStatus: "complete" },
  { code: "or", nativeName: "ଓଡ଼ିଆ", englishName: "Odia", script: "odia", dir: "ltr", packStatus: "complete" },
  { code: "bn", nativeName: "বাংলা", englishName: "Bengali", script: "bengali", dir: "ltr", packStatus: "substantial" },
  { code: "as", nativeName: "অসমীয়া", englishName: "Assamese", script: "bengali", dir: "ltr", packStatus: "substantial" },
  { code: "te", nativeName: "తెలుగు", englishName: "Telugu", script: "telugu", dir: "ltr", packStatus: "substantial" },
  { code: "mr", nativeName: "मराठी", englishName: "Marathi", script: "devanagari", dir: "ltr", packStatus: "substantial" },
  { code: "sat", nativeName: "ᱥᱟᱱᱛᱟᱲᱤ", englishName: "Santali", script: "ol-chiki", dir: "ltr", packStatus: "partial" },
];

/** Language code → metadata lookup. */
export const LANGUAGE_BY_CODE: Record<LanguageCode, LanguageMeta> = Object.fromEntries(
  LANGUAGES.map((l) => [l.code, l]),
) as Record<LanguageCode, LanguageMeta>;

/** Default language for the prototype. */
export const DEFAULT_LANGUAGE: LanguageCode = "en";

/**
 * A single translatable string across all supported languages.
 * Missing translations fall back to English at render time (see `translate`).
 */
export type CatalogEntry = {
  /** Safety tier — drives review gating and runtime machine-translation bans. */
  tier: SafetyTier;
  /** Review status per language. Defaults derived from presence below. */
  en: string;
  hi?: string;
  or?: string;
  bn?: string;
  as?: string;
  te?: string;
  mr?: string;
  sat?: string;
};

/** A flat, typed catalog keyed by a stable string id. */
export type Catalog = Record<string, CatalogEntry>;

/** Voice/read-aloud capability detection result. */
export interface VoiceCapability {
  supported: boolean;
  /** Voices that match the active language, if any. */
  hasMatchingVoice: boolean;
  /** Human-readable reason when unsupported (for fallback UI). */
  reason?: string;
}

