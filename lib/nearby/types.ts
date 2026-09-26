export type FacilityType =
  | "hospital"
  | "phc" // Primary Health Centre
  | "chc" // Community Health Centre
  | "aam" // Ayushman Arogya Mandir
  | "clinic"
  | "pharmacy"
  | "government_service";

/** Clinical capabilities a facility may have. Used for capability-first ranking. */
export interface Capabilities {
  emergency: boolean;
  icu: boolean;
  oxygen: boolean;
  paediatrics: boolean;
  maternity: boolean;
  surgery: boolean;
  ambulance: boolean;
  pharmacy: boolean;
  mental_health: boolean;
  diagnostics: boolean;
}

export type VerificationStatus = "verified" | "unverified" | "stale" | "disputed";

export type GovernmentScheme = "ayushman" | "pmjay" | "state_nhm" | "abdm_hfr" | "pmbjp" | "jan_aushadhi" | "none";

export interface Coordinates {
  lat: number;
  lng: number;
  /** Horizontal accuracy in metres (GPS). */
  accuracyMeters?: number;
  /** Capture time (ISO). */
  capturedAt?: string;
  /** 'gps' (precise-ish), 'manual' (pin/village/address/landmark), 'approximate'. */
  source?: "gps" | "manual" | "approximate";
}

export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  coordinates: Coordinates;
  /** Human-readable address / village / landmark. */
  address: string;
  villageCode?: string;
  phone?: string;
  capabilities: Capabilities;
  schemes: GovernmentScheme[];
  /** Whether the facility is open (verified) right now. */
  openNow?: boolean;
  verification: VerificationStatus;
  verificationSource?: string;
  verifiedAt?: string;
  expiresAt?: string;
  externalId?: string;
  sourceUrl?: string;
  lastFetchedAt?: string;
}

export interface CampEvent {
  id: string;
  title?: string;
  name?: string;
  villageCode?: string;
  villageName?: string;
  organiser?: string;
  organizer?: string;
  source?: string;
  services: string[];
  eligibility?: string;
  start?: string; // ISO
  end?: string; // ISO
  startDate?: string;
  endDate?: string;
  timings?: string;
  recurrence?: string;
  venue?: string;
  coordinates: Coordinates;
  contact?: string;
  contactPhone?: string;
  verification?: VerificationStatus;
  lastVerifiedAt?: string;
  cancelled?: boolean;
  status?: string;
  validityEnd?: string;
}

export type LocationState =
  | "idle"
  | "acquiring"
  | "accurate"
  | "approximate"
  | "stale"
  | "denied"
  | "unavailable";

export interface LocationSnapshot extends Coordinates {
  state: LocationState;
}

export interface RankedFacilityResult {
  facility: Facility;
  distanceKm: number;
  score: number;
  capabilityMet: boolean;
}

export interface ReferralQuery {
  origin: Coordinates;
  requiredCapabilities?: (keyof Capabilities)[];
  emergency?: boolean;
  capabilityFirst?: boolean;
  schemesPreferred?: GovernmentScheme[];
}

export interface ReferralResult {
  facility: Facility;
  straightLineKm: number;
  roadEtaMin: number | null;
  rationale: string;
  capabilityMet: boolean;
}
