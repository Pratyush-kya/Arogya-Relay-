"use client";

import Activity from "lucide-react/dist/esm/icons/activity.mjs";
import ArrowUpRight from "lucide-react/dist/esm/icons/arrow-up-right.mjs";
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
import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { conceptLabel, findConcept } from "@/lib/i18n/glossary";

type Symptom = {
  id: string;
  conceptId: string;
  label: string;
  icon: LucideIcon;
  urgent?: boolean;
};

const symptoms: Symptom[] = [
  { id: "fever", conceptId: "sym.fever", label: "Fever", icon: Thermometer },
  { id: "cough", conceptId: "sym.cough", label: "Cough", icon: Wind },
  { id: "rapid-breathing", conceptId: "sym.rapid_breathing", label: "Rapid breathing", icon: Activity, urgent: true },
  { id: "diarrhoea", conceptId: "sym.diarrhoea", label: "Diarrhoea", icon: Waves },
  { id: "rash", conceptId: "sym.rash", label: "Rash", icon: Sparkles },
  { id: "severe-fatigue", conceptId: "sym.severe_fatigue", label: "Severe fatigue", icon: BatteryLow },
  { id: "chest-pain", conceptId: "sym.chest_pain", label: "Chest pain", icon: HeartPulse, urgent: true },
  { id: "severe-headache", conceptId: "sym.severe_headache", label: "Severe headache", icon: Brain, urgent: true },
  { id: "vomiting", conceptId: "sym.vomiting", label: "Vomiting", icon: CloudRain },
  { id: "dizziness", conceptId: "sym.dizziness", label: "Dizziness", icon: RefreshCcw },
];

export default function SymptomChecker({ onBack }: { onBack: () => void }) {
  const { t, tf, effectiveLang } = useLanguage();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [details, setDetails] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const selectedSymptoms = symptoms.filter((symptom) => selected.has(symptom.id));

  function toggleSymptom(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleFromKeyboard(event: KeyboardEvent<HTMLButtonElement>, id: string) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggleSymptom(id);
  }

  function resizeDetails(value: string) {
    setDetails(value);
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
  }

  return (
    <fieldset className="sc-shell">
      <legend className="sr-only">{t("symptom.legend")}</legend>

      <header className="sc-header">
        <span className="sc-eyebrow">{t("symptom.eyebrow")}</span>
        <h2>{t("symptom.headline")}</h2>
        <p>{t("symptom.help")}</p>
      </header>

      <div className="sc-grid" aria-label="Symptoms">
        {symptoms.map(({ id, conceptId, icon: Icon, urgent }) => {
          const checked = selected.has(id);
          const urgentHintId = urgent ? `${id}-urgent-hint` : undefined;
          const displayLabel = conceptLabel(findConcept(conceptId)!, effectiveLang);

          return (
            <button
              key={id}
              type="button"
              role="checkbox"
              aria-checked={checked}
              aria-describedby={urgentHintId}
              className={checked ? "sc-option selected" : "sc-option"}
              onClick={() => toggleSymptom(id)}
              onKeyDown={(event) => toggleFromKeyboard(event, id)}
            >
              <span className="sc-icon" aria-hidden="true"><Icon size={19} strokeWidth={1.9} /></span>
              <span className="sc-label">{displayLabel}</span>
              <span className="sc-check" aria-hidden="true"><Check size={15} strokeWidth={3} /></span>
              {urgent && (
                <span className="sc-urgent" aria-hidden="true">
                  <i />
                  <span className="sc-tooltip">{t("symptom.urgentFlag")}</span>
                </span>
              )}
              {urgent && <span id={urgentHintId} className="sr-only">{t("symptom.urgentFlag")}. {t("symptom.triage")}</span>}
            </button>
          );
        })}
      </div>

      {selectedSymptoms.map((symptom) => (
        <input key={symptom.id} type="hidden" name="symptoms" value={symptom.label} />
      ))}

      <div className="sc-details-row">
        <div className="sc-count" role="status" aria-live="polite">
          <strong key={selected.size}>
            {tf(selected.size === 1 ? "symptom.selectedOne" : "symptom.selectedMany", { count: selected.size })}
          </strong>
        </div>
        <span className="sc-safety">{t("symptom.triage")}</span>
      </div>

      <label className="sc-notes">
        <span>{t("symptom.otherDetails")}</span>
        <textarea
          ref={textareaRef}
          name="field-notes"
          rows={3}
          maxLength={500}
          value={details}
          onChange={(event) => resizeDetails(event.target.value)}
          placeholder={t("symptom.placeholder")}
        />
        <small>{details.length} / 500</small>
      </label>

      <footer className="sc-footer">
        <button type="button" className="sc-back" onClick={onBack}>{t("common.back")}</button>
        <button type="submit" className="sc-continue" disabled={selected.size === 0}>
          {t("common.continue")} <ArrowUpRight size={16} strokeWidth={2.2} />
        </button>
      </footer>
    </fieldset>
  );
}

