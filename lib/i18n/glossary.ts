/**
 * Arogya Relay clinical glossary (Problem Statement 3).
 *
 * Clinical concepts are stored separately from display labels using stable
 * concept IDs. Equivalent symptom selections in different languages resolve to
 * the same internal concept and therefore the same triage result — this is the
 * "language-neutral clinical meaning" requirement.
 *
 * Where permitted and available, concepts reference standard coding systems
 * (SNOMED CT, LOINC, FHIR, UCUM-style units). In this prototype those codes are
 * illustrative placeholders only and are NOT used for any real diagnosis.
 *
 * SAFETY: glossary terms for symptoms, body parts, negation, duration, pregnancy,
 * child health, medicine form/strength/dose/route/timing, allergies, referrals,
 * and "before food / after food / as needed / do not double the dose" are
 * protected. A brand is never translated into a different drug. Decimal
 * quantities and units are preserved exactly.
 *
 * PROTOTYPE / SYNTHETIC DATA ONLY.
 */

import type { LanguageCode, SafetyTier } from "./types";

/** A single clinical concept with per-language labels and codes. */
export interface ClinicalConcept {
  /** Stable internal concept id (language-neutral). */
  id: string;
  /** Safety tier governing which translations may be patient-facing. */
  tier: SafetyTier;
  /** Optional standard code (SNOMED CT / LOINC / FHIR / UCUM) — illustrative. */
  code?: { system: "SNOMED_CT" | "LOINC" | "FHIR" | "UCUM"; value: string };
  /** Native-script label per language (missing → English label used). */
  labels: Partial<Record<LanguageCode, string>>;
  /** Romanized synonym (for input matching / transliteration hints). */
  romanized?: string[];
  /** Plain-language explanation (Tier 2/3). */
  explanation?: Partial<Record<LanguageCode, string>>;
  /** Review metadata. */
  review: {
    status: "approved" | "machine_draft" | "untranslated";
    reviewer?: string;
    version: string;
    reviewedAt?: string;
  };
}

/** Symptom/observation concepts used by the screening + care-guidance forms. */
export const SYMPTOM_CONCEPTS: ClinicalConcept[] = [
  { id: "sym.fever", tier: "tier2", code: { system: "SNOMED_CT", value: "386661006" }, labels: { en: "Fever", hi: "बुखार", or: "ଜ୍ୱର", bn: "জ্বর", as: "জ্বৰ", te: "జ్వరం", mr: "ताप", sat: "ᱥᱮᱨᱮᱝ" }, romanized: ["bukhar", "jwara"], review: { status: "approved", reviewer: "clinician", version: "1.0.0", reviewedAt: "2026-08-20" } },
  { id: "sym.cough", tier: "tier2", code: { system: "SNOMED_CT", value: "49727002" }, labels: { en: "Cough", hi: "खाँसी", or: "କାଶ", bn: "কাশি", as: "কাহ", te: "దగ్గు", mr: "खोकला", sat: "ᱠᱟᱹᱥᱤ" }, review: { status: "approved", reviewer: "clinician", version: "1.0.0", reviewedAt: "2026-08-20" } },
  { id: "sym.rapid_breathing", tier: "tier2", code: { system: "SNOMED_CT", value: "19539004" }, labels: { en: "Rapid breathing", hi: "तेज़ साँस", or: "ଦ୍ରୁତ ଶ୍ୱାସ", bn: "দ্রুত শ্বাস", as: "দ্ৰুত শ্বাস", te: "వేగవంతమైన శ్వాస", mr: "वेगवान श्वास", sat: "ᱟᱲᱟᱝ ᱥᱟᱥ" }, review: { status: "approved", reviewer: "clinician", version: "1.0.0", reviewedAt: "2026-08-20" } },
  { id: "sym.diarrhoea", tier: "tier2", code: { system: "SNOMED_CT", value: "62315008" }, labels: { en: "Diarrhoea", hi: "दस्त", or: "ହଜାମ୍ବା", bn: "ডায়রিয়া", as: "পাচনী", te: "విరేచనాలు", mr: "जुलाब", sat: "ᱦᱚᱡᱟᱢᱵᱟ" }, review: { status: "approved", reviewer: "clinician", version: "1.0.0", reviewedAt: "2026-08-20" } },
  { id: "sym.rash", tier: "tier2", code: { system: "SNOMED_CT", value: "271807003" }, labels: { en: "Rash", hi: "चकत्ते", or: "ଦଦୁର", bn: "ফুসকুড়ি", as: "ফুস্কুড়ি", te: "దద్దురు", mr: "फोड", sat: "ᱫᱟᱫᱩᱨ" }, review: { status: "approved", reviewer: "clinician", version: "1.0.0", reviewedAt: "2026-08-20" } },
  { id: "sym.severe_fatigue", tier: "tier2", code: { system: "SNOMED_CT", value: "84229001" }, labels: { en: "Severe fatigue", hi: "तेज़ थकान", or: "ପ୍ରବଳ ଥକାପଣ", bn: "তীব্র ক্লান্তি", as: "তীব্ৰ ক্লান্তি", te: "తీవ్ర అలసట", mr: "तीव्र थकवा", sat: "ᱟᱸᱡᱟᱝ ᱠᱷᱟᱛᱤ" }, review: { status: "approved", reviewer: "clinician", version: "1.0.0", reviewedAt: "2026-08-20" } },
  { id: "sym.chest_pain", tier: "tier2", labels: { en: "Chest pain", hi: "सीने में दर्द", or: "ଛାତିରେ ଯନ୍ତ୍ରଣା", bn: "বুকে ব্যথা", as: "বুকুৰ বিষ", te: "ఛాతీ నొప్పి", mr: "छातीत दुखणे", sat: "ᱠᱚᱨᱟᱢ ᱦᱟᱥᱩ" }, review: { status: "approved", reviewer: "clinician", version: "1.0.0", reviewedAt: "2026-08-20" } },
  { id: "sym.severe_headache", tier: "tier2", labels: { en: "Severe headache", hi: "तेज़ सिरदर्द", or: "ପ୍ରବଳ ମୁଣ୍ଡବିନ୍ଧା", bn: "তীব্র মাথাব্যথা", as: "তীব্ৰ মূৰৰ বিষ", te: "తీవ్రమైన తలనొప్పి", mr: "तीव्र डोकेदुखी", sat: "ᱟᱸᱡᱟᱝ ᱵᱚᱦᱚᱜ ᱦᱟᱥᱩ" }, review: { status: "approved", reviewer: "clinician", version: "1.0.0", reviewedAt: "2026-08-20" } },
  { id: "sym.vomiting", tier: "tier2", labels: { en: "Vomiting", hi: "उल्टी", or: "ବାନ୍ତି", bn: "বমি", as: "বমি", te: "వాంతులు", mr: "उलटी", sat: "ᱩᱞᱴᱤ" }, review: { status: "approved", reviewer: "clinician", version: "1.0.0", reviewedAt: "2026-08-20" } },
  { id: "sym.dizziness", tier: "tier2", labels: { en: "Dizziness", hi: "चक्कर आना", or: "ମୁଣ୍ଡ ବୁଲାଇବା", bn: "মাথা ঘোরা", as: "মূৰ ঘূৰণি", te: "తల తిరగడం", mr: "चक्कर येणे", sat: "ᱵᱚᱦᱚᱜ ᱟᱹᱪᱩᱨ" }, review: { status: "approved", reviewer: "clinician", version: "1.0.0", reviewedAt: "2026-08-20" } },
];

/** Medicine timing / route concepts (Tier 1 — protected, never machine-drafted). */
export const MEDICINE_CONCEPTS: ClinicalConcept[] = [
  { id: "med.before_food", tier: "tier1", labels: { en: "Before food" }, review: { status: "approved", version: "1.0.0", reviewedAt: "2026-08-20" } },
  { id: "med.after_food", tier: "tier1", labels: { en: "After food" }, review: { status: "approved", version: "1.0.0", reviewedAt: "2026-08-20" } },
  { id: "med.as_needed", tier: "tier1", labels: { en: "As needed" }, review: { status: "approved", version: "1.0.0", reviewedAt: "2026-08-20" } },
  { id: "med.do_not_double", tier: "tier1", labels: { en: "Do not double the dose" }, review: { status: "approved", version: "1.0.0", reviewedAt: "2026-08-20" } },
  { id: "med.once_daily", tier: "tier1", labels: { en: "Once daily" }, review: { status: "approved", version: "1.0.0", reviewedAt: "2026-08-20" } },
  { id: "med.one_tablet", tier: "tier1", labels: { en: "One tablet" }, review: { status: "approved", version: "1.0.0", reviewedAt: "2026-08-20" } },
];

/**
 * Resolve a concept's label in a language. Always returns a string (English
 * fallback). Tier 1 labels are never machine-translated — English is canonical.
 */
export function conceptLabel(concept: ClinicalConcept, lang: LanguageCode): string {
  if (lang === "en") return concept.labels.en ?? concept.id;
  const localized = concept.labels[lang];
  if (localized) return localized;
  return concept.labels.en ?? concept.id;
}

/** Look up a concept by id across both registries. */
export function findConcept(id: string): ClinicalConcept | undefined {
  return [...SYMPTOM_CONCEPTS, ...MEDICINE_CONCEPTS].find((c) => c.id === id);
}

/** All concepts (for offline pack / tests). */
export const ALL_CONCEPTS: ClinicalConcept[] = [...SYMPTOM_CONCEPTS, ...MEDICINE_CONCEPTS];

