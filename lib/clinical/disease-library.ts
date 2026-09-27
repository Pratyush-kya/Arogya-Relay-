/**
 * Comprehensive Predefined Common Diseases & Verified Remedies Library
 * Designed for offline primary health centres, ASHA workers, and rural patients.
 * 100% Free, zero external API keys required, WHO/MoHFW verified guidelines.
 */

export interface CommonDisease {
  id: string;
  name: string;
  category: "dermatological" | "fever_vector" | "gastrointestinal" | "respiratory" | "eye_ent";
  hindiName?: string;
  odiaName?: string;
  urgency: "routine" | "moderate" | "urgent" | "emergency";
  summary: string;
  symptoms: string[];
  visualMarkers: {
    primaryColor: "red" | "pink" | "brown" | "yellow" | "white" | "mixed";
    texture: "macular" | "papular" | "vesicular" | "scaling" | "crusted" | "smooth";
    margin: "annular_ring" | "diffuse" | "clustered" | "burrow" | "linear";
    erythemaMin: number; // minimum redness ratio (0 to 1)
  };
  homeRemedies: string[];
  otcGuidance: string[];
  dangerSigns: string[];
  teleconsultCriteria: string;
}

export const COMMON_DISEASES: CommonDisease[] = [
  {
    id: "ringworm",
    name: "Ringworm / Tinea Corporis (Fungal)",
    hindiName: "दाद (फंगल संक्रमण)",
    odiaName: "ଦାଦ (ଫଙ୍ଗାଲ ସଂକ୍ରମଣ)",
    category: "dermatological",
    urgency: "routine",
    summary: "Superficial fungal infection of the skin characterized by red, itchy, circular ring-like patches with raised borders and clearer centers.",
    symptoms: [
      "Circular rash with raised borders",
      "Clear or normal-looking skin in the center",
      "Persistent itching and scaling",
      "Spreading outer ring edge",
    ],
    visualMarkers: {
      primaryColor: "red",
      texture: "scaling",
      margin: "annular_ring",
      erythemaMin: 0.15,
    },
    homeRemedies: [
      "Keep affected skin clean, dry, and cool.",
      "Wear loose, breathable cotton garments.",
      "Do NOT share towels, clothes, soaps, or bedding.",
      "Wash clothing and towels in hot soapy water and sun-dry thoroughly.",
    ],
    otcGuidance: [
      "Apply topical Antifungal cream (Clotrimazole 1% or Terbinafine 1%) twice daily for at least 2 weeks.",
      "Continue application for 7 days after visible rash clears to prevent recurrence.",
      "Avoid steroid-combination creams (e.g. Betamethasone) which worsen fungal infection.",
    ],
    dangerSigns: [
      "Rash spreads rapidly over large parts of the body.",
      "Pus oozing, warmth, swelling, or systemic fever (bacterial superinfection).",
      "No improvement after 2 weeks of antifungal cream.",
    ],
    teleconsultCriteria: "Consult a clinician if infection affects the scalp, groin, or fails topical therapy.",
  },
  {
    id: "scabies",
    name: "Scabies (Sarcoptes Scabiei Infestation)",
    hindiName: "खुजली / खाज",
    odiaName: "କାଛୁ କୁଣ୍ଡିଆ",
    category: "dermatological",
    urgency: "moderate",
    summary: "Contagious mite infestation causing intense nocturnal itching, small pimple-like bumps, and thin burrow tracks between fingers and flexor creases.",
    symptoms: [
      "Intense itching that worsens dramatically at night",
      "Small red bumps, blisters, or tiny burrows in finger webs",
      "Itching on wrists, elbows, waistline, buttocks, and underarms",
      "Multiple family members experiencing the same itch",
    ],
    visualMarkers: {
      primaryColor: "pink",
      texture: "papular",
      margin: "burrow",
      erythemaMin: 0.12,
    },
    homeRemedies: [
      "All household contacts must be treated simultaneously, even if currently asymptomatic.",
      "Machine wash or boil all bedding, clothes, and towels used in the past 4 days.",
      "Seal non-washable items in airtight plastic bags for 72 hours (mites perish away from skin).",
    ],
    otcGuidance: [
      "Permethrin 5% cream: Apply from neck down to soles, leave on for 8 to 14 hours, then wash off. Repeat in 7 days.",
      "Calamine lotion or oral Cetirizine (10mg at bedtime) to relieve intense itching.",
    ],
    dangerSigns: [
      "Crusted, thick scaly skin covering large surface areas (Norwegian crusted scabies).",
      "Honey-colored crusts or fever suggesting secondary bacterial impetigo.",
    ],
    teleconsultCriteria: "Refer immediately if infant under 2 months, crusted scabies, or widespread skin breakdown.",
  },
  {
    id: "eczema",
    name: "Eczema / Atopic Dermatitis",
    hindiName: "एक्जिमा / चर्मरोग",
    odiaName: "ଏକଜିମା",
    category: "dermatological",
    urgency: "routine",
    summary: "Chronic non-contagious inflammatory skin condition causing dry, itchy, red patches and cracked skin, especially in skin folds.",
    symptoms: [
      "Dry, cracked, rough, or leathery skin",
      "Persistent itching, especially at night",
      "Red to brownish-gray patches inside elbows and behind knees",
      "Sensitive, raw skin from repeated scratching",
    ],
    visualMarkers: {
      primaryColor: "pink",
      texture: "scaling",
      margin: "diffuse",
      erythemaMin: 0.1,
    },
    homeRemedies: [
      "Apply pure virgin coconut oil or petroleum jelly immediately after bathing on damp skin.",
      "Take short (5–10 min) lukewarm baths with mild, fragrance-free cleanser.",
      "Use soft 100% cotton clothing; avoid harsh wool or rough synthetic fibers.",
      "Apply cool wet compresses to relieve acute itching flare-ups.",
    ],
    otcGuidance: [
      "Over-the-counter 1% Hydrocortisone cream for mild flares (use maximum 5 consecutive days on face).",
      "Frequent emollient moisturizers (minimum twice daily).",
      "Non-sedating antihistamine (Cetirizine) for night-time itch control.",
    ],
    dangerSigns: [
      "Oozing yellow fluid or crusting with fever (eczema herpeticum or impetigo).",
      "Severe pain, sudden spreading rash, or swollen lymph nodes.",
    ],
    teleconsultCriteria: "Review with tele-dermatologist if flare does not settle within 10 days of emollient care.",
  },
  {
    id: "impetigo",
    name: "Impetigo (Bacterial Skin Infection)",
    hindiName: "इम्पेटीगो / मवाद वाले दाने",
    odiaName: "ଇମ୍ପେଟିଗୋ",
    category: "dermatological",
    urgency: "moderate",
    summary: "Highly contagious bacterial infection common in young children, producing red sores that burst and develop honey-colored crusts around the mouth and nose.",
    symptoms: [
      "Red sores that quickly rupture and ooze fluid",
      "Classic honey-colored, golden-brown crusts",
      "Mild itchiness or tenderness without severe pain",
      "Sores around nose, mouth, hands, and diaper area",
    ],
    visualMarkers: {
      primaryColor: "yellow",
      texture: "crusted",
      margin: "clustered",
      erythemaMin: 0.18,
    },
    homeRemedies: [
      "Gently clean sores with clean warm water and mild soap; soak crusts with warm saline compress.",
      "Cover sores with loose sterile gauze to stop bacterial transmission to others.",
      "Keep child's fingernails clipped short and smooth to prevent scratching.",
      "Wash hands thoroughly after touching infected skin.",
    ],
    otcGuidance: [
      "Topical antibiotic ointment (Mupirocin 2% or Fusidic acid 2%) applied 2–3 times daily for 5–7 days.",
      "Avoid sharing towels, cups, pillows, and toys until sores have healed.",
    ],
    dangerSigns: [
      "Sores spreading rapidly despite topical antibiotic for 48 hours.",
      "Fever, malaise, lethargy, or dark-colored urine (post-streptococcal nephritis warning).",
    ],
    teleconsultCriteria: "Requires oral antibiotic prescription if sores are multiple or spreading to limbs.",
  },
  {
    id: "heat_rash",
    name: "Heat Rash / Prickly Heat (Miliaria)",
    hindiName: "घमौरियां",
    odiaName: "ଘମୋରି",
    category: "dermatological",
    urgency: "routine",
    summary: "Occlusion of sweat ducts in humid weather producing clusters of tiny, prickly red bumps and mild stinging on neck, chest, and skin folds.",
    symptoms: [
      "Tiny red pimples or clear fluid droplets on skin",
      "Prickly, stinging, or intense tickling sensation",
      "Appears predominantly in skin folds, neck, groin, under breasts",
      "Aggravated by sweating, high heat, and humidity",
    ],
    visualMarkers: {
      primaryColor: "pink",
      texture: "papular",
      margin: "diffuse",
      erythemaMin: 0.08,
    },
    homeRemedies: [
      "Stay in well-ventilated, shady, cool environments.",
      "Bathe in cool water and allow skin to air dry rather than rubbing with a rough towel.",
      "Wear light, loose cotton fabrics.",
      "Avoid heavy oil-based creams that block sweat pores further.",
    ],
    otcGuidance: [
      "Calamine lotion applied gently to soothe itching.",
      "Prickly heat powder containing zinc oxide and menthol.",
    ],
    dangerSigns: [
      "Bumps become swollen, tender pustules with local warmth (secondary infection).",
      "Body temperature rises above 38.5°C without sweating (heat exhaustion risk).",
    ],
    teleconsultCriteria: "Resolves with cool conditions within 3–4 days; consult if persistent pustules emerge.",
  },
  {
    id: "cellulitis",
    name: "Cellulitis (DANGER: Deep Skin Infection)",
    hindiName: "सेल्युलाइटिस (गंभीर संक्रमण)",
    odiaName: "ସେଲୁଲାଇଟିସ୍ (ଜରୁରୀକାଳୀନ)",
    category: "dermatological",
    urgency: "emergency",
    summary: "Severe, potentially life-threatening bacterial infection of deep skin and subcutaneous tissue presenting as rapidly spreading hot, red, swollen, and tender skin.",
    symptoms: [
      "Rapidly spreading bright red, hot, swollen skin area",
      "Marked tenderness and throbbing pain",
      "High fever, shaking chills, and body aches",
      "Red streaks radiating along lymphatic channels toward groin/armpit",
    ],
    visualMarkers: {
      primaryColor: "red",
      texture: "smooth",
      margin: "diffuse",
      erythemaMin: 0.35,
    },
    homeRemedies: [
      "Keep affected limb elevated above heart level on pillows to reduce swelling.",
      "Rest completely and do NOT attempt to massage, squeeze, or pierce the skin.",
      "Mark the leading edge of redness with a clean pen to track rate of spread.",
    ],
    otcGuidance: [
      "DO NOT treat at home with over-the-counter ointments!",
      "Requires IMMEDIATE physician evaluation for oral or intravenous systemic antibiotics.",
      "Paracetamol 500mg may be used temporarily for severe pain/fever while en route to hospital.",
    ],
    dangerSigns: [
      "Redness spreading by inches within hours.",
      "Confusion, rapid heartbeat, extreme dizziness (sepsis warning signs).",
      "Blistering skin turning dark purple or black (necrotizing fasciitis emergency).",
    ],
    teleconsultCriteria: "IMMEDIATE EMERGENCY REFERRAL to nearest CHC or Sub-Divisional Hospital.",
  },
  {
    id: "gastroenteritis",
    name: "Acute Gastroenteritis & Dehydration",
    hindiName: "दस्त / उल्टी और निर्जलीकरण",
    odiaName: "ଝାଡ଼ା ବାନ୍ତି ଏବଂ ଜଳହୀନତା",
    category: "gastrointestinal",
    urgency: "urgent",
    summary: "Acute intestinal inflammation causing frequent watery loose stools, abdominal cramping, and rapid fluid depletion.",
    symptoms: [
      "Three or more loose or watery stools per day",
      "Abdominal cramps, nausea, and vomiting",
      "Extreme thirst, dry mouth, and sunken eyes",
      "Decreased or absent urine output for >6 hours",
    ],
    visualMarkers: {
      primaryColor: "mixed",
      texture: "smooth",
      margin: "diffuse",
      erythemaMin: 0.05,
    },
    homeRemedies: [
      "Mix 1 packet of WHO-formula Oral Rehydration Salts (ORS) in exactly 1 liter of safe drinking water.",
      "Sip ORS continuously after every loose stool (at least 1 glass for adults, half glass for children).",
      "Continue regular breastfeeding in infants.",
      "Eat light, easily digestible foods (khichdi, rice congee, boiled potatoes, bananas).",
    ],
    otcGuidance: [
      "Zinc dispersible tablet (20mg daily for 14 days in children under 5 to prevent diarrhea recurrence).",
      "Avoid anti-motility drugs (Loperamide) in children or if blood is present in stool.",
    ],
    dangerSigns: [
      "Blood in stool (dysentery).",
      "Inability to retain any liquids due to persistent projectile vomiting.",
      "Extreme lethargy, sunken eyes, dry tongue, or skin pinch goes back very slowly (>2 seconds).",
    ],
    teleconsultCriteria: "Refer immediately to nearest PHC if signs of moderate-to-severe dehydration develop.",
  },
  {
    id: "dengue_fever",
    name: "Dengue / Seasonal Vector Fever",
    hindiName: "डेंगू बुखार",
    odiaName: "ଡେଙ୍ଗୁ ଜ୍ୱର",
    category: "fever_vector",
    urgency: "urgent",
    summary: "Mosquito-borne viral disease with abrupt high fever, severe retro-orbital eye pain, bone-breaking body ache, and maculopapular petechial rash.",
    symptoms: [
      "Sudden high fever (39°C to 40°C) lasting 2–7 days",
      "Severe headache and intense pain behind the eyes",
      "Severe joint and muscular pains ('breakbone fever')",
      "Tiny red pinpoint skin spots (petechiae) or flushing",
    ],
    visualMarkers: {
      primaryColor: "red",
      texture: "macular",
      margin: "diffuse",
      erythemaMin: 0.22,
    },
    homeRemedies: [
      "Strict absolute bed rest and high fluid intake (ORS, coconut water, fresh lime water, dal soup).",
      "Sleep under insecticide-treated bed nets to prevent transmission to family members.",
      "Tepid water sponge bath on forehead and arms if temperature exceeds 38.5°C.",
    ],
    otcGuidance: [
      "Paracetamol (500mg every 6 hours as needed) for fever and pain.",
      "NEVER take Aspirin, Ibuprofen, or Diclofenac (they increase dangerous internal bleeding risk!).",
    ],
    dangerSigns: [
      "Bleeding from gums, nose, vomit, or black tarry stools.",
      "Persistent vomiting, severe abdominal tenderness, or restlessness as fever drops (critical phase).",
      "Cold, clammy hands and feet with rapid weak pulse (Dengue Shock Syndrome).",
    ],
    teleconsultCriteria: "Mandatory complete blood count (CBC) monitoring for platelets and hematocrit at PHC.",
  },
  {
    id: "malaria",
    name: "Malaria (Fever with Shivering Chills)",
    hindiName: "मलेरिया",
    odiaName: "ମ୍ୟାଲେରିଆ",
    category: "fever_vector",
    urgency: "urgent",
    summary: "Plasmodium parasite infection transmitted by Anopheles mosquitoes, causing recurring cyclical attacks of shaking chills, high fever spikes, and profuse drenching sweats.",
    symptoms: [
      "Violent shivering chills lasting 30–60 minutes",
      "Followed by burning high fever (39°C–40.5°C) with headache",
      "Concluded by drenching sweats as fever drops",
      "Profound fatigue, nausea, and loss of appetite",
    ],
    visualMarkers: {
      primaryColor: "mixed",
      texture: "smooth",
      margin: "diffuse",
      erythemaMin: 0.05,
    },
    homeRemedies: [
      "Cover with clean warm blankets during cold/shivering stage.",
      "Remove blankets and perform tepid water sponge baths during hot fever stage.",
      "Drink plenty of fluids (boiled water, ORS, lemon water) to replace sweat losses.",
    ],
    otcGuidance: [
      "Visit ASHA worker or PHC immediately for a free Rapid Diagnostic Test (RDT) or blood slide.",
      "Prescription Artemisinin-based Combination Therapy (ACT) must be completed as prescribed by the doctor.",
      "Do not stop medicine when fever subsides; complete the full course.",
    ],
    dangerSigns: [
      "Altered sensorium, confusion, delirium, or seizures (Cerebral malaria emergency).",
      "Yellowing of eyes/skin (jaundice) or dark brownish urine ('blackwater fever').",
      "Severe vomiting preventing oral medications.",
    ],
    teleconsultCriteria: "Immediate referral to nearest health worker for blood smear and verified ACT regimen.",
  },
  {
    id: "urti_cold",
    name: "Upper Respiratory Infection / Viral Flu",
    hindiName: "जुकाम, खांसी और वायरल फ्लू",
    odiaName: "ଥଣ୍ଡା, କାଶ ଏବଂ ଫ୍ଲୁ",
    category: "respiratory",
    urgency: "routine",
    summary: "Common viral infection affecting nasal passages, pharynx, and sinuses with clear discharge, throat scratchiness, and mild body aches.",
    symptoms: [
      "Nasal congestion, sneezing, and clear watery rhinorrhea",
      "Scratchy or sore throat, especially on swallowing",
      "Mild cough, low-grade fever (<38.5°C), and mild malaise",
    ],
    visualMarkers: {
      primaryColor: "pink",
      texture: "smooth",
      margin: "diffuse",
      erythemaMin: 0.05,
    },
    homeRemedies: [
      "Steam inhalation with warm plain water twice daily to ease airway congestion.",
      "Warm salt-water gargles (half teaspoon salt in a glass of warm water) 3 times a day for sore throat.",
      "Warm ginger-tulsi-honey tea or warm water sips throughout the day.",
      "Adequate sleep and resting the voice.",
    ],
    otcGuidance: [
      "Paracetamol 500mg for headache, mild fever, or throat ache.",
      "Saline nasal drops (0.9% sodium chloride) to relieve blocked nose safely.",
      "Antibiotics are INEFFECTIVE against viral colds and should NEVER be taken without a prescription.",
    ],
    dangerSigns: [
      "Shortness of breath, chest pain, or rapid breathing (>24 breaths/min in adults).",
      "High fever persisting beyond 3 days.",
      "Cough with blood or rust-colored sputum.",
    ],
    teleconsultCriteria: "Consult if symptoms worsen after day 5 or if patient has chronic asthma/COPD.",
  },
  {
    id: "conjunctivitis",
    name: "Conjunctivitis / Pink Eye",
    hindiName: "आंख आना / कंजक्टिवाइटिस",
    odiaName: "ଆଖି ଧରିବା",
    category: "eye_ent",
    urgency: "routine",
    summary: "Inflammation of the transparent membrane lining the eyelid and eyeball, causing noticeable redness, grittiness, itching, and discharge.",
    symptoms: [
      "Pink or red discoloration in the white of one or both eyes",
      "Gritty sensation as if sand is in the eye",
      "Watery or thick yellowish crusting making eyelids stick together in morning",
      "Mild sensitivity to light without severe visual loss",
    ],
    visualMarkers: {
      primaryColor: "red",
      texture: "smooth",
      margin: "diffuse",
      erythemaMin: 0.25,
    },
    homeRemedies: [
      "Clean eye gently from inner to outer corner with clean boiled and cooled water using sterile cotton.",
      "Apply cool or warm compresses to closed eyelids to soothe inflammation.",
      "Wash hands frequently and avoid rubbing eyes.",
      "Do NOT share pillows, eye drops, or towels.",
    ],
    otcGuidance: [
      "Lubricating artificial tear eye drops (preservative-free) for comfort.",
      "Topical antibiotic drops (e.g., Ciprofloxacin 0.3% or Tobramycin) if bacterial discharge is present, under health worker advice.",
    ],
    dangerSigns: [
      "Moderate-to-severe eye pain or deep ache (not just grittiness).",
      "Noticeable reduction in vision or blurring.",
      "Intense sensitivity to normal indoor light (photophobia).",
    ],
    teleconsultCriteria: "Seek emergency ophthalmic evaluation if vision is impaired or cornea appears cloudy.",
  },
  {
    id: "urticaria_hives",
    name: "Urticaria / Allergic Hives",
    hindiName: "पित्ती / एलर्जिक चकत्ते",
    odiaName: "ପିତ୍ତ ବାହାରିବା",
    category: "dermatological",
    urgency: "moderate",
    summary: "Transient vascular reaction of skin producing itchy, raised pink-red wheals (welts) with pale centers that shift location within 24 hours.",
    symptoms: [
      "Raised red or skin-colored welts (wheals) with clear borders",
      "Intense itching, stinging, or burning feeling",
      "Spots appear suddenly, change shape, and fade in one place while appearing in another",
      "Triggered by insect bites, food allergies, viral illnesses, or medications",
    ],
    visualMarkers: {
      primaryColor: "pink",
      texture: "papular",
      margin: "diffuse",
      erythemaMin: 0.18,
    },
    homeRemedies: [
      "Apply cool wet compresses to calm itching.",
      "Avoid overheating, direct hot sun, and tight synthetic clothing.",
      "Keep a log of recently ingested foods, medicines, or insect exposures.",
    ],
    otcGuidance: [
      "Oral non-sedating Antihistamine (Cetirizine 10mg or Fexofenadine 120mg).",
      "Calamine lotion applied topically.",
    ],
    dangerSigns: [
      "Swelling of the lips, tongue, face, or throat (Angioedema).",
      "Difficulty breathing, wheezing, stridor, or tightness in the chest (Anaphylaxis EMERGENCY).",
      "Dizziness, fainting, or sudden collapse.",
    ],
    teleconsultCriteria: "IMMEDIATE EMERGENCY REFERRAL if any breathing difficulty or facial/throat swelling occurs.",
  },
];

export function findDiseasesBySymptom(keyword: string): CommonDisease[] {
  const q = keyword.trim().toLowerCase();
  if (!q) return COMMON_DISEASES;

  return COMMON_DISEASES.filter((d) => {
    return (
      d.name.toLowerCase().includes(q) ||
      (d.hindiName && d.hindiName.toLowerCase().includes(q)) ||
      (d.odiaName && d.odiaName.toLowerCase().includes(q)) ||
      d.summary.toLowerCase().includes(q) ||
      d.symptoms.some((s) => s.toLowerCase().includes(q)) ||
      d.homeRemedies.some((r) => r.toLowerCase().includes(q)) ||
      d.category.toLowerCase().includes(q)
    );
  });
}
