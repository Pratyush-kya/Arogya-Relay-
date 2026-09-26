"use client";

import { useCallback, useRef, useState } from "react";
import { assembleGuidance } from "@/lib/clinical/guidance-browser";
import { ReadAloud } from "./read-aloud";
import { URGENCY_PLAIN } from "@/lib/clinical/guidance-browser";
import type { AgeGroup, Guidance, KnowledgeMode, SymptomFacts, Urgency } from "@/lib/clinical/types";
import Activity from "lucide-react/dist/esm/icons/activity.mjs";
import BatteryLow from "lucide-react/dist/esm/icons/battery-low.mjs";
import Brain from "lucide-react/dist/esm/icons/brain.mjs";
import Check from "lucide-react/dist/esm/icons/check.mjs";
import CloudRain from "lucide-react/dist/esm/icons/cloud-rain.mjs";
import HeartPulse from "lucide-react/dist/esm/icons/heart-pulse.mjs";
import RefreshCcw from "lucide-react/dist/esm/icons/refresh-ccw.mjs";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.mjs";
import Thermometer from "lucide-react/dist/esm/icons/thermometer.mjs";
import Waves from "lucide-react/dist/esm/icons/waves.mjs";
import Wind from "lucide-react/dist/esm/icons/wind.mjs";
import type { LucideIcon } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { conceptLabel, findConcept } from "@/lib/i18n/glossary";

/**
 * Care Guidance — structured, accessible symptom intake + the deterministic,
 * offline-first decision-support result.
 *
 * Safety-first: the rules engine runs in the browser immediately (no key, no
 * network) and any red flag drops the user straight into the emergency action
 * with the India number (112). The model/generation layer is optional and can
 * only attach explanation text and citations — never change the urgency tier.
 */

const SYMPTOM_CHIPS: Array<{ conceptId: string; label: string; icon: LucideIcon; urgent?: boolean }> = [
  { conceptId: "sym.fever", label: "Fever", icon: Thermometer },
  { conceptId: "sym.cough", label: "Cough", icon: Wind },
  { conceptId: "sym.rapid_breathing", label: "Rapid breathing", icon: Activity, urgent: true },
  { conceptId: "sym.diarrhoea", label: "Diarrhoea", icon: Waves },
  { conceptId: "sym.rash", label: "Rash", icon: Sparkles },
  { conceptId: "sym.severe_fatigue", label: "Severe fatigue", icon: BatteryLow },
  { conceptId: "sym.chest_pain", label: "Chest pain", icon: HeartPulse, urgent: true },
  { conceptId: "sym.severe_headache", label: "Severe headache", icon: Brain, urgent: true },
  { conceptId: "sym.vomiting", label: "Vomiting", icon: CloudRain },
  { conceptId: "sym.dizziness", label: "Dizziness", icon: RefreshCcw },
];

const URGENCY_TONE: Record<Urgency, string> = {
  emergency: "danger",
  same_day: "warning",
  clinician_review: "info",
  self_care_information: "mint",
  insufficient_information: "neutral",
};

const KNOWLEDGE_LABEL: Record<KnowledgeMode, string> = {
  offline: "Offline knowledge pack",
  online: "Online evidence (allow-listed)",
  offline_fallback: "Offline (online unavailable)",
};

export default function CareGuidance() {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<string[]>([]);
  const [freeText, setFreeText] = useState("");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("adult");
  const [pregnant, setPregnant] = useState(false);
  const [durationDays, setDurationDays] = useState("");
  const [allergies, setAllergies] = useState("");
  const [conditions, setConditions] = useState("");
  const [medicines, setMedicines] = useState("");
  const [result, setResult] = useState<Guidance | null>(null);
  const [knowledgeMode, setKnowledgeMode] = useState<KnowledgeMode>("offline");
  const [showWhy, setShowWhy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const liveRef = useRef<HTMLDivElement | null>(null);

  const toggleChip = useCallback((symptom: string) => {
    setSelected((prev) => (prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]));
  }, []);

  const runGuidance = useCallback(async () => {
    const missing: string[] = [];
    if (ageGroup === "unknown") missing.push("age");
    if (selected.length === 0 && freeText.trim().length === 0) missing.push("main symptom");

    const facts: SymptomFacts = {
      freeText: freeText.trim(),
      selectedSymptoms: selected,
      ageGroup,
      pregnant: ageGroup === "adult" || ageGroup === "adolescent" ? pregnant : false,
      durationDays: durationDays ? Number(durationDays) : undefined,
      allergies: allergies.trim() || undefined,
      conditions: conditions.trim() || undefined,
      currentMedicines: medicines.trim() || undefined,
      missingAnswers: missing,
    };

    setBusy(true);
    try {
      // Offline-first: deterministic engine runs locally with no key.
      let onlineEvidence: Guidance["citations"] = [];
      let mode: KnowledgeMode = "offline";
      if (knowledgeMode === "online") {
        // Attempt server-side online augmentation (de-identified concepts).
        try {
          const res = await fetch("/api/care-guidance", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(facts),
          });
          if (res.ok) {
            const data = (await res.json()) as { guidance: Guidance };
            onlineEvidence = data.guidance.citations;
            mode = data.guidance.knowledgeMode === "online" ? "online" : "offline_fallback";
          } else {
            mode = "offline_fallback";
          }
        } catch {
          mode = "offline_fallback";
        }
      }

      const guidance = assembleGuidance(facts, { knowledgeMode: mode, onlineEvidence });
      setResult(guidance);
      setShowWhy(false);
    } finally {
      setBusy(false);
    }
  }, [ageGroup, allergies, conditions, durationDays, freeText, medicines, pregnant, selected, knowledgeMode]);

  const reset = useCallback(() => {
    setResult(null);
    setSaveMsg(null);
    setShowWhy(false);
  }, []);

  const saveOffline = useCallback(() => {
    if (!result) return;
    try {
      const key = "arogya-relay-care-guidance";
      const prev = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown[];
      const entry = { at: new Date().toISOString(), urgency: result.urgency, id: crypto.randomUUID?.() ?? String(Date.now()) };
      localStorage.setItem(key, JSON.stringify([entry, ...prev].slice(0, 50)));
      setSaveMsg("Saved on this device. Open it again any time — even offline.");
    } catch {
      setSaveMsg("This device blocked local storage. Your guidance was still shown.");
    }
  }, [result]);

  return (
    <div className="page-content section-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t("care.kicker")}</span>
          <h1>{t("care.headline")}</h1>
          <p>{t("care.description")}</p>
        </div>
        <KnowledgeModeToggle mode={knowledgeMode} onChange={setKnowledgeMode} />
      </div>

      {!result && (
        <IntakeForm
          selected={selected}
          onToggle={toggleChip}
          freeText={freeText}
          setFreeText={setFreeText}
          ageGroup={ageGroup}
          setAgeGroup={setAgeGroup}
          pregnant={pregnant}
          setPregnant={setPregnant}
          durationDays={durationDays}
          setDurationDays={setDurationDays}
          allergies={allergies}
          setAllergies={setAllergies}
          conditions={conditions}
          setConditions={setConditions}
          medicines={medicines}
          setMedicines={setMedicines}
          busy={busy}
          onSubmit={runGuidance}
        />
      )}

      {result && (
        <><p className="nc-synthetic">{t("care.reviewedEnglish")}</p><ResultPanel
          guidance={result}
          showWhy={showWhy}
          onToggleWhy={() => setShowWhy((s) => !s)}
          onSave={saveOffline}
          saveMsg={saveMsg}
          onReset={reset}
          liveRef={liveRef}
        /></>
      )}

      <div className="protocol-note" style={{ marginTop: 18 }}>
        <strong>Screening support only.</strong> Arogya Relay highlights possible next steps using a clinician-reviewed
        rules pack. It does not diagnose, prescribe, or replace a clinician. Apply local clinical and referral protocols.
      </div>
    </div>
  );
}

function KnowledgeModeToggle({ mode, onChange }: { mode: KnowledgeMode; onChange: (m: KnowledgeMode) => void }) {
  const { t } = useLanguage();
  return (
    <div className="cg-mode-control">
      <div className="cg-toggle" role="group" aria-label={t("care.knowledgeMode")} aria-describedby="care-mode-status">
        <button type="button" className={mode === "offline" ? "active" : ""} aria-pressed={mode === "offline"} onClick={() => onChange("offline")}>
          {t("care.offlinePack")}
        </button>
        <button type="button" className={mode === "online" ? "active" : ""} aria-pressed={mode === "online"} onClick={() => onChange("online")}>
          {t("care.onlineEvidence")}
        </button>
      </div>
      <span id="care-mode-status" className="cg-mode-status" role="status" aria-live="polite">
        {mode === "online" ? t("care.onlineModeStatus") : t("care.offlineModeStatus")}
      </span>
    </div>
  );
}

function IntakeForm(props: {
  selected: string[];
  onToggle: (s: string) => void;
  freeText: string;
  setFreeText: (v: string) => void;
  ageGroup: AgeGroup;
  setAgeGroup: (v: AgeGroup) => void;
  pregnant: boolean;
  setPregnant: (v: boolean) => void;
  durationDays: string;
  setDurationDays: (v: string) => void;
  allergies: string;
  setAllergies: (v: string) => void;
  conditions: string;
  setConditions: (v: string) => void;
  medicines: string;
  setMedicines: (v: string) => void;
  busy: boolean;
  onSubmit: () => void;
}) {
  const { t, tf, effectiveLang } = useLanguage();
  const {
    selected, onToggle, freeText, setFreeText, ageGroup, setAgeGroup, pregnant, setPregnant,
    durationDays, setDurationDays, allergies, setAllergies, conditions, setConditions, medicines, setMedicines, busy, onSubmit,
  } = props;

  return (
    <section className="cg-card" aria-label={t("care.symptomIntake")}>
      <fieldset className="cg-fieldset">
        <legend>{t("care.mainSymptoms")}</legend>
        <p className="cg-symptom-help">{t("care.chooseEvery")}</p>
        <div className="symptom-grid" aria-label="Main symptoms">
          {SYMPTOM_CHIPS.map(({ conceptId, label, icon: Icon, urgent }) => {
            const checked = selected.includes(label);
            const displayLabel = conceptLabel(findConcept(conceptId)!, effectiveLang);
            return (
              <button
                key={label}
                type="button"
                role="checkbox"
                aria-checked={checked}
                className={checked ? "cg-symptom selected" : "cg-symptom"}
                onClick={() => onToggle(label)}
              >
                <span className="cg-symptom-icon" aria-hidden="true"><Icon size={21} strokeWidth={1.9} /></span>
                <span className="cg-symptom-label">{displayLabel}</span>
                <span className="cg-symptom-check" aria-hidden="true"><Check size={15} strokeWidth={3} /></span>
                {urgent && <span className="cg-triage-dot" role="img" title={t("symptom.urgentFlag")} aria-label={t("symptom.urgentFlag")} />}
              </button>
            );
          })}
        </div>
        <div className="cg-selection-summary" role="status" aria-live="polite">
          <strong key={selected.length}>{tf(selected.length === 1 ? "symptom.selectedOne" : "symptom.selectedMany", { count: selected.length })}</strong>
          <span>{t("care.redDots")}</span>
        </div>
        <label className="cg-text">
          {t("symptom.otherDetails")}
          <span className="cg-textarea-wrap">
            <textarea rows={3} value={freeText} maxLength={4000} onChange={(e) => setFreeText(e.target.value)} placeholder={t("symptom.placeholder")} />
            <small>{freeText.length} / 4000</small>
          </span>
        </label>
      </fieldset>

      <div className="cg-grid">
        <label>
          {t("care.ageGroup")}
          <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}>
            <option value="infant">{t("care.infante")}</option>
            <option value="child">{t("care.child")}</option>
            <option value="adolescent">{t("care.adolescent")}</option>
            <option value="adult">{t("care.adult")}</option>
            <option value="older_adult">{t("care.older")}</option>
            <option value="unknown">{t("care.preferNot")}</option>
          </select>
        </label>
        <label>
          {t("care.duration")}
          <input type="number" min="0" max="120" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} placeholder="e.g. 2" />
        </label>
        <label className="cg-check">
          <input type="checkbox" checked={pregnant} onChange={(e) => setPregnant(e.target.checked)} /> {t("care.pregnant")}
        </label>
      </div>

      <div className="cg-grid">
        <label>
          {t("care.allergies")}
          <input value={allergies} maxLength={500} onChange={(e) => setAllergies(e.target.value)} placeholder="e.g. penicillin" />
        </label>
        <label>
          {t("care.conditions")}
          <input value={conditions} maxLength={500} onChange={(e) => setConditions(e.target.value)} placeholder="e.g. asthma" />
        </label>
        <label>
          {t("care.medicines")}
          <input value={medicines} maxLength={500} onChange={(e) => setMedicines(e.target.value)} placeholder="e.g. inhaler" />
        </label>
      </div>

      <div className="cg-actions">
        <button type="button" className="primary-button" disabled={busy} onClick={onSubmit}>
          {busy ? t("care.checking") : t("care.getGuidance")}
        </button>
      </div>
    </section>
  );
}

function ResultPanel(props: {
  guidance: Guidance;
  showWhy: boolean;
  onToggleWhy: () => void;
  onSave: () => void;
  saveMsg: string | null;
  onReset: () => void;
  liveRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { t } = useLanguage();
  const { guidance, showWhy, onToggleWhy, onSave, saveMsg, onReset, liveRef } = props;
  const tone = URGENCY_TONE[guidance.urgency];

  return (
    <div className="cg-result" aria-live="polite" ref={liveRef}>
      {guidance.urgency === "emergency" && (
        <div className="cg-emergency" role="alert">
          <div className="cg-emergency-head">
            <span className="cg-pulse" aria-hidden="true" />
            <strong>{t("care.emergencyAct")}</strong>
          </div>
          <p className="cg-immediate">{guidance.immediateAction}</p>
          <div className="cg-emergency-actions">
            <a className="cg-call" href={`tel:${guidance.emergencyNumber}`}>Call {guidance.emergencyNumber}</a>
            {guidance.emergencyFacility && <span className="cg-facility">Nearest: {guidance.emergencyFacility}</span>}
          </div>
        </div>
      )}

      <article className={`cg-card cg-tone-${tone}`}>
        <header className="cg-result-head">
          <div>
            <span className="eyebrow">{KNOWLEDGE_LABEL[guidance.knowledgeMode]}</span>
            <h2>{URGENCY_PLAIN[guidance.urgency]}</h2>
          </div>
          <span className={`cg-badge ${tone}`}>{guidance.urgency.replace(/_/g, " ")}</span>
        </header>

        <p className="cg-explain">{guidance.explanation}</p>
        <div className="cg-voice"><ReadAloud text={guidance.explanation} /></div>

        {guidance.urgency !== "emergency" && (
          <div className="cg-immediate-box">
            <strong>{t("care.next")}</strong> {guidance.immediateAction}
          </div>
        )}

        <div className="cg-followup"><span>{t("care.followupLabel")}</span> {guidance.followUpWindow}</div>

        <div className="cg-medicine"><span>{t("care.medicinesLabel")}</span> {guidance.medicineStatus}</div>

        {guidance.warningSigns.length > 0 && (
          <div className="cg-warnings">
            <strong>{t("care.watchFor")}</strong>
            <ul>
              {guidance.warningSigns.map((w, i) => (
                <li key={i}><b>{w.label}</b> — {w.action}</li>
              ))}
            </ul>
          </div>
        )}

        {guidance.citations.length > 0 && (
          <details className="cg-citations">
            <summary>Sources &amp; dates ({guidance.citations.length})</summary>
            <ul>
              {guidance.citations.map((c, i) => (
                <li key={i}>
                  <a href={c.canonicalUrl} target="_blank" rel="noopener noreferrer">{c.title}</a>
                  <span className="cg-src-meta">{c.publisher} · {c.reviewDate ?? c.publicationDate ?? "n.d."} · v{c.version}{c.section ? ` · ${c.section}` : ""}</span>
                </li>
              ))}
            </ul>
            <p className="cg-coverage">Retrieval coverage: {(guidance.retrievalCoverage * 100).toFixed(0)}% — this measures how well the knowledge pack addressed your question, not a clinical probability.</p>
          </details>
        )}

        <div className="cg-clinical-state">
          Clinician review: <b>{guidance.clinicianReviewState.replace(/_/g, " ")}</b>
        </div>

        {guidance.questionsStillNeeded.length > 0 && (
          <div className="cg-questions">
            <strong>{t("care.saferAnswer")}</strong>
            <ul>{guidance.questionsStillNeeded.map((q, i) => <li key={i}>{q}</li>)}</ul>
          </div>
        )}

        <button type="button" className="cg-why" aria-expanded={showWhy} onClick={onToggleWhy}>
          {t("care.why")}
        </button>
        {showWhy && (
          <div className="cg-why-body">
            {guidance.triggeredRules.length > 0 ? (
              <ul>
                {guidance.triggeredRules.map((r) => (
                  <li key={r.ruleId}>
                    Rule <code>{r.ruleId}</code> v{r.version} → {r.label} (requires RMP validation). Trigger: {r.triggerFacts.join(", ")}.
                  </li>
                ))}
              </ul>
            ) : (
              <p>No red-flag rule fired. This guidance uses the curated knowledge pack and a conservative default. It is not a diagnosis.</p>
            )}
            <p className="cg-limit">{guidance.limitation}</p>
          </div>
        )}

        <div className="cg-actions">
          <button type="button" className="secondary-button" onClick={onSave}>{t("care.saveOffline")}</button>
          <button type="button" className="primary-button" onClick={onReset}>{t("care.newCheck")}</button>
        </div>
        {saveMsg && <p className="cg-save-msg" role="status">{saveMsg}</p>}
      </article>
    </div>
  );
}

