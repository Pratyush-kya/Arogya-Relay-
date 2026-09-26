/**
 * Arogya Relay i18n runtime helpers (Problem Statement 3).
 *
 * Pure functions used by the React provider and by tests. No React imports here
 * so the logic is unit-testable in Node.
 */

import { CATALOG, translate, reviewStatus } from "./catalog.ts";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_BY_CODE,
  LANGUAGES,
  type CatalogEntry,
  type LanguageCode,
  type ReviewStatus,
  type SafetyTier,
  type VoiceCapability,
} from "./types.ts";

export { CATALOG, LANGUAGES, LANGUAGE_BY_CODE, DEFAULT_LANGUAGE, translate, reviewStatus };
export * from "./types.ts";

/** Stable browser storage key for the device language preference. */
export const LANGUAGE_STORAGE_KEY = "arogya.lang";

/**
 * Validate and normalise an incoming language string (e.g. from storage or a
 * URL). Returns the default when the value is unknown. Never throws.
 */
export function resolveLanguage(raw: string | null | undefined): LanguageCode {
  if (!raw) return DEFAULT_LANGUAGE;
  const code = raw.toLowerCase();
  if (code in LANGUAGE_BY_CODE) return code as LanguageCode;
  // Allow bare BCP-47-ish prefixes ("hi-IN" → "hi").
  const prefix = code.split("-")[0];
  if (prefix in LANGUAGE_BY_CODE) return prefix as LanguageCode;
  return DEFAULT_LANGUAGE;
}

/** Look up a catalog entry by key, with English fallback when missing. */
export function getEntry(key: string): CatalogEntry | undefined {
  return CATALOG[key];
}

/**
 * Translate by key. Returns the English fallback if the key or the requested
 * language is missing. Tier 1 entries never fall to machine text.
 */
export function t(key: string, lang: LanguageCode): string {
  const entry = CATALOG[key];
  if (!entry) return key; // Unknown key: surface it so gaps are visible in dev.
  return translate(entry, lang);
}

/** Translate a complete catalog message and replace named placeholders. */
export function tf(
  key: string,
  lang: LanguageCode,
  values: Record<string, string | number>,
): string {
  return t(key, lang).replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match,
  );
}

/** Convenience: review status for a key/language pair. */
export function statusOf(key: string, lang: LanguageCode): ReviewStatus {
  const entry = CATALOG[key];
  if (!entry) return "untranslated";
  return reviewStatus(entry, lang);
}

/** List catalog keys whose translation is missing/empty for a language. */
export function missingKeys(lang: LanguageCode): string[] {
  if (lang === "en") return [];
  return Object.keys(CATALOG).filter((k) => {
    const localized = (CATALOG[k] as Record<string, unknown>)[lang];
    return typeof localized !== "string" || localized.length === 0;
  });
}

/**
 * Detect voice/read-aloud capability for a language without starting a
 * recording or sending anything off-device. Purely local (Web Speech API).
 */
export function detectVoice(lang: LanguageCode): VoiceCapability {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return { supported: false, hasMatchingVoice: false, reason: "speech-synthesis-unavailable" };
  }
  const voices = window.speechSynthesis.getVoices();
  const langMeta = LANGUAGE_BY_CODE[lang];
  const hasMatchingVoice = voices.some(
    (v) => v.lang.toLowerCase().startsWith(lang) || v.lang.toLowerCase().startsWith(langMeta.script),
  );
  return { supported: true, hasMatchingVoice };
}

/**
 * Whether a given string may be shown to patients in production mode.
 * Tier 1 requires an approved (non-draft) translation. Tier 2/3 drafts are
 * allowed in prototype mode but must be flagged.
 */
export function isPatientSafe(key: string, lang: LanguageCode): boolean {
  const entry = CATALOG[key];
  if (!entry) return false;
  if (lang === "en") return true; // English is the approved baseline.
  const status = reviewStatus(entry, lang);
  if (entry.tier === "tier1") return status === "approved";
  return status !== "untranslated";
}

/** All keys for a tier (used by the review dashboard / docs). */
export function keysByTier(tier: SafetyTier): string[] {
  return Object.keys(CATALOG).filter((k) => CATALOG[k].tier === tier);
}

