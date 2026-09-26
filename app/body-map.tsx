"use client";

import { useState } from "react";

export interface BodyZone {
  id: string;
  name: string;
  hindiName: string;
  symptoms: { key: string; label: string; icon: string }[];
  description: string;
}

export const BODY_ZONES: BodyZone[] = [
  {
    id: "head",
    name: "Head, Eyes & Neck",
    hindiName: "सिर, आँखें और गर्दन",
    symptoms: [
      { key: "headache", label: "Headache", icon: "🤕" },
      { key: "sore_throat", label: "Sore throat / Swallowing pain", icon: "🧣" },
      { key: "conjunctivitis", label: "Eye redness / Discharge", icon: "👁️" },
    ],
    description: "Cranial, ophthalmic, and upper respiratory tract afflictions",
  },
  {
    id: "chest",
    name: "Chest & Respiratory",
    hindiName: "छाती और श्वसन प्रणाली",
    symptoms: [
      { key: "cough", label: "Cough (Persistent / Productive)", icon: "🫁" },
      { key: "shortness_of_breath", label: "Shortness of breath (Dyspnea)", icon: "😮‍💨" },
      { key: "chest_pain", label: "Chest tightness / Pain", icon: "⚡" },
    ],
    description: "Pulmonary, cardiac, and respiratory distress signals",
  },
  {
    id: "abdomen",
    name: "Abdomen & GI",
    hindiName: "पेट और पाचन तंत्र",
    symptoms: [
      { key: "diarrhea", label: "Diarrhea / Loose Stool", icon: "💧" },
      { key: "nausea", label: "Nausea / Vomiting", icon: "🤢" },
      { key: "abdominal_pain", label: "Abdominal cramping", icon: "💢" },
    ],
    description: "Gastrointestinal infection, dehydration, and colic signs",
  },
  {
    id: "arms",
    name: "Arms, Wrists & Hands",
    hindiName: "हाथ और कलाई",
    symptoms: [
      { key: "rash", label: "Webbed finger rash / Scabies burrows", icon: "🖐️" },
      { key: "joint_pain", label: "Wrist / Joint stiffness", icon: "🦴" },
      { key: "skin_lesion", label: "Honey-crust sores (Impetigo)", icon: "🩹" },
    ],
    description: "Peripheral limb dermatological lesions and joint pain",
  },
  {
    id: "legs",
    name: "Legs, Groin & Feet",
    hindiName: "पैर और जांघ",
    symptoms: [
      { key: "swelling", label: "Pedal edema / Leg swelling", icon: "🦶" },
      { key: "cellulitis", label: "Hot spreading redness (Cellulitis)", icon: "🔥" },
      { key: "ringworm", label: "Ring-shaped border (Tinea)", icon: "⭕" },
    ],
    description: "Lower extremity bacterial spread, edema, and fungal rashes",
  },
];

interface BodyMapProps {
  selectedSymptoms: string[];
  onToggleSymptom: (symptomKey: string) => void;
  onSelectZone?: (zoneId: string) => void;
}

export function AnatomicalBodyMap({
  selectedSymptoms,
  onToggleSymptom,
  onSelectZone,
}: BodyMapProps) {
  const [activeZoneId, setActiveZoneId] = useState<string>("chest");

  const currentZone = BODY_ZONES.find((z) => z.id === activeZoneId) || BODY_ZONES[1];

  const handleZoneClick = (zoneId: string) => {
    setActiveZoneId(zoneId);
    onSelectZone?.(zoneId);
  };

  const isZoneActive = (zoneId: string) => activeZoneId === zoneId;
  const zoneHasSelectedSymptoms = (zone: BodyZone) =>
    zone.symptoms.some((s) => selectedSymptoms.includes(s.key));

  return (
    <div className="anatomical-map-container" aria-label="Interactive Anatomical Symptom Map">
      <div className="map-view-layout">
        {/* Interactive SVG Mannequin */}
        <div className="mannequin-frame">
          <div className="mannequin-label">
            <span>FRONTAL ANATOMICAL VIEW</span>
            <small>Tap body zone to focus symptoms</small>
          </div>

          <svg
            className="body-mannequin-svg"
            viewBox="0 0 200 420"
            role="img"
            aria-label="Human body mannequin with clickable zones"
          >
            <defs>
              <filter id="zone-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#17644f" floodOpacity="0.4" />
              </filter>
            </defs>

            {/* Silhouette Base */}
            <g className="mannequin-silhouette">
              {/* Head */}
              <circle cx="100" cy="42" r="26" className="mannequin-base" />
              {/* Neck */}
              <rect x="92" y="66" width="16" height="18" rx="4" className="mannequin-base" />
              {/* Torso & Pelvis */}
              <path
                d="M 68 84 Q 100 80 132 84 L 126 195 Q 100 202 74 195 Z"
                className="mannequin-base"
              />
              {/* Left Arm */}
              <path
                d="M 66 85 Q 40 130 34 185 Q 30 205 32 235 L 42 235 Q 46 195 54 150 L 70 98 Z"
                className="mannequin-base"
              />
              {/* Right Arm */}
              <path
                d="M 134 85 Q 160 130 166 185 Q 170 205 168 235 L 158 235 Q 154 195 146 150 L 130 98 Z"
                className="mannequin-base"
              />
              {/* Left Leg */}
              <path
                d="M 74 195 Q 70 280 68 375 L 82 375 Q 86 280 94 200 Z"
                className="mannequin-base"
              />
              {/* Right Leg */}
              <path
                d="M 126 195 Q 130 280 132 375 L 118 375 Q 114 280 106 200 Z"
                className="mannequin-base"
              />
            </g>

            {/* Interactive Hit Zones */}
            {/* 1. HEAD ZONE */}
            <g
              className={`svg-zone ${isZoneActive("head") ? "active" : ""} ${zoneHasSelectedSymptoms(BODY_ZONES[0]) ? "has-symptoms" : ""}`}
              onClick={() => handleZoneClick("head")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleZoneClick("head")}
            >
              <circle cx="100" cy="42" r="28" className="zone-hit" />
              <circle cx="100" cy="42" r="6" className="zone-marker" />
            </g>

            {/* 2. CHEST ZONE */}
            <g
              className={`svg-zone ${isZoneActive("chest") ? "active" : ""} ${zoneHasSelectedSymptoms(BODY_ZONES[1]) ? "has-symptoms" : ""}`}
              onClick={() => handleZoneClick("chest")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleZoneClick("chest")}
            >
              <rect x="70" y="85" width="60" height="52" rx="12" className="zone-hit" />
              <circle cx="100" cy="110" r="7" className="zone-marker" />
            </g>

            {/* 3. ABDOMEN ZONE */}
            <g
              className={`svg-zone ${isZoneActive("abdomen") ? "active" : ""} ${zoneHasSelectedSymptoms(BODY_ZONES[2]) ? "has-symptoms" : ""}`}
              onClick={() => handleZoneClick("abdomen")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleZoneClick("abdomen")}
            >
              <rect x="74" y="142" width="52" height="50" rx="10" className="zone-hit" />
              <circle cx="100" cy="166" r="6" className="zone-marker" />
            </g>

            {/* 4. ARMS ZONE (Both left and right) */}
            <g
              className={`svg-zone ${isZoneActive("arms") ? "active" : ""} ${zoneHasSelectedSymptoms(BODY_ZONES[3]) ? "has-symptoms" : ""}`}
              onClick={() => handleZoneClick("arms")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleZoneClick("arms")}
            >
              <circle cx="44" cy="170" r="18" className="zone-hit" />
              <circle cx="156" cy="170" r="18" className="zone-hit" />
              <circle cx="44" cy="170" r="6" className="zone-marker" />
              <circle cx="156" cy="170" r="6" className="zone-marker" />
            </g>

            {/* 5. LEGS ZONE (Both left and right) */}
            <g
              className={`svg-zone ${isZoneActive("legs") ? "active" : ""} ${zoneHasSelectedSymptoms(BODY_ZONES[4]) ? "has-symptoms" : ""}`}
              onClick={() => handleZoneClick("legs")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleZoneClick("legs")}
            >
              <rect x="64" y="210" width="72" height="160" rx="12" className="zone-hit" />
              <circle cx="76" cy="275" r="6" className="zone-marker" />
              <circle cx="124" cy="275" r="6" className="zone-marker" />
            </g>
          </svg>
        </div>

        {/* Focused Zone Detail & Symptom Toggle Panel */}
        <div className="zone-detail-panel">
          <div className="zone-header">
            <span className="zone-badge">ACTIVE ZONE</span>
            <h3>{currentZone.name}</h3>
            <span className="hindi-label">{currentZone.hindiName}</span>
            <p>{currentZone.description}</p>
          </div>

          <div className="zone-symptoms-list">
            <strong>Targeted Regional Symptoms:</strong>
            <div className="symptom-chips-row">
              {currentZone.symptoms.map((s) => {
                const isSelected = selectedSymptoms.includes(s.key);
                return (
                  <button
                    key={s.key}
                    type="button"
                    className={`body-symptom-chip ${isSelected ? "selected" : ""}`}
                    onClick={() => onToggleSymptom(s.key)}
                  >
                    <span className="chip-icon">{s.icon}</span>
                    <span className="chip-text">{s.label}</span>
                    <span className="chip-check">{isSelected ? "✓" : "＋"}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Zone Navigator Buttons */}
          <div className="zone-quick-nav">
            <small>Quick Select Zone:</small>
            <div className="nav-zone-pills">
              {BODY_ZONES.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  className={`nav-pill ${activeZoneId === z.id ? "active" : ""} ${zoneHasSelectedSymptoms(z) ? "marked" : ""}`}
                  onClick={() => handleZoneClick(z.id)}
                >
                  {z.name.split(",")[0]}
                  {zoneHasSelectedSymptoms(z) && <span className="dot" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
