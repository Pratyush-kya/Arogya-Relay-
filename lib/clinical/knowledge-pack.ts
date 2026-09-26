import type { KnowledgeChunk, KnowledgeSource } from "./types.ts";

/**
 * Curated, legally reusable starter clinical knowledge pack.
 *
 * This is a SMALL, illustrative starter corpus for the prototype. Each source
 * is drawn from a national or WHO publisher and is cited with its canonical
 * URL, jurisdiction, population and licence. The pack is versioned and the
 * source hashes are recorded so staleness/integrity can be checked at load.
 *
 * PROTOTYPE ONLY: every source and rule is marked `requiresRmpValidation`.
 * This corpus is NOT a substitute for current clinical guidance and must be
 * reviewed by a Registered Medical Practitioner before any real-patient use.
 * No real patient data is included.
 */

export const KNOWLEDGE_SOURCES: KnowledgeSource[] = [
  {
    sourceId: "WHO-IMCI-2005",
    title: "Integrated Management of Childhood Illness (IMCI) Chart Booklet",
    publisher: "World Health Organization",
    canonicalUrl: "https://www.who.int/teams/maternal-newborn-child-adolescent-health-and-ageing/child-health/imci",
    publicationDate: "2005",
    reviewDate: "2024",
    jurisdiction: "Global / low-resource settings",
    population: ["infant", "child"],
    licence: "WHO open content (reuse with attribution)",
    hash: "imci-2005-c1",
    version: "2026.1",
  },
  {
    sourceId: "WHO-EMT-2016",
    title: "WHO Emergency Triage Assessment and Treatment (ETAT) guideline",
    publisher: "World Health Organization",
    canonicalUrl: "https://www.who.int/publications/i/item/9789241548363",
    publicationDate: "2016",
    reviewDate: "2024",
    jurisdiction: "Global",
    licence: "WHO open content (reuse with attribution)",
    hash: "etat-2016-e1",
    version: "2026.1",
  },
  {
    sourceId: "WHO-ANC-2016",
    title: "WHO Recommendations on Antenatal Care for a Positive Pregnancy Experience",
    publisher: "World Health Organization",
    canonicalUrl: "https://www.who.int/publications/i/item/9789241549914",
    publicationDate: "2016",
    reviewDate: "2023",
    jurisdiction: "Global",
    population: ["adult"],
    licence: "WHO open content (reuse with attribution)",
    hash: "anc-2016-a1",
    version: "2026.1",
  },
  {
    sourceId: "MoHFW-IDSP",
    title: "Integrated Disease Surveillance Programme (IDSP) — Fever surveillance guidance",
    publisher: "Ministry of Health and Family Welfare, Government of India",
    canonicalUrl: "https://idsp.nic.in/",
    reviewDate: "2025",
    jurisdiction: "India",
    licence: "Government of India open data (reuse with attribution)",
    hash: "idsp-fever-i1",
    version: "2026.1",
  },
  {
    sourceId: "MoHFW-NHP",
    title: "National Health Portal — Home care and when to seek care",
    publisher: "National Health Portal, MoHFW, Government of India",
    canonicalUrl: "https://www.nhp.gov.in/",
    reviewDate: "2025",
    jurisdiction: "India",
    licence: "Government of India open content (reuse with attribution)",
    hash: "nhp-homecare-n1",
    version: "2026.1",
  },
  {
    sourceId: "WHO-MH-GAP-2010",
    title: "mhGAP Intervention Guide for mental, neurological and substance use disorders",
    publisher: "World Health Organization",
    canonicalUrl: "https://www.who.int/publications/i/item/9789241548066",
    publicationDate: "2010",
    reviewDate: "2023",
    jurisdiction: "Global",
    licence: "WHO open content (reuse with attribution)",
    hash: "mhgap-2010-m1",
    version: "2026.1",
  },
  {
    sourceId: "AHA-2020",
    title: "Heart Attack / Cardiac emergency signs (public education)",
    publisher: "American Heart Association / Indian guidelines summary",
    canonicalUrl: "https://www.heart.org/en/health-topics/heart-attack/warning-signs-of-a-heart-attack",
    reviewDate: "2024",
    jurisdiction: "Global",
    licence: "Educational reuse (attribution)",
    hash: "aha-cardiac-a1",
    version: "2026.1",
  },
];

export const KNOWLEDGE_CHUNKS: KnowledgeChunk[] = [
  {
    chunkId: "c-imci-fever",
    sourceId: "WHO-IMCI-2005",
    section: "Danger signs — infant and child",
    anchor: "imci-danger-signs",
    text: "Any sick young infant (under 2 months) with fever (or low body temperature) is treated as a serious bacterial infection and needs urgent referral. In a child, danger signs include convulsions, lethargy/unconsciousness, inability to drink or breastfeed, vomiting everything, and severe respiratory distress.",
    keywords: ["fever", "infant", "young infant", "convulsion", "lethargy", "unconscious", "cannot drink", "vomiting everything", "breathing", "danger sign"],
    population: ["infant", "child"],
  },
  {
    chunkId: "c-etat-airway",
    sourceId: "WHO-EMT-2016",
    section: "Airway and breathing — emergency",
    anchor: "etat-airway",
    text: "Emergency triage: inability to breathe, central cyanosis (blue lips/tongue), severe respiratory distress with chest indrawing, or unconsciousness with reduced airway protection are immediate life-threatening emergencies requiring resuscitation and urgent referral.",
    keywords: ["cannot breathe", "struggling to breathe", "blue lips", "cyanosis", "severe chest indrawing", "stridor", "unconscious", "airway"],
    population: ["infant", "child", "adolescent", "adult", "older_adult"],
  },
  {
    chunkId: "c-etat-bleeding",
    sourceId: "WHO-EMT-2016",
    section: "Circulation — severe bleeding",
    anchor: "etat-bleeding",
    text: "Severe or uncontrolled external bleeding is an emergency. Apply firm, direct, continuous pressure over the bleeding point with a clean cloth and arrange urgent transfer.",
    keywords: ["severe bleeding", "uncontrolled bleeding", "heavy bleeding", "bleeding", "pressure"],
    population: ["infant", "child", "adolescent", "adult", "older_adult"],
  },
  {
    chunkId: "c-anc-eclampsia",
    sourceId: "WHO-ANC-2016",
    section: "Pregnancy danger signs",
    anchor: "anc-danger-signs",
    text: "During pregnancy, seek emergency care for severe headache, problems with vision (blurred or loss of vision), convulsions/fits, severe pain in the upper abdomen, or difficulty breathing. These may indicate eclampsia or other serious complications.",
    keywords: ["pregnant", "severe headache", "blurred vision", "seizure", "fits", "severe abdominal pain", "eclampsia"],
    population: ["adult", "adolescent"],
  },
  {
    chunkId: "c-anc-fever",
    sourceId: "WHO-ANC-2016",
    section: "Pregnancy — when to seek care",
    anchor: "anc-fever",
    text: "Fever in pregnancy should be reviewed promptly by a clinician because of the risk to both mother and baby. Contact a health facility the same day.",
    keywords: ["pregnant", "fever", "high temperature", "pregnancy"],
    population: ["adult", "adolescent"],
  },
  {
    chunkId: "c-idsp-fever",
    sourceId: "MoHFW-IDSP",
    section: "Fever surveillance",
    anchor: "idsp-fever",
    text: "Fever lasting more than three days, especially with rash, jaundice, or travel to a dengue/malaria/seasonal-influenza area, should be reported and assessed. Local surveillance helps detect outbreaks early.",
    keywords: ["fever", "high temperature", "rash", "jaundice", "travel", "three days", "duration"],
    population: ["infant", "child", "adolescent", "adult", "older_adult"],
  },
  {
    chunkId: "c-nhp-dehydration",
    sourceId: "MoHFW-NHP",
    section: "Dehydration — home assessment",
    anchor: "nhp-dehydration",
    text: "Signs of dehydration include decreased urination, dry mouth and tongue, dizziness on standing, and sunken eyes. Children who cannot drink or are vomiting everything need same-day care. Continue small sips of oral rehydration solution when possible.",
    keywords: ["dehydrated", "no urine", "dry mouth", "dizzy", "sunken eyes", "cannot drink", "vomiting", "ORS"],
    population: ["infant", "child", "adolescent", "adult", "older_adult"],
  },
  {
    chunkId: "c-nhp-selfcare",
    sourceId: "MoHFW-NHP",
    section: "Minor illness — home care",
    anchor: "nhp-selfcare",
    text: "For mild, low-risk symptoms such as a runny nose, sore throat, or a small cut in an otherwise healthy adult: rest, adequate fluids, and monitor. Seek care sooner if symptoms worsen, breathing is affected, or a fever persists beyond three days.",
    keywords: ["mild cold", "runny nose", "sore throat", "minor scrape", "small cut", "mild cough", "rest", "fluids"],
    population: ["adolescent", "adult"],
  },
  {
    chunkId: "c-mhgap-crisis",
    sourceId: "WHO-MH-GAP-2010",
    section: "Assessing and managing emergencies",
    anchor: "mhgap-emergency",
    text: "Any expression of intent to end life is an emergency. Stay with the person, remove means of harm, and seek urgent help via the emergency number (India 112) or a mental-health service. For severe distress without intent, arrange same-day support.",
    keywords: ["suicide", "kill myself", "self harm", "self-harm", "depressed", "panic", "hearing voices", "can't cope"],
    population: ["infant", "child", "adolescent", "adult", "older_adult"],
  },
  {
    chunkId: "c-aha-cardiac",
    sourceId: "AHA-2020",
    section: "Heart attack warning signs",
    anchor: "aha-cardiac",
    text: "Warning signs of a heart attack include chest pain or pressure, pain spreading to the arm, jaw, or back, shortness of breath, cold sweat, nausea, or light-headedness. These are emergencies — call emergency services immediately and do not exert the person.",
    keywords: ["chest pain", "crushing chest", "pressure in chest", "left arm pain", "shortness of breath", "sweat"],
    population: ["adult", "older_adult", "adolescent"],
  },
  {
    chunkId: "c-imci-fast-breathing",
    sourceId: "WHO-IMCI-2005",
    section: "Pneumonia — fast breathing",
    anchor: "imci-pneumonia",
    text: "Fast breathing is a key sign of pneumonia in children: 60 breaths/min or more at age 2 months–11 months, or 50/min or more at 12 months–4 years. Cough or difficulty breathing with fast breathing needs prompt clinical assessment.",
    keywords: ["rapid breathing", "fast breathing", "cough", "pneumonia", "child", "breathing"],
    population: ["infant", "child"],
  },
  {
    chunkId: "c-nhp-chronic",
    sourceId: "MoHFW-NHP",
    section: "Living with a chronic condition",
    anchor: "nhp-chronic",
    text: "People with chronic conditions (such as diabetes, hypertension, or asthma) should watch for changes. New or worsening symptoms, missed medicines, or an acute episode such as shortness of breath should prompt a clinical review.",
    keywords: ["chronic", "diabetes", "hypertension", "asthma", "worse", "missed medicine", "conditions"],
    population: ["adult", "older_adult", "adolescent"],
  },
];

/** Build a quick lookup from sourceId to metadata. */
export const SOURCE_MAP: Record<string, KnowledgeSource> = Object.fromEntries(
  KNOWLEDGE_SOURCES.map((s) => [s.sourceId, s]),
);

