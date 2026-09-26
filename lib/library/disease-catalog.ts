export interface DiseaseRemedy {
  id: string;
  name: string;
  hindiName: string;
  bengaliName?: string;
  odiaName?: string;
  category: "fever" | "stomach" | "respiratory" | "skin" | "first_aid" | "maternal_child";
  urgency: "low" | "medium" | "urgent" | "emergency";
  icon: string;
  symptoms: string[];
  remedies: string[];
  otcGuidance: string[];
  redFlags: string[];
  narrationText: string;
}

export const DISEASE_CATALOG: DiseaseRemedy[] = [
  {
    id: "malaria",
    name: "Malaria / High Chills Fever",
    hindiName: "मलेरिया (कंपकंपी वाला बुखार)",
    bengaliName: "ম্যালেরিয়া",
    odiaName: "ମ୍ୟାଲେରିଆ",
    category: "fever",
    urgency: "urgent",
    icon: "🦟",
    symptoms: [
      "High cyclical fever with severe shivering/chills",
      "Profuse sweating as fever breaks",
      "Severe headache and muscle aches",
      "Fatigue, vomiting, and loss of appetite",
    ],
    remedies: [
      "Sponge forehead with lukewarm or normal water cloth to bring down temperature (avoid ice-cold water).",
      "Keep the patient in a well-ventilated room under a mosquito net.",
      "Ensure continuous hydration with boiled and cooled water, coconut water, or thin dal soup.",
      "Do NOT use heavy blankets during sweating phase.",
    ],
    otcGuidance: [
      "Paracetamol 500mg (adult) every 6-8 hours for fever distress (maximum 2g/day).",
      "Avoid Aspirin or Ibuprofen until Dengue/Malaria rapid diagnostic test confirms diagnosis.",
      "Get a rapid blood slide / RDT test at nearest PHC/Arogya Mandir.",
    ],
    redFlags: [
      "Confusion, delirium, drowsiness, or inability to wake up (Cerebral Malaria risk).",
      "Yellowing of eyes/skin (Jaundice).",
      "Dark brown urine (Blackwater fever).",
      "Continuous vomiting preventing oral intake.",
    ],
    narrationText:
      "Malaria causes cyclical high fever with violent shivering and sweating. Keep hydrated, sponge body with normal water, and visit the nearest PHC immediately for a rapid blood test.",
  },
  {
    id: "dengue",
    name: "Dengue Fever / Breakbone Fever",
    hindiName: "डेंगू बुखार (हड्डी-तोड़ बुखार)",
    bengaliName: "ডেঙ্গু জ্বর",
    odiaName: "ଡେଙ୍ଗୁ ଜ୍ୱର",
    category: "fever",
    urgency: "urgent",
    icon: "🌡️",
    symptoms: [
      "Sudden high fever (103°F-104°F)",
      "Severe retro-orbital pain (pain behind the eyes)",
      "Severe joint and body aches",
      "Skin rash or pinpoint red spots (petechiae)",
    ],
    remedies: [
      "Bed rest is mandatory; avoid physical exertion.",
      "Drink at least 2.5 to 3 liters of fluids daily: ORS, tender coconut water, lemon water, and rice kanji.",
      "Eat easily digestible soft foods (khichdi, boiled vegetables, dal).",
    ],
    otcGuidance: [
      "Paracetamol only for fever and pain.",
      "STRICT CONTRAINDICATION: Absolutely avoid Aspirin, Ibuprofen, Diclofenac, or Brufen as they drastically increase hemorrhage and internal bleeding risk.",
    ],
    redFlags: [
      "Bleeding from gums, nose, or blood in stool/vomit.",
      "Persistent abdominal pain and repeated vomiting.",
      "Extreme restlessness, lethargy, cold clammy hands.",
      "Sudden drop in temperature with worsening weakness (Critical phase).",
    ],
    narrationText:
      "Dengue causes severe body pain and fever. Drink plenty of fluids like ORS and coconut water. Take only Paracetamol, never Ibuprofen or Aspirin. Rush to hospital if bleeding occurs.",
  },
  {
    id: "diarrhea_ors",
    name: "Acute Diarrhea & Dehydration",
    hindiName: "दस्त और निर्जलीकरण (डायरिया)",
    bengaliName: "ডায়রিয়া এবং ডিহাইড্রেশন",
    odiaName: "ଝାଡ଼ା ଓ ନିର୍ଜଳୀକରଣ",
    category: "stomach",
    urgency: "urgent",
    icon: "💧",
    symptoms: [
      "Frequent watery or loose stools (3 or more per day)",
      "Dry mouth, cracked lips, and sunken eyes",
      "Extreme thirst and reduced or dark urine output",
      "Abdominal cramping and fatigue",
    ],
    remedies: [
      "Oral Rehydration Solution (ORS): Dissolve 1 full WHO-ORS sachet in 1 liter of clean drinking water. Drink after every loose stool.",
      "Homemade alternative: 1 liter boiled water + 6 teaspoons sugar + 1/2 teaspoon salt.",
      "Continue regular feeding, breastfeeding for infants, and zinc supplementation for children under 5 for 14 days.",
      "Eat banana, curd (probiotic), boiled potatoes, and rice starch.",
    ],
    otcGuidance: [
      "WHO-ORS packets (freely available at Anganwadi and PHC).",
      "Zinc tablets 20mg once daily for 14 days for children over 6 months.",
      "Do NOT take anti-motility drugs (like loperamide) without doctor prescription, especially if fever or blood in stool is present.",
    ],
    redFlags: [
      "Blood or mucus in stools (Dysentery).",
      "Inability to drink or retain fluids (vomiting everything).",
      "Sunken fontanelle in infants or no urination for more than 6 hours.",
      "Drowsiness, sunken eyes, skin pinch goes back very slowly (Severe dehydration).",
    ],
    narrationText:
      "Diarrhea rapidly causes dehydration. Start drinking ORS solution immediately after every loose motion. Never stop food or breastfeeding. Visit clinic if there is blood in stool or extreme weakness.",
  },
  {
    id: "scabies",
    name: "Scabies (Sarcoptes Infestation)",
    hindiName: "खाज / खुजली (स्केबीज)",
    bengaliName: "চুলকানি (স্ক্যাবিস)",
    odiaName: "କୁଣ୍ଡିଆ (ସ୍କାବିସ)",
    category: "skin",
    urgency: "medium",
    icon: "🌙",
    symptoms: [
      "Intense itching that worsens dramatically at night",
      "Tiny pimple-like bumps and thin burrow tracks in skin folds",
      "Common locations: between fingers, wrists, armpits, waist, and groin",
      "Secondary redness from repeated scratching",
    ],
    remedies: [
      "Wash all clothing, bedsheets, and towels of all household members in hot water, then sun-dry thoroughly.",
      "Trim fingernails short and keep hands clean to prevent secondary bacterial infection.",
      "Apply cool wet washcloths to reduce itching distress.",
    ],
    otcGuidance: [
      "Permethrin 5% lotion: Apply from neck down to toes on dry, cool skin. Leave on for 8-12 hours overnight, then bathe with mild soap.",
      "Crucial: All household contacts must be treated simultaneously, even if asymptomatic.",
      "Calamine lotion can soothe residual itching for a few days after treatment.",
    ],
    redFlags: [
      "Yellow crusts or pus oozing from scratches (Secondary Impetigo bacterial infection).",
      "Spreading redness that is hot and painful to touch (Cellulitis).",
    ],
    narrationText:
      "Scabies causes severe nocturnal itching between fingers and wrists. Wash all household bedding in hot water. Apply Permethrin lotion as instructed and treat all family members together.",
  },
  {
    id: "ringworm",
    name: "Tinea / Ringworm Fungal Infection",
    hindiName: "दाद (फंगल इन्फेक्शन)",
    bengaliName: "দাদ (ফাঙ্গাল ইনফেকশন)",
    odiaName: "ଦାଦ (ଫଙ୍ଗାଲ ସଂକ୍ରମଣ)",
    category: "skin",
    urgency: "low",
    icon: "⭕",
    symptoms: [
      "Circular or ring-shaped reddish patch with raised scaly edge",
      "Clear or normal-looking skin in the center of the ring",
      "Persistent itching and irritation",
      "Spreads outward slowly across skin folds, groin, or scalp",
    ],
    remedies: [
      "Keep the affected skin strictly clean and dry.",
      "Wear loose-fitting, breathable cotton clothing.",
      "Do not share towels, combs, or bedsheets with other people.",
      "Never scratch or scrub with harsh abrasive soaps.",
    ],
    otcGuidance: [
      "Topical Clotrimazole 1% or Terbinafine 1% cream applied twice daily for 2 to 4 weeks (continue 1 week after patch clears).",
      "DANGER WARNING: Do NOT apply steroid creams (e.g. Betamethasone, Clobetasol, or combination quadriderm creams). Steroids temporarily suppress redness while drastically spreading the fungal colony.",
    ],
    redFlags: [
      "Widespread spreading over large body areas.",
      "Secondary bacterial infection with pus or fever.",
    ],
    narrationText:
      "Ringworm is a fungal infection appearing as an itchy circular ring. Keep the area clean and dry. Use antifungal cream like Clotrimazole. Never use steroid creams as they worsen fungal infection.",
  },
  {
    id: "respiratory_cold_flu",
    name: "Common Cold & Viral Cough",
    hindiName: "सामान्य सर्दी, जुकाम और खांसी",
    bengaliName: "ঠান্ডা ও সর্দি-কাশি",
    odiaName: "ଥଣ୍ଡା ଓ କାଶ",
    category: "respiratory",
    urgency: "low",
    icon: "🤧",
    symptoms: [
      "Runny or congested nose and sneezing",
      "Scratchy or sore throat",
      "Mild cough and low-grade fever",
      "Mild headache and body tiredness",
    ],
    remedies: [
      "Warm water steam inhalation 2-3 times daily to relieve nasal congestion.",
      "Salt-water gargle (1/2 tsp salt in 1 cup warm water) 3 times a day for sore throat.",
      "Warm herbal tea or ginger-tulsi-honey decoction (kadha).",
      "Drink warm fluids and get adequate rest.",
    ],
    otcGuidance: [
      "Paracetamol 500mg for headache or fever.",
      "Saline nasal drops for blocked nose.",
      "Antibiotics are completely ineffective against viral colds and should NOT be taken unless prescribed by a doctor.",
    ],
    redFlags: [
      "Fast breathing or shortness of breath (chest indrawing).",
      "Cough lasting more than 2 weeks with evening fever or weight loss (Tuberculosis screening needed).",
      "High persistent fever above 102°F for over 3 days.",
      "Bluish tint on lips or fingernails (Hypoxia).",
    ],
    narrationText:
      "For common cold and cough, take warm steam, do warm salt water gargles, and drink ginger-tulsi tea. Do not take antibiotics for viral colds. Seek medical help if breathing becomes difficult.",
  },
  {
    id: "conjunctivitis",
    name: "Acute Conjunctivitis (Pink Eye)",
    hindiName: "आँख आना (कंजंक्टिवाइटिस)",
    bengaliName: "চোখ ওঠা (কনজাংকটিভাইটিস)",
    odiaName: "ଆଖି ଲାଲ ହେବା (କଞ୍ଜକ୍ଟିଭାଇଟିସ୍)",
    category: "skin",
    urgency: "medium",
    icon: "👁️",
    symptoms: [
      "Redness in the white of one or both eyes",
      "Gritty sensation or itching as if sand is in the eye",
      "Watery or yellowish discharge with crusting of eyelids overnight",
      "Mild sensitivity to light",
    ],
    remedies: [
      "Wipe eye discharge gently using a clean cotton ball soaked in boiled and cooled water (wipe from inner corner to outer, use separate cotton for each eye).",
      "Apply cool compresses over closed eyelids for comfort.",
      "Wash hands thoroughly before and after touching face.",
      "Do not touch or rub eyes. Do not share pillowcases, handkerchiefs, or eye drops.",
    ],
    otcGuidance: [
      "Lubricating artificial tear drops (preservative-free preferred).",
      "Do NOT use steroid eye drops without an eye doctor's slit-lamp examination (can cause corneal ulcer or blindness).",
    ],
    redFlags: [
      "Severe eye pain or deep ache inside the eyeball.",
      "Marked decrease or blurriness in vision.",
      "Hazy, cloudy cornea or unequal pupil sizes.",
    ],
    narrationText:
      "Conjunctivitis causes red, gritty eyes with discharge. Clean gently with boiled and cooled water. Never rub eyes or share towels. See a doctor if there is severe pain or blurred vision.",
  },
  {
    id: "snake_bite",
    name: "Snake Bite First-Aid Protocol",
    hindiName: "सांप का काटना (आपातकालीन प्रोटोकॉल)",
    bengaliName: "সাপের কামড় (জরুরি প্রাথমিক চিকিৎসা)",
    odiaName: "ସାପ କାମୁଡ଼ା (ଜରୁରୀ ପ୍ରାଥମିକ ଚିକିତ୍ସା)",
    category: "first_aid",
    urgency: "emergency",
    icon: "🐍",
    symptoms: [
      "Fang puncture marks on skin",
      "Rapid swelling, pain, and blistering at bite site",
      "Bleeding, drooping eyelids (ptosis), difficulty speaking or swallowing (Neurotoxic)",
      "Spontaneous bleeding, dark urine, or cold shock (Hemotoxic)",
    ],
    remedies: [
      "STAY CALM & IMMOBILIZE: Keep the bitten limb completely still using a splint or cloth sling below heart level.",
      "Remove rings, bangles, tight clothes, and footwear before swelling starts.",
      "RUSH TO PHC/HOSPITAL WITH ANTI-SNAKE VENOM (ASV) IMMEDIATELY.",
      "CRITICAL DON'TS: DO NOT cut the wound, DO NOT suck the venom, DO NOT tie a tight tourniquet (causes gangrene), DO NOT apply herbs or cow dung.",
    ],
    otcGuidance: [
      "No oral medicines or sedatives. Time is critical: Anti-Snake Venom (ASV) is the only proven antidote.",
    ],
    redFlags: [
      "Drooping eyelids, difficulty breathing, slurred speech.",
      "Uncontrolled bleeding from bite marks or mouth.",
      "Unconsciousness or seizures.",
    ],
    narrationText:
      "Snake bite is an emergency. Keep the victim calm and immobilize the bitten limb like a fracture. Never cut, suck venom, or tie tight tourniquets. Transport immediately to the nearest hospital for Anti-Snake Venom.",
  },
  {
    id: "heatstroke",
    name: "Heatstroke & Severe Heat Exhaustion",
    hindiName: "लू लगना / हीट स्ट्रोक",
    bengaliName: "হিট স্ট্রোক",
    odiaName: "ଅଂଶୁଘାତ (ହିଟ୍ ଷ୍ଟ୍ରୋକ୍)",
    category: "first_aid",
    urgency: "emergency",
    icon: "☀️",
    symptoms: [
      "Very high body temperature (104°F or higher)",
      "Hot, red, dry skin (sweating has stopped) or heavy sweating in exhaustion",
      "Confusion, slurred speech, agitation, or loss of consciousness",
      "Rapid pulse and throbbing headache",
    ],
    remedies: [
      "Move patient immediately to a cool, shaded area or air-ventilated room.",
      "Rapid Cooling: Douse skin with cool water, apply wet towels over neck, armpits, and groin, and fan vigorously.",
      "If conscious, provide small sips of cool water or ORS solution.",
      "Do not give fluids if the person is semi-conscious or vomiting.",
    ],
    otcGuidance: [
      "Call emergency ambulance 112/108 immediately.",
      "Do NOT administer Paracetamol for heatstroke (it does not lower environmental hyperthermia and can stress the liver).",
    ],
    redFlags: [
      "Unconsciousness, seizures, or coma.",
      "Vomiting while confused.",
      "Breathing very rapidly and shallowly.",
    ],
    narrationText:
      "Heatstroke is a medical emergency. Move the person to shade immediately and apply wet towels to neck, armpits, and groin with vigorous fanning. Call 112 or local ambulance without delay.",
  },
  {
    id: "hypertension_basics",
    name: "High Blood Pressure (Hypertension Awareness)",
    hindiName: "उच्च रक्तचाप (हाई ब्लड प्रेशर)",
    bengaliName: "উচ্চ রক্তচাপ",
    odiaName: "ଉଚ୍ଚ ରକ୍ତଚାପ",
    category: "fever",
    urgency: "medium",
    icon: "💓",
    symptoms: [
      "Often silent with no symptoms ('The Silent Killer')",
      "Occasional morning headaches at the back of the head",
      "Dizziness, lightheadedness, or ringing in ears",
      "Nosebleeds or palpitations in high spikes",
    ],
    remedies: [
      "Reduce dietary salt intake (less than 1 teaspoon per day).",
      "Avoid fried, packaged foods, pickles, and excess papad.",
      "Engage in 30 minutes of brisk walking daily.",
      "Maintain a blood pressure logbook at every PHC or Health Camp visit.",
    ],
    otcGuidance: [
      "Never stop prescribed antihypertensive medicines without consulting a doctor, even when feeling healthy.",
      "Get BP checked at least once every month at the local Sub-Center or Jan Aushadhi kiosk.",
    ],
    redFlags: [
      "Sudden severe headache with blurred vision or confusion.",
      "Chest pain, heaviness, or shortness of breath (Heart attack / Hypertensive crisis).",
      "Weakness or numbness on one side of face, arm, or leg (Stroke warning).",
    ],
    narrationText:
      "High blood pressure usually has no symptoms. Reduce salt intake, exercise regularly, and never skip prescribed medicines. Check BP regularly at your nearest health center.",
  },
];
