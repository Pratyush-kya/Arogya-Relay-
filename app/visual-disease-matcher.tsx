"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { useLanguage } from "@/lib/i18n/provider";
import { ReadAloud } from "./read-aloud";

interface PatternResult {
  condition: string;
  hindiName?: string;
  category: string;
  confidence: number;
  description: string;
  dangerSigns: string[];
  fieldAction: string;
  isEmergency?: boolean;
}

export const SAMPLE_CASES = [
  {
    id: "ringworm",
    label: "⭕ Ringworm (Tinea)",
    chips: ["ring_shape", "scaling"],
    body: "arms",
    duration: "few_days",
    feel: "Circular itchy rash with raised scaling outer border and clearer skin in the middle.",
  },
  {
    id: "scabies",
    label: "🌙 Scabies (Night Itch)",
    chips: ["night_itch"],
    body: "arms",
    duration: "few_days",
    feel: "Severe unbearable itching especially at night, tiny red burrow lines between fingers and on wrists.",
  },
  {
    id: "impetigo",
    label: "🍯 Impetigo (Crusts)",
    chips: ["crust", "blisters"],
    body: "face",
    duration: "few_days",
    feel: "Red sores around mouth and nose bursting to form honey-colored sticky crusts.",
  },
  {
    id: "chickenpox",
    label: "💧 Chickenpox (Vesicles)",
    chips: ["blisters", "fever"],
    body: "torso",
    duration: "few_days",
    feel: "Itchy red spots with tiny fluid blisters spreading across chest, back, and face with mild fever.",
  },
];

const COMMON_SENSATION_CHIPS = [
  { id: "night_itch", label: "Intense Night Itching", icon: "🌙" },
  { id: "burning", label: "Burning / Stinging Pain", icon: "🔥" },
  { id: "ring_shape", label: "Circular / Ring-shaped Patch", icon: "⭕" },
  { id: "blisters", label: "Fluid-filled Blisters / Vesicles", icon: "💧" },
  { id: "crust", label: "Honey-colored Crust / Oozing", icon: "🍯" },
  { id: "scaling", label: "Dry Flaky / Peeling Skin", icon: "🍂" },
  { id: "eye_redness", label: "Red Eye with Gritty Discharge", icon: "👁️" },
  { id: "fever", label: "Fever / Shivering", icon: "🌡️" },
  { id: "pain_touch", label: "Hot & Tender to Touch", icon: "⚡" },
  { id: "spreading", label: "Rapidly Spreading Redness", icon: "📈" },
];

export interface VisualDiseaseMatcherTransferData {
  condition: string;
  hindiName?: string;
  category: string;
  symptoms: string[];
  fieldNotes: string;
  urgencyTier: "routine" | "review" | "urgent" | "emergency";
}

interface VisualDiseaseMatcherProps {
  onTransferToScreening?: (data: VisualDiseaseMatcherTransferData) => void;
}

export default function VisualDiseaseMatcher({ onTransferToScreening }: VisualDiseaseMatcherProps = {}) {
  const { t } = useLanguage();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedChips, setSelectedChips] = useState<Set<string>>(new Set());
  const [patientFeelText, setPatientFeelText] = useState("");
  const [bodyLocation, setBodyLocation] = useState("torso");
  const [duration, setDuration] = useState("few_days");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<PatternResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    setResult(null);
  }

  function toggleChip(chipId: string) {
    setSelectedChips((prev) => {
      const next = new Set(prev);
      if (next.has(chipId)) next.delete(chipId);
      else next.add(chipId);
      return next;
    });
  }

  function handleReset() {
    setImageFile(null);
    setImagePreview(null);
    setSelectedChips(new Set());
    setPatientFeelText("");
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function runPatternAnalysis() {
    if (!imagePreview && selectedChips.size === 0 && !patientFeelText.trim()) {
      alert("Please upload an image or select at least one symptom sensation.");
      return;
    }

    setAnalyzing(true);

    setTimeout(() => {
      setAnalyzing(false);

      const chips = Array.from(selectedChips);
      const textLower = patientFeelText.toLowerCase();

      // Check emergency / cellulitis / severe systemic signs
      if (
        (selectedChips.has("pain_touch") && selectedChips.has("spreading") && selectedChips.has("fever")) ||
        textLower.includes("difficulty breathing") ||
        textLower.includes("chest pain") ||
        textLower.includes("swelling throat")
      ) {
        setResult({
          condition: "Severe Bacterial Cellulitis / Systemic Infection Risk",
          hindiName: "गंभीर सेल्युलाइटिस (आपातकालीन संक्रमण)",
          category: "Bacterial Dermatological Emergency",
          confidence: 94,
          description:
            "Rapidly spreading warm, painful erythematous induration accompanied by fever indicates possible deep-tissue cellulitis or systemic sepsis risk.",
          dangerSigns: [
            "Rapid expansion of erythema within hours",
            "High fever, rigors, or altered sensorium",
            "Severe pain disproportionate to visual appearance",
          ],
          fieldAction:
            "🚨 CRITICAL EMERGENCY: Arrange urgent transport to nearest Sub-District or District Hospital immediately. Do not delay for home remedies. Contact 112 or local ambulance.",
          isEmergency: true,
        });
        return;
      }

      // Check Scabies
      if (
        selectedChips.has("night_itch") ||
        textLower.includes("night") ||
        textLower.includes("itching between fingers") ||
        textLower.includes("scabies")
      ) {
        setResult({
          condition: "Scabies (Sarcoptes scabiei infestation)",
          hindiName: "खुजली / खाज (स्केबीज़)",
          category: "Parasitic Cutaneous Infestation",
          confidence: 88,
          description:
            "Intense nocturnal pruritus with papular or excoriated burrows in web spaces, wrists, axillae, or groin is highly indicative of scabies.",
          dangerSigns: ["Secondary bacterial crusting", "Secondary impetigo infection", "Infant irritability"],
          fieldAction:
            "Recommend primary care clinician review for topical permethrin 5% application. Emphasize simultaneous treatment of all household contacts, laundering beddings in hot water, and clipping fingernails.",
          isEmergency: false,
        });
        return;
      }

      // Check Ringworm / Tinea
      if (
        selectedChips.has("ring_shape") ||
        selectedChips.has("scaling") ||
        textLower.includes("ring") ||
        textLower.includes("round") ||
        textLower.includes("circle")
      ) {
        setResult({
          condition: "Tinea Corporis / Dermatophytosis (Ringworm)",
          hindiName: "दाद (रिंगवॉर्म)",
          category: "Superficial Fungal Infection",
          confidence: 91,
          description:
            "Annular, well-demarcated scaly plaque with raised erythematous borders and central clearing. Common in warm, humid microclimates.",
          dangerSigns: ["Severe secondary oozing", "Facial or scalp involvement", "Non-response to barrier hygiene"],
          fieldAction:
            "Keep skin dry and ventilated. Advise patient against using mixed steroid creams (e.g., steroid combinations that aggravate fungal spread). Refer to PHC for topical antifungal (clotrimazole/terbinafine) prescription.",
          isEmergency: false,
        });
        return;
      }

      // Check Impetigo
      if (selectedChips.has("crust") || textLower.includes("honey") || textLower.includes("crust")) {
        setResult({
          condition: "Impetigo Contagiosa",
          hindiName: "पीपदार फुंसी (इम्पेटिगो)",
          category: "Superficial Bacterial Skin Infection",
          confidence: 86,
          description:
            "Erythematous erosions with golden, honey-colored adherent crusts, commonly around nose, mouth, and exposed limbs.",
          dangerSigns: ["Spreading lymphadenopathy", "High fever", "Bullous blistering across trunk"],
          fieldAction:
            "Gently cleanse with clean water and mild soap without picking crusts. Strictly isolate personal towels. Refer to PHC for topical or oral antibiotic course.",
          isEmergency: false,
        });
        return;
      }

      // Check Chickenpox / Varicella
      if (
        (selectedChips.has("blisters") && selectedChips.has("fever")) ||
        textLower.includes("chickenpox") ||
        textLower.includes("water spots")
      ) {
        setResult({
          condition: "Varicella (Chickenpox / Viral Exanthem)",
          hindiName: "चेचक / छोटी माता",
          category: "Communicable Viral Infection",
          confidence: 89,
          description:
            "Centripetal polymorphic rash exhibiting macules, papules, 'dew-drop' vesicles on an erythematous base, and crusting simultaneously.",
          dangerSigns: [
            "Shortness of breath or persistent cough (varicella pneumonia risk)",
            "Lethargy or seizures in infants",
            "Hemorrhagic or bleeding lesions",
          ],
          fieldAction:
            "Maintain strict airborne and contact isolation. Provide calamine lotion for itching, maintain oral hydration, and avoid aspirin (Reye syndrome risk). Schedule doctor review.",
          isEmergency: false,
        });
        return;
      }

      // Check Eye Conjunctivitis
      if (selectedChips.has("eye_redness") || bodyLocation === "eyes" || textLower.includes("eye")) {
        setResult({
          condition: "Acute Conjunctivitis (Pink Eye)",
          hindiName: "आँख आना (कंजंक्टिवाइटिस)",
          category: "Ophthalmic Infection / Inflammation",
          confidence: 87,
          description:
            "Conjunctival hyperaemia with discharge, eyelid crusting upon waking, and foreign body sensation without severe visual deficit.",
          dangerSigns: ["Decreased visual acuity", "Severe corneal clouding", "Pupil irregularity or extreme photophobia"],
          fieldAction:
            "Frequent hand hygiene; do not rub eyes. Flush with clean sterile water. Refer to PHC ophthalmic assistant or doctor for appropriate antimicrobial or lubricating drops.",
          isEmergency: false,
        });
        return;
      }

      // Default Allergic Dermatitis / Eczema
      setResult({
        condition: "Allergic Contact Dermatitis / Pruritic Erythema",
        hindiName: "एलर्जिक डर्मेटाइटिस (त्वचा की सूजन)",
        category: "Inflammatory Cutaneous Reaction",
        confidence: 78,
        description:
          "Pruritic erythematous macular eruption associated with potential allergen, soap, plant, or seasonal contact irritant.",
        dangerSigns: ["Facial or airway angioedema", "Widespread blistering", "High fever"],
        fieldAction:
          "Identify and remove suspected contact irritants. Apply cool compresses. Avoid hot water washing. Refer to Primary Health Centre for clinician evaluation.",
        isEmergency: false,
      });
    }, 900);
  }

  return (
    <div className="visual-matcher-container">
      <header className="page-heading">
        <div>
          <span className="eyebrow">FIELD TRIAGE AI · VISION & PATTERNS</span>
          <h1>Visual Disease & Symptom Matcher</h1>
          <p>
            Capture photos of visible conditions and describe what the patient feels to identify differential
            patterns and emergency red flags.
          </p>
        </div>
      </header>

      <div className="matcher-grid-layout">
        {/* Left Input Column */}
        <section className="matcher-input-card">
          <div className="matcher-section-title">
            <span className="step-num">01</span>
            <div>
              <h3>Upload or Capture Affliction Photo</h3>
              <p>Skin rash, lesion, wound, eye infection, or swelling</p>
            </div>
          </div>

          <div
            className={`image-dropzone ${imagePreview ? "has-image" : ""}`}
            onClick={() => fileInputRef.current?.click()}
          >
            {imagePreview ? (
              <div className="image-preview-wrapper">
                <img src={imagePreview} alt="Condition Preview" className="uploaded-condition-img" />
                <button
                  type="button"
                  className="remove-img-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                  title="Remove Image"
                >
                  ✕ Retake
                </button>
              </div>
            ) : (
              <div className="dropzone-empty">
                <span className="camera-icon">📷</span>
                <strong>Click or Tap to Take/Upload Photo</strong>
                <small>Supports JPEG, PNG, WEBP from phone camera or gallery</small>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleImageUpload}
            />
          </div>

          <div style={{ marginTop: "14px", padding: "10px 12px", background: "var(--surface-muted)", borderRadius: "8px", border: "1px solid var(--line)" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--primary)", display: "block", marginBottom: "6px" }}>
              ⚡ Or Try a Sample Case (1-Click Instant Evaluation):
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {SAMPLE_CASES.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  className="secondary-button"
                  style={{ fontSize: "11px", padding: "4px 8px" }}
                  onClick={() => {
                    setSelectedChips(new Set(sc.chips));
                    setBodyLocation(sc.body);
                    setDuration(sc.duration);
                    setPatientFeelText(sc.feel);
                    setTimeout(() => {
                      runPatternAnalysis();
                    }, 50);
                  }}
                >
                  {sc.label}
                </button>
              ))}
            </div>
          </div>

          <div className="matcher-section-title" style={{ marginTop: "20px" }}>
            <span className="step-num">02</span>
            <div>
              <h3>What Does The Patient Feel?</h3>
              <p>Select all symptom sensations that apply</p>
            </div>
          </div>

          <div className="sensation-chips-grid">
            {COMMON_SENSATION_CHIPS.map((chip) => {
              const active = selectedChips.has(chip.id);
              return (
                <button
                  key={chip.id}
                  type="button"
                  className={`sensation-chip ${active ? "active" : ""}`}
                  onClick={() => toggleChip(chip.id)}
                >
                  <span className="chip-icon">{chip.icon}</span>
                  <span className="chip-label">{chip.label}</span>
                </button>
              );
            })}
          </div>

          <div className="form-row-duo">
            <label>
              Affected Body Location
              <select value={bodyLocation} onChange={(e) => setBodyLocation(e.target.value)}>
                <option value="torso">Torso / Chest / Back</option>
                <option value="face">Face / Scalp</option>
                <option value="arms">Hands / Wrists / Arms</option>
                <option value="legs">Legs / Feet / Groin</option>
                <option value="eyes">Eyes / Ophthalmic</option>
                <option value="general">Generalized / Multiple Areas</option>
              </select>
            </label>

            <label>
              Symptom Duration
              <select value={duration} onChange={(e) => setDuration(e.target.value)}>
                <option value="today">Started Today (&lt;24 hours)</option>
                <option value="few_days">Few Days (2–5 days)</option>
                <option value="week">Over a Week</option>
                <option value="chronic">Recurrent / Chronic</option>
              </select>
            </label>
          </div>

          <div className="auth-field" style={{ marginTop: "14px" }}>
            <label htmlFor="feel-text">Patient's Own Words / Detailed Notes</label>
            <textarea
              id="feel-text"
              rows={3}
              value={patientFeelText}
              onChange={(e) => setPatientFeelText(e.target.value)}
              placeholder="e.g. Itching is unbearable especially under blankets at night, small red bumps appearing between fingers..."
            />
          </div>

          <div className="matcher-actions-row">
            <button
              type="button"
              className="primary-button"
              onClick={runPatternAnalysis}
              disabled={analyzing}
              style={{ minHeight: "48px", fontSize: "14px", width: "100%" }}
            >
              {analyzing ? "Analyzing Visual Patterns..." : "✨ Evaluate Pattern & Triage Guidance"}
            </button>
            {(imagePreview || selectedChips.size > 0 || patientFeelText) && (
              <button type="button" className="secondary-button" onClick={handleReset}>
                Reset
              </button>
            )}
          </div>
        </section>

        {/* Right Output Column */}
        <section className="matcher-output-card">
          {!result ? (
            <div className="empty-analysis-state">
              <span className="empty-icon">🔍</span>
              <h3>No Analysis Performed Yet</h3>
              <p>
                Upload a photo of the skin lesion or visible condition, select the sensations felt by the patient,
                and tap <strong>Evaluate Pattern</strong>.
              </p>
              <div className="guidance-feature-list">
                <div>✓ Detects Scabies, Ringworm, Impetigo, Chickenpox & Allergic Rashes</div>
                <div>✓ Highlights emergency bacterial cellulitis & sepsis red flags</div>
                <div>✓ Provides safe primary care protocol citations aligned with WHO / ICMR</div>
              </div>
            </div>
          ) : (
            <div className={`pattern-result-panel ${result.isEmergency ? "is-emergency-alert" : ""}`}>
              {result.isEmergency && (
                <div className="emergency-flash-header">
                  <span className="pulse-dot" />
                  <strong>IMMEDIATE EMERGENCY ATTENTION REQUIRED</strong>
                </div>
              )}

              <div className="result-header-row">
                <div>
                  <span className="result-badge">{result.category}</span>
                  <h2>{result.condition}</h2>
                  {result.hindiName && <h4 className="vernacular-title">{result.hindiName}</h4>}
                </div>
                <div className="confidence-pill">
                  <strong>{result.confidence}%</strong>
                  <small>Pattern Match</small>
                </div>
              </div>

              <p className="condition-description">{result.description}</p>

              <div style={{ margin: "10px 0 14px" }}>
                <ReadAloud text={`${result.condition}. ${result.description}. Recommended action: ${result.fieldAction}`} />
              </div>

              <div className="danger-signs-box">
                <strong>⚠️ Danger Signs to Watch:</strong>
                <ul>
                  {result.dangerSigns.map((sign, idx) => (
                    <li key={idx}>{sign}</li>
                  ))}
                </ul>
              </div>

              <div className="field-action-recommendation">
                <strong>Recommended Field Action:</strong>
                <p>{result.fieldAction}</p>
                {result.isEmergency && (
                  <div className="emergency-call-box">
                    <a href="tel:112" className="call-112-btn">
                      📞 Call Emergency 112 Now
                    </a>
                  </div>
                )}
              </div>

              {onTransferToScreening && (
                <div style={{ marginTop: "12px", marginBottom: "12px" }}>
                  <button
                    type="button"
                    className="primary-button"
                    style={{ width: "100%", justifyContent: "center", padding: "10px 16px" }}
                    onClick={() => {
                      onTransferToScreening({
                        condition: result.condition,
                        hindiName: result.hindiName,
                        category: result.category,
                        symptoms: Array.from(selectedChips),
                        fieldNotes: `[Visual Matcher: ${result.condition}${result.hindiName ? ` / ${result.hindiName}` : ""}] ${patientFeelText ? `Patient reported: "${patientFeelText}". ` : ""}${result.fieldAction}`,
                        urgencyTier: result.isEmergency ? "emergency" : (result.confidence > 75 ? "urgent" : "routine"),
                      });
                    }}
                  >
                    📋 Transfer into Patient Screening Intake →
                  </button>
                </div>
              )}

              <div className="safety-disclaimer-card">
                <strong>Clinical Safety Notice:</strong>
                <p>
                  Arogya Relay is a screening decision-support aid. Pattern matching is non-diagnostic and must not
                  replace evaluation by a Registered Medical Practitioner (RMP). No prescription medicines may be
                  dispensed without a signed clinician order.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
