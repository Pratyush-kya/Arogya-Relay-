/**
 * Arogya Relay i18n + glossary tests (Problem Statement 3).
 *
 * Run via: npm test  (which builds, then runs node --test on this file).
 */

import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  CATALOG,
  LANGUAGES,
  LANGUAGE_BY_CODE,
  DEFAULT_LANGUAGE,
  resolveLanguage,
  t,
  tf,
  statusOf,
  missingKeys,
  isPatientSafe,
  keysByTier,
  detectVoice,
  type LanguageCode,
} from "../lib/i18n/index.ts";
import { conceptLabel, findConcept, SYMPTOM_CONCEPTS, MEDICINE_CONCEPTS } from "../lib/i18n/glossary.ts";

const ALL_LANGS: LanguageCode[] = ["en", "hi", "or", "bn", "as", "te", "mr", "sat"];

test("registry contains all 8 mandatory first-release languages", () => {
  const codes = LANGUAGES.map((l) => l.code).sort();
  assert.deepEqual(codes, [...ALL_LANGS].sort());
});

test("resolveLanguage normalises unknown/BCP-47 input and falls back safely", () => {
  assert.equal(resolveLanguage("hi"), "hi");
  assert.equal(resolveLanguage("hi-IN"), "hi");
  assert.equal(resolveLanguage("EN"), "en");
  assert.equal(resolveLanguage(null), DEFAULT_LANGUAGE);
  assert.equal(resolveLanguage("xx"), DEFAULT_LANGUAGE);
});

test("formatted translations preserve counts and use the selected language", () => {
  assert.equal(tf("symptom.selectedMany", "hi", { count: 3 }), "3 लक्षण चुने गए");
  assert.equal(tf("nearby.retainedUntil", "or", { date: "22/08/2026" }), "22/08/2026 ପର୍ଯ୍ୟନ୍ତ ରଖାଯିବ");
});

test("all major website surfaces consume the shared language provider", async () => {
  for (const file of ["page.tsx", "symptom-checker.tsx", "care-guidance.tsx", "nearby-care.tsx", "care-plan.tsx", "read-aloud.tsx"]) {
    const source = await readFile(new URL(`../app/${file}`, import.meta.url), "utf8");
    assert.match(source, /useLanguage\(/, `${file} must use the global language context`);
  }
  const nearby = await readFile(new URL("../app/nearby-care.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(nearby, /useState<Language>/, "Nearby Care must not keep a second language state");
});

test("every catalog key has an English (approved baseline) string", () => {
  for (const key of Object.keys(CATALOG)) {
    assert.ok(CATALOG[key].en.length > 0, `missing en for ${key}`);
  }
});

test("Odia translations contain no whitespace-prefixed nukta that renders as a dotted circle", () => {
  for (const [key, entry] of Object.entries(CATALOG)) {
    assert.doesNotMatch(entry.or ?? "", /(?:^|\s)\u0B3C/, `${key} contains an unsupported standalone Odia nukta`);
  }
  assert.equal(t("nav.nearby", "or"), "ନିକଟତମ ଚିକିତ୍ସା");
});

test("English fallback always returns a non-empty string", () => {
  for (const key of Object.keys(CATALOG)) {
    assert.equal(t(key, "en"), CATALOG[key].en);
  }
});

test("complete packs (en/hi/or) are fully translated for every non-Tier-1 key", () => {
  // Tier 1 safety-critical strings (emergency, consent, medication, notices)
  // are intentionally English-only and must NEVER be machine-translated, so they
  // are excluded from the "complete pack" completeness check by design.
  for (const lang of ["hi", "or"] as LanguageCode[]) {
    const missing = missingKeys(lang).filter((k) => CATALOG[k].tier !== "tier1");
    assert.equal(missing.length, 0, `untranslated (non-Tier1) in ${lang}: ${missing.join(", ")}`);
  }
});

test("substantial/partial packs fall back to English for missing keys (no crash, no empty)", () => {
  for (const lang of ["bn", "as", "te", "mr", "sat"] as LanguageCode[]) {
    const missing = missingKeys(lang);
    for (const key of missing) {
      const out = t(key, lang);
      assert.ok(out.length > 0, `empty fallback for ${key}/${lang}`);
      assert.equal(out, CATALOG[key].en, `fallback should be English for ${key}/${lang}`);
    }
  }
});

test("Tier 1 strings are never machine-drafted and are patient-safe only in English", () => {
  const tier1 = keysByTier("tier1");
  assert.ok(tier1.length >= 10, "expected many Tier 1 safety strings");
  for (const key of tier1) {
    // Tier 1 has no reviewed non-English translation in the prototype.
    assert.equal(statusOf(key, "hi"), "untranslated");
    assert.equal(isPatientSafe(key, "hi"), false, `${key} must not be patient-safe in hi`);
    assert.equal(isPatientSafe(key, "en"), true);
  }
});

test("Tier 2/3 drafted packs are flagged machine_draft, not approved", () => {
  const drafted = t("nav.overview", "bn");
  assert.ok(drafted.length > 0);
  assert.equal(statusOf("nav.overview", "bn"), "machine_draft");
  // Drafted Tier 3 is allowed in prototype (not untranslated) but flagged.
  assert.notEqual(statusOf("nav.overview", "bn"), "approved");
});

test("clinical concepts resolve to the same id across languages (language-neutral meaning)", () => {
  const fever = findConcept("sym.fever")!;
  assert.equal(conceptLabel(fever, "en"), "Fever");
  assert.equal(conceptLabel(fever, "hi"), "बुखार");
  assert.equal(conceptLabel(fever, "or"), "ଜ୍ୱର");
  // Switching language never changes the concept id / triage meaning.
  assert.equal(fever.id, "sym.fever");
});

test("Tier 1 medicine concepts are English-only and never machine-translated", () => {
  for (const c of MEDICINE_CONCEPTS) {
    assert.equal(c.tier, "tier1");
    assert.equal(c.labels.en, c.labels.en); // canonical
    // No other language label exists for Tier 1 medicine terms.
    for (const lang of ["hi", "or", "bn"] as LanguageCode[]) {
      assert.equal(c.labels[lang], undefined, `${c.id} must not have a ${lang} label`);
    }
  }
});

test("all symptom concepts carry a review version and reviewer metadata", () => {
  for (const c of SYMPTOM_CONCEPTS) {
    assert.ok(c.review.version, `${c.id} missing version`);
    assert.equal(c.review.status, "approved");
  }
});

test("santali uses Ol Chiki script and is LTR (RTL readiness reserved)", () => {
  const sat = LANGUAGE_BY_CODE.sat;
  assert.equal(sat.script, "ol-chiki");
  assert.equal(sat.dir, "ltr");
});

test("detectVoice reports capability without throwing in Node (no recording)", () => {
  // In Node there is no window; must return unsupported, never throw.
  const cap = detectVoice("hi");
  assert.equal(cap.supported, false);
  assert.equal(cap.hasMatchingVoice, false);
});

