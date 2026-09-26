import type { SymptomFacts, Urgency, Guidance } from "./types";
import { KNOWLEDGE_CHUNKS, SOURCE_MAP } from "./knowledge-pack";

export interface RuleEvaluation {
  urgency: Urgency;
  reasons: string[];
  dangerSigns: string[];
  actions: string[];
  homeCare: string[];
  matchedChunkIds: string[];
}

export function evaluateRules(facts: SymptomFacts): RuleEvaluation {
  const text = ((facts.freeText || "") + " " + facts.selectedSymptoms.join(" ")).toLowerCase();
  const symptoms = new Set(facts.selectedSymptoms);

  // 1. EMERGENCY CHECKS
  const isEmergency =
    symptoms.has("sym.chest_pain") ||
    text.includes("chest pain") ||
    text.includes("pressure in chest") ||
    text.includes("left arm pain") ||
    symptoms.has("sym.rapid_breathing") && facts.rapidDeterioration ||
    text.includes("cannot breathe") ||
    text.includes("blue lips") ||
    text.includes("unconscious") ||
    text.includes("convulsion") ||
    text.includes("seizure") ||
    text.includes("severe bleeding") ||
    (facts.pregnant && (text.includes("severe headache") || text.includes("blurred vision") || text.includes("fits"))) ||
    text.includes("snake bite") ||
    text.includes("suicide") ||
    text.includes("kill myself");

  if (isEmergency) {
    const dangerSigns = [
      "Critical airway, breathing, or hemodynamic compromise",
      "Signs of myocardial infarction, acute respiratory failure, or eclampsia",
    ];
    return {
      urgency: "emergency",
      reasons: ["Life-threatening physiological distress or red-flag emergency symptoms identified."],
      dangerSigns,
      actions: ["🚨 CALL 112 (NATIONAL EMERGENCY) OR TRANSPORT TO DISTRICT HOSPITAL IMMEDIATELY."],
      homeCare: ["Do not exert the patient. Keep airways clear. Maintain calm environment while emergency help arrives."],
      matchedChunkIds: ["c-etat-airway", "c-aha-cardiac", "c-anc-eclampsia"],
    };
  }

  // 2. SAME-DAY REFERRAL
  const isSameDay =
    (facts.ageGroup === "infant" && (symptoms.has("sym.fever") || text.includes("fever"))) ||
    (facts.pregnant && (symptoms.has("sym.fever") || text.includes("fever"))) ||
    symptoms.has("sym.rapid_breathing") ||
    (symptoms.has("sym.diarrhoea") && symptoms.has("sym.vomiting")) ||
    text.includes("dehydrat") ||
    text.includes("cannot drink") ||
    text.includes("vomiting everything") ||
    (facts.durationDays && facts.durationDays > 3 && (symptoms.has("sym.fever") || text.includes("fever")));

  if (isSameDay) {
    return {
      urgency: "same_day",
      reasons: ["High-risk patient subgroup (infant/pregnancy) or persistent fever/dehydration requiring same-day primary health review."],
      dangerSigns: ["Sunken eyes, lethargy, rapid shallow breathing, continuous vomiting."],
      actions: ["Visit the nearest Primary Health Centre (PHC) or Community Health Centre (CHC) today."],
      homeCare: [
        "Give sips of Oral Rehydration Salts (ORS) solution continuously.",
        "Sponge forehead with lukewarm water for fever relief.",
        "Continue normal breastfeeding for infants.",
      ],
      matchedChunkIds: ["c-imci-fever", "c-anc-fever", "c-nhp-dehydration", "c-idsp-fever"],
    };
  }

  // 3. CLINICIAN REVIEW
  const isReview =
    symptoms.has("sym.fever") ||
    symptoms.has("sym.rash") ||
    symptoms.has("sym.severe_headache") ||
    symptoms.has("sym.severe_fatigue") ||
    (facts.durationDays && facts.durationDays > 2) ||
    Boolean(facts.conditions);

  if (isReview) {
    return {
      urgency: "clinician_review",
      reasons: ["Symptoms warrant non-urgent clinical evaluation and targeted diagnostic workup by a doctor or ANM."],
      dangerSigns: ["Spreading redness, high persistent fever, sudden shortness of breath."],
      actions: ["Schedule consultation with your nearest healthcare worker or doctor within 24-48 hours."],
      homeCare: [
        "Rest adequately and drink plenty of clean boiled fluids.",
        "Take Paracetamol (500mg adult) for fever or body ache as needed.",
        "Monitor for any worsening red flag signs.",
      ],
      matchedChunkIds: ["c-nhp-chronic", "c-idsp-fever"],
    };
  }

  // 4. INSUFFICIENT INFORMATION
  if (facts.selectedSymptoms.length === 0 && (!facts.freeText || !facts.freeText.trim())) {
    return {
      urgency: "insufficient_information",
      reasons: ["No symptoms or sensations were selected or entered."],
      dangerSigns: [],
      actions: ["Please select your symptoms from the list or describe what you are experiencing."],
      homeCare: ["Rest and monitor for emerging symptoms."],
      matchedChunkIds: [],
    };
  }

  // 5. SELF-CARE INFORMATION
  return {
    urgency: "self_care_information",
    reasons: ["Mild, low-risk symptoms consistent with uncomplicated minor illness."],
    dangerSigns: ["Fever lasting more than 3 days, difficulty breathing, chest pain."],
    actions: ["Manage symptoms at home with rest, hydration, and safe OTC remedies."],
    homeCare: [
      "Drink warm fluids, lemon water, and herbal tea.",
      "Steam inhalation and salt-water gargle for mild throat/cough irritation.",
      "Seek care if symptoms do not improve within 3 days.",
    ],
    matchedChunkIds: ["c-nhp-selfcare"],
  };
}
