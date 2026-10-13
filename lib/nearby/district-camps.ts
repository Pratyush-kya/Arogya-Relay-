/**
 * District-Based Location & Nearby Health Camp Registry
 * Supports Native District preference, travel search, and offline local caching.
 */

export interface DistrictHealthCamp {
  id: string;
  title: string;
  state: string;
  district: string;
  block: string;
  venue: string;
  organizer: string;
  startDate: string;
  endDate: string;
  timings: string;
  services: string[];
  contactPhone: string;
  isFree: boolean;
  medicinesProvided: boolean;
  status: "active" | "upcoming" | "completed";
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export const REGISTERED_HEALTH_CAMPS: DistrictHealthCamp[] = [
  // ── ODISHA DISTRICTS ────────────────────────────────────────────────────────
  {
    id: "CAMP-OD-GNJ-01",
    title: "Mobile Medical Unit (MMU) Comprehensive Rural Health Camp",
    state: "Odisha",
    district: "Ganjam",
    block: "Chhatrapur",
    venue: "Gram Panchayat Hall, Aryapalli Coastal Village",
    organizer: "District Health Society & National Health Mission (NHM)",
    startDate: "2026-10-10",
    endDate: "2026-10-25",
    timings: "08:30 AM - 02:30 PM",
    services: [
      "General OPD Consultation",
      "Hypertension & Blood Sugar Screening",
      "Free Jan Aushadhi Generic Medicines",
      "Malaria & Dengue Rapid Diagnostic Tests (RDT)",
    ],
    contactPhone: "+91-6811-263901",
    isFree: true,
    medicinesProvided: true,
    status: "active",
    coordinates: { lat: 19.3524, lng: 84.9873 },
  },
  {
    id: "CAMP-OD-GNJ-02",
    title: "Netra Jyoti Cataract & Free Eye Screening Camp",
    state: "Odisha",
    district: "Ganjam",
    block: "Berhampur",
    venue: "Community Centre, Near MKCG Medical College Gate",
    organizer: "MKCG Medical College & Lions Club of Berhampur",
    startDate: "2026-10-12",
    endDate: "2026-10-18",
    timings: "09:00 AM - 03:00 PM",
    services: [
      "Visual Acuity & Refraction Testing",
      "Cataract Evaluation & Free Surgery Referrals",
      "Free Reading Glasses Distribution",
      "Diabetic Retinopathy Check",
    ],
    contactPhone: "+91-680-2292020",
    isFree: true,
    medicinesProvided: true,
    status: "active",
    coordinates: { lat: 19.3149, lng: 84.7941 },
  },
  {
    id: "CAMP-OD-KHD-01",
    title: "Ayush & Non-Communicable Diseases (NCD) Wellness Camp",
    state: "Odisha",
    district: "Khordha",
    block: "Jatni",
    venue: "Jatni Railway Community Centre, Main Road",
    organizer: "Directorate of AYUSH & State Health Department",
    startDate: "2026-10-08",
    endDate: "2026-10-22",
    timings: "09:00 AM - 04:00 PM",
    services: [
      "Ayurvedic & Homeopathic Consultation",
      "ECG & Cardiac Risk Screening",
      "Diabetes Mellitus Diagnostic Profiling",
      "Free Essential Medicine Dispensing",
    ],
    contactPhone: "+91-674-2491122",
    isFree: true,
    medicinesProvided: true,
    status: "active",
    coordinates: { lat: 20.1611, lng: 85.7037 },
  },
  {
    id: "CAMP-OD-KHD-02",
    title: "Capital Maternal & Child Health Outreach Camp",
    state: "Odisha",
    district: "Khordha",
    block: "Bhubaneswar",
    venue: "Urban Primary Health Centre (UPHC), Ghatikia",
    organizer: "Bhubaneswar Municipal Corporation (BMC) Health Wing",
    startDate: "2026-10-11",
    endDate: "2026-10-28",
    timings: "08:00 AM - 01:30 PM",
    services: [
      "Antenatal & Postnatal Care (ANC/PNC)",
      "Childhood Universal Immunization (UIP)",
      "Pediatric Nutritional Assessment",
      "Hemoglobin Anemia Testing & Iron Folic Acid Dispensing",
    ],
    contactPhone: "+91-674-2391055",
    isFree: true,
    medicinesProvided: true,
    status: "active",
    coordinates: { lat: 20.2648, lng: 85.8281 },
  },
  {
    id: "CAMP-OD-CTC-01",
    title: "Mahanadi Rural Dental & Oral Cancer Detection Camp",
    state: "Odisha",
    district: "Cuttack",
    block: "Athagarh",
    venue: "Sub-Divisional Hospital Ground, Athagarh",
    organizer: "SCB Dental College & Rotary Club Cuttack",
    startDate: "2026-10-14",
    endDate: "2026-10-20",
    timings: "09:30 AM - 03:30 PM",
    services: [
      "Oral Cancer Screening & Biopsy Triage",
      "Dental Extractions & Scaling",
      "Fluoride Treatment for Children",
      "Oral Hygiene Kits & Pain Relievers",
    ],
    contactPhone: "+91-671-2414004",
    isFree: true,
    medicinesProvided: true,
    status: "upcoming",
    coordinates: { lat: 20.5284, lng: 85.7831 },
  },
  {
    id: "CAMP-OD-MBJ-01",
    title: "Similipal Tribal Health & Sickle Cell Screening Camp",
    state: "Odisha",
    district: "Mayurbhanj",
    block: "Baripada",
    venue: "Tribal Community Hall, Near PRM Medical College",
    organizer: "National Tribal Health Mission & PRM MCH Baripada",
    startDate: "2026-10-09",
    endDate: "2026-10-30",
    timings: "08:30 AM - 03:00 PM",
    services: [
      "Sickle Cell Anemia Rapid Diagnostic Testing",
      "Malaria Vector Surveillance",
      "Pulmonary TB Sputum Collection Triage",
      "Free Multivitamin & Antibiotic Supply",
    ],
    contactPhone: "+91-6792-252102",
    isFree: true,
    medicinesProvided: true,
    status: "active",
    coordinates: { lat: 21.9322, lng: 86.7456 },
  },
  {
    id: "CAMP-OD-PURI-01",
    title: "Coastal Pilgrim & Senior Citizen Wellness Camp",
    state: "Odisha",
    district: "Puri",
    block: "Pipili",
    venue: "Community Health Centre (CHC) Compound, Pipili",
    organizer: "District Administration & Red Cross Society",
    startDate: "2026-10-15",
    endDate: "2026-10-24",
    timings: "09:00 AM - 02:00 PM",
    services: [
      "Geriatric Chronic Pain Management",
      "Bone Density (Osteoporosis) Screening",
      "Physiotherapy & Mobility Aids Guidance",
      "Free Calcium & Vitamin D3 Supplements",
    ],
    contactPhone: "+91-6752-222144",
    isFree: true,
    medicinesProvided: true,
    status: "upcoming",
    coordinates: { lat: 20.1174, lng: 85.8344 },
  },

  // ── MEGHALAYA DISTRICTS ─────────────────────────────────────────────────────
  {
    id: "CAMP-MEG-EKH-01",
    title: "Mawlynnong Community Health & Child Immunization Camp",
    state: "Meghalaya",
    district: "East Khasi Hills",
    block: "Pynursla",
    venue: "Community Sub-Center, Mawlynnong Central Village",
    organizer: "National Health Mission (NHM) Mobile Team",
    startDate: "2026-10-05",
    endDate: "2026-10-25",
    timings: "09:00 AM - 04:00 PM",
    services: [
      "General OPD Consultation",
      "Pulse Oximetry & Respiratory Triage",
      "Childhood MMR & Pentavalent Immunization",
      "Free Essential Generic Formulations",
    ],
    contactPhone: "+91-9863-000010",
    isFree: true,
    medicinesProvided: true,
    status: "active",
    coordinates: { lat: 25.201, lng: 91.879 },
  },
  {
    id: "CAMP-MEG-EKH-02",
    title: "Pynursla Maternal Health Outreach & Ultrasound Triage",
    state: "Meghalaya",
    district: "East Khasi Hills",
    block: "Pynursla",
    venue: "Pynursla Community Health Centre (CHC) Main Yard",
    organizer: "Sub-Divisional Health Services & Mawlynnong Sub-Center",
    startDate: "2026-10-08",
    endDate: "2026-10-22",
    timings: "10:00 AM - 03:00 PM",
    services: [
      "Antenatal High-Risk Pregnancy Screening",
      "Hemoglobin Anemia Profiling",
      "Point-of-Care Ultrasound Triage",
      "Iron-Folic Acid & Calcium Distribution",
    ],
    contactPhone: "+91-9863-000011",
    isFree: true,
    medicinesProvided: true,
    status: "active",
    coordinates: { lat: 25.186, lng: 91.903 },
  },
  {
    id: "CAMP-MEG-WGH-01",
    title: "Garo Hills Mobile Telehealth & Fever Cluster Surveillance",
    state: "Meghalaya",
    district: "West Garo Hills",
    block: "Tura",
    venue: "District Hospital Outpost, Dakopgre",
    organizer: "Integrated Disease Surveillance Programme (IDSP)",
    startDate: "2026-10-12",
    endDate: "2026-10-26",
    timings: "08:30 AM - 02:30 PM",
    services: [
      "Syndromic Fever Investigation",
      "Rapid Blood Slide Tests",
      "Vector-Borne Disease Awareness",
      "Free Paracetamol & ORS Distribution",
    ],
    contactPhone: "+91-3651-222380",
    isFree: true,
    medicinesProvided: true,
    status: "upcoming",
    coordinates: { lat: 25.5141, lng: 90.2033 },
  },

  // ── NATIONAL HUBS ───────────────────────────────────────────────────────────
  {
    id: "CAMP-MH-PUN-01",
    title: "Sahyadri Rural Non-Communicable Diseases (NCD) Camp",
    state: "Maharashtra",
    district: "Pune",
    block: "Haveli",
    venue: "Zilla Parishad School Ground, Wagholi",
    organizer: "Public Health Department Maharashtra & Sassoon Hospital",
    startDate: "2026-10-07",
    endDate: "2026-10-21",
    timings: "09:00 AM - 04:00 PM",
    services: [
      "Cardiovascular Risk Profiling",
      "HbA1c & Fasting Glucose Screening",
      "Renal Function Baseline Checks",
      "Generic Anti-Hypertensive Medicine Kits",
    ],
    contactPhone: "+91-20-26128000",
    isFree: true,
    medicinesProvided: true,
    status: "active",
    coordinates: { lat: 18.5786, lng: 73.9806 },
  },
  {
    id: "CAMP-DL-DEL-01",
    title: "Yamuna Floodplain Community Respiratory Health Camp",
    state: "Delhi",
    district: "New Delhi",
    block: "Central",
    venue: "Dispensary Ground, Near ISBT Sarai Kale Khan",
    organizer: "Delhi State Health Mission & RML Hospital",
    startDate: "2026-10-09",
    endDate: "2026-10-23",
    timings: "08:00 AM - 02:00 PM",
    services: [
      "Peak Expiratory Flow & Spirometry",
      "Nebulization & Acute Bronchospasm Care",
      "Air Pollution Particulate Health Guidance",
      "Inhaler Demonstration & Free Bronchodilators",
    ],
    contactPhone: "+91-11-23365525",
    isFree: true,
    medicinesProvided: true,
    status: "active",
    coordinates: { lat: 28.5921, lng: 77.2588 },
  },
];

const STORAGE_KEY_NATIVE_DISTRICT = "arogya_citizen_native_district";
const STORAGE_KEY_CACHED_CAMPS = "arogya_cached_health_camps";

/**
 * Returns list of unique districts available in the system.
 */
export function getRegisteredDistricts(): { district: string; state: string }[] {
  const map = new Map<string, string>();
  for (const camp of REGISTERED_HEALTH_CAMPS) {
    if (!map.has(camp.district)) {
      map.set(camp.district, camp.state);
    }
  }
  return Array.from(map.entries()).map(([district, state]) => ({ district, state }));
}

/**
 * Search and filter camps by district (native or travel search) and category.
 */
export function searchCampsByDistrict(
  query: string,
  categoryFilter?: string,
): DistrictHealthCamp[] {
  const cleanQ = query.trim().toLowerCase();
  const allCamps = getCachedOrStaticCamps();

  return allCamps.filter((camp) => {
    // District / State / Block / Venue search
    const matchesQuery =
      !cleanQ ||
      camp.district.toLowerCase().includes(cleanQ) ||
      camp.state.toLowerCase().includes(cleanQ) ||
      camp.block.toLowerCase().includes(cleanQ) ||
      camp.venue.toLowerCase().includes(cleanQ) ||
      camp.title.toLowerCase().includes(cleanQ);

    if (!matchesQuery) return false;

    // Category filter
    if (!categoryFilter || categoryFilter === "all") return true;

    const lowerCat = categoryFilter.toLowerCase();
    const matchesService = camp.services.some((s) => s.toLowerCase().includes(lowerCat));
    const matchesTitle = camp.title.toLowerCase().includes(lowerCat);

    return matchesService || matchesTitle;
  });
}

/**
 * Get cached camps from localStorage or fallback to static dataset.
 * Ensures offline resilience for rural citizens.
 */
export function getCachedOrStaticCamps(): DistrictHealthCamp[] {
  if (typeof window === "undefined") return REGISTERED_HEALTH_CAMPS;

  try {
    const raw = localStorage.getItem(STORAGE_KEY_CACHED_CAMPS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  // Cache initial dataset for offline access
  try {
    localStorage.setItem(STORAGE_KEY_CACHED_CAMPS, JSON.stringify(REGISTERED_HEALTH_CAMPS));
  } catch {}

  return REGISTERED_HEALTH_CAMPS;
}

/**
 * Get user's saved native district. Defaults to Ganjam, Odisha if unset.
 */
export function getUserNativeDistrict(): string {
  if (typeof window === "undefined") return "Ganjam";
  try {
    return localStorage.getItem(STORAGE_KEY_NATIVE_DISTRICT) || "Ganjam";
  } catch {
    return "Ganjam";
  }
}

/**
 * Save user's native district in local storage.
 */
export function setUserNativeDistrict(district: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_NATIVE_DISTRICT, district.trim());
  } catch {}
}
