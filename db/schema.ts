import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * Authoritative structured-record schema for Arogya Relay.
 *
 * PROTOTYPE / SYNTHETIC ONLY. Every record here is fictional demonstration
 * data. Tables support the Care Guidance assistant:
 *   - users / roles (RBAC; only doctors may create/approve MedicationRequest)
 *   - synthetic patients and consent lifecycle
 *   - encounters, questionnaire responses, observations (FHIR-aligned)
 *   - deterministic triage decisions and their red-flag audit trail
 *   - clinician reviews and signed recommendations
 *   - knowledge-source versions, evidence chunks, retrieval/audit events
 *   - append-only safety-rule versions
 *
 * All PHI-minimization, least-privilege, and parameterized-query rules are
 * applied at the service layer; the schema enforces integrity via types,
 * defaults, and indexes based on the actual access queries.
 */

// ---------------------------------------------------------------------------
// Identity & access
// ---------------------------------------------------------------------------
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  role: text("role", { enum: ["admin", "doctor", "health_worker", "reviewer"] }).notNull(),
  displayName: text("display_name").notNull(),
  // Synthetic only; never a real identifier.
  pseudoId: text("pseudo_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  issuedAt: integer("issued_at", { mode: "timestamp" }).notNull().defaultNow(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});

// ---------------------------------------------------------------------------
// Synthetic patients & consent
// ---------------------------------------------------------------------------
export const patients = sqliteTable("patients", {
  id: text("id").primaryKey(),
  // Minimized reference only, e.g. "NR-1049". No names/precise locations.
  reference: text("reference").notNull(),
  ageGroup: text("age_group", {
    enum: ["infant", "child", "adolescent", "adult", "older_adult"],
  }).notNull(),
  ageYears: integer("age_years"),
  villageCode: text("village_code"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});

export const consent = sqliteTable("consent", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull().references(() => patients.id),
  purpose: text("purpose").notNull(),
  granted: integer("granted", { mode: "boolean" }).notNull(),
  grantedAt: integer("granted_at", { mode: "timestamp" }),
  withdrawnAt: integer("withdrawn_at", { mode: "timestamp" }),
  // Retention/deletion controls.
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
}, (t) => ({
  byPatient: index("consent_by_patient").on(t.patientId),
}));
// ---------------------------------------------------------------------------
// Encounters, questionnaire responses, observations (FHIR R4-aligned)
// ---------------------------------------------------------------------------
export const encounters = sqliteTable("encounters", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull().references(() => patients.id),
  type: text("type", { enum: ["screening", "care_guidance", "review"] }).notNull(),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull().defaultNow(),
  // free text minimized; never contains identifying detail
  note: text("note"),
});

export const questionnaireResponses = sqliteTable("questionnaire_responses", {
  id: text("id").primaryKey(),
  encounterId: text("encounter_id").notNull().references(() => encounters.id),
  patientId: text("patient_id").notNull().references(() => patients.id),
  // ABDM FHIR R4 QuestionnaireResponse-style structured answers (JSON).
  answers: text("answers", { mode: "json" }).notNull(),
  pregnant: integer("pregnant", { mode: "boolean" }),
  durationDays: integer("duration_days"),
  rapidDeterioration: integer("rapid_deterioration", { mode: "boolean" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});

export const observations = sqliteTable("observations", {
  id: text("id").primaryKey(),
  encounterId: text("encounter_id").notNull().references(() => encounters.id),
  patientId: text("patient_id").notNull().references(() => patients.id),
  // e.g. spo2, temperature, respiration_rate
  code: text("code").notNull(),
  value: text("value").notNull(),
  unit: text("unit"),
  recordedAt: integer("recorded_at", { mode: "timestamp" }).notNull().defaultNow(),
}, (t) => ({
  byEncounter: index("observations_by_encounter").on(t.encounterId),
}));

// ---------------------------------------------------------------------------
// Triage decisions (deterministic engine output) + audit
// ---------------------------------------------------------------------------
export const triageDecisions = sqliteTable("triage_decisions", {
  id: text("id").primaryKey(),
  encounterId: text("encounter_id").notNull().references(() => encounters.id),
  patientId: text("patient_id").notNull().references(() => patients.id),
  urgency: text("urgency", {
    enum: ["emergency", "same_day", "clinician_review", "self_care_information", "insufficient_information"],
  }).notNull(),
  knowledgeMode: text("knowledge_mode", { enum: ["offline", "online", "offline_fallback"] }).notNull(),
  retrievalCoverage: text("retrieval_coverage"),
  // JSON array of triggered rule ids + versions (audit-friendly).
  triggeredRules: text("triggered_rules", { mode: "json" }).notNull(),
  emergencyNumber: text("emergency_number").notNull(),
  medicineStatus: text("medicine_status").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
}, (t) => ({
  byPatient: index("triage_by_patient").on(t.patientId),
  byUrgency: index("triage_by_urgency").on(t.urgency),
}));

// Append-only decision/approval audit events.
export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  // entity the event concerns
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  actorId: text("actor_id").references(() => users.id),
  // actor role snapshot at time of action (RBAC evidence)
  actorRole: text("actor_role"),
  detail: text("detail", { mode: "json" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
}, (t) => ({
  byEntity: index("audit_by_entity").on(t.entityType, t.entityId),
}));

// ---------------------------------------------------------------------------
// Clinician reviews & signed recommendations
// ---------------------------------------------------------------------------
export const clinicianReviews = sqliteTable("clinician_reviews", {
  id: text("id").primaryKey(),
  triageDecisionId: text("triage_decision_id").notNull().references(() => triageDecisions.id),
  reviewerId: text("reviewer_id").notNull().references(() => users.id),
  state: text("state", { enum: ["pending", "approved", "rejected", "amended"] }).notNull(),
  note: text("note"),
  reviewedAt: integer("reviewed_at", { mode: "timestamp" }).notNull().defaultNow(),
});

// MedicationRequest: creation/approval RESTRICTED to doctors. Never created by
// the assistant. Stored only when linked to a signed, doctor-authored order.
export const medicationRequests = sqliteTable("medication_requests", {
  id: text("id").primaryKey(),
  encounterId: text("encounter_id").notNull().references(() => encounters.id),
  patientId: text("patient_id").notNull().references(() => patients.id),
  // Only present when a doctor has signed an order.
  signedByDoctorId: text("signed_by_doctor_id").references(() => users.id),
  drug: text("drug"),
  dose: text("dose"),
  instruction: text("instruction"),
  // cryptographic-ish signature reference (prototype: hash of order payload)
  signature: text("signature"),
  signedAt: integer("signed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
}, (t) => ({
  byPatient: index("medreq_by_patient").on(t.patientId),
}));

// ---------------------------------------------------------------------------
// Knowledge pack provenance & retrieval log
// ---------------------------------------------------------------------------
export const sourceVersions = sqliteTable("source_versions", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull(),
  version: text("version").notNull(),
  title: text("title").notNull(),
  publisher: text("publisher").notNull(),
  canonicalUrl: text("canonical_url").notNull(),
  licence: text("licence").notNull(),
  hash: text("hash").notNull(),
  jurisdiction: text("jurisdiction"),
  reviewDate: text("review_date"),
  requiresRmpValidation: integer("requires_rmp_validation", { mode: "boolean" }).notNull().default(true),
  supersededBy: text("superseded_by"),
  publishedAt: integer("published_at", { mode: "timestamp" }).notNull().defaultNow(),
}, (t) => ({
  bySource: uniqueIndex("source_version_unique").on(t.sourceId, t.version),
}));

export const evidenceChunks = sqliteTable("evidence_chunks", {
  id: text("id").primaryKey(),
  sourceVersionId: text("source_version_id").notNull().references(() => sourceVersions.id),
  section: text("section").notNull(),
  anchor: text("anchor").notNull(),
  text: text("text").notNull(),
  keywords: text("keywords", { mode: "json" }).notNull(),
});

export const retrievalEvents = sqliteTable("retrieval_events", {
  id: text("id").primaryKey(),
  encounterId: text("encounter_id").references(() => encounters.id),
  mode: text("mode", { enum: ["offline", "online", "offline_fallback"] }).notNull(),
  chunkIds: text("chunk_ids", { mode: "json" }).notNull(),
  coverage: text("coverage"),
  sourceIds: text("source_ids", { mode: "json" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});

// Versioned safety-rule packs (the deterministic engine's rules).
export const safetyRuleVersions = sqliteTable("safety_rule_versions", {
  id: text("id").primaryKey(),
  ruleId: text("rule_id").notNull(),
  version: text("version").notNull(),
  label: text("label").notNull(),
  action: text("action", {
    enum: ["emergency", "same_day", "clinician_review", "self_care_information"],
  }).notNull(),
  requiresRmpValidation: integer("requires_rmp_validation", { mode: "boolean" }).notNull().default(true),
  publishedAt: integer("published_at", { mode: "timestamp" }).notNull().defaultNow(),
});

// Synthetic fixtures marker (keeps test data separable from production rows).
export const fixtures = sqliteTable("fixtures", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  payload: text("payload", { mode: "json" }).notNull(),
});

// ---------------------------------------------------------------------------
// Nearby Care — facilities, capabilities, sources, verification, camps,
// referrals, location snapshots. Indexed for bounding boxes, active date
// ranges, facility type and verification status (per the brief).
// ---------------------------------------------------------------------------
export const facilities = sqliteTable("facilities", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", {
    enum: ["hospital", "phc", "chc", "aam", "clinic", "pharmacy", "government_service"],
  }).notNull(),
  lat: text("lat").notNull(),
  lng: text("lng").notNull(),
  accuracyMeters: integer("accuracy_meters"),
  address: text("address").notNull(),
  villageCode: text("village_code"),
  phone: text("phone"),
  emergency: integer("emergency", { mode: "boolean" }).notNull().default(false),
  icu: integer("icu", { mode: "boolean" }).notNull().default(false),
  oxygen: integer("oxygen", { mode: "boolean" }).notNull().default(false),
  paediatrics: integer("paediatrics", { mode: "boolean" }).notNull().default(false),
  maternity: integer("maternity", { mode: "boolean" }).notNull().default(false),
  surgery: integer("surgery", { mode: "boolean" }).notNull().default(false),
  ambulance: integer("ambulance", { mode: "boolean" }).notNull().default(false),
  pharmacy: integer("pharmacy", { mode: "boolean" }).notNull().default(false),
  mentalHealth: integer("mental_health", { mode: "boolean" }).notNull().default(false),
  diagnostics: integer("diagnostics", { mode: "boolean" }).notNull().default(false),
  schemes: text("schemes", { mode: "json" }).notNull(),
  openNow: integer("open_now", { mode: "boolean" }),
  verification: text("verification", { enum: ["verified", "unverified", "stale", "disputed"] }).notNull(),
  verificationSource: text("verification_source"),
  verifiedAt: text("verified_at"),
  expiresAt: text("expires_at"),
  externalId: text("external_id"),
  sourceUrl: text("source_url"),
  lastFetchedAt: text("last_fetched_at"),
}, (t) => ({
  byType: index("facilities_by_type").on(t.type),
  byVerification: index("facilities_by_verification").on(t.verification),
  // Bounding-box index (lat/lng prefix) for spatial queries.
  byBox: index("facilities_by_box").on(t.lat, t.lng),
}));

export const sourceRecords = sqliteTable("source_records", {
  id: text("id").primaryKey(),
  facilityId: text("facility_id").references(() => facilities.id),
  organisation: text("organisation").notNull(),
  url: text("url").notNull(),
  externalId: text("external_id"),
  fetchedAt: text("fetched_at").notNull(),
  verifiedAt: text("verified_at"),
  expiresAt: text("expires_at"),
  // Per-field provenance stored as JSON keyed by field name.
  fieldProvenance: text("field_provenance", { mode: "json" }),
}, (t) => ({
  byFacility: index("source_by_facility").on(t.facilityId),
}));

export const verificationHistory = sqliteTable("verification_history", {
  id: text("id").primaryKey(),
  entityType: text("entity_type").notNull(), // 'facility' | 'camp'
  entityId: text("entity_id").notNull(),
  status: text("status", { enum: ["verified", "unverified", "stale", "disputed", "cancelled"] }).notNull(),
  actorId: text("actor_id"),
  note: text("note"),
  changedAt: integer("changed_at", { mode: "timestamp" }).notNull().defaultNow(),
}, (t) => ({
  byEntity: index("verification_by_entity").on(t.entityType, t.entityId),
}));

export const camps = sqliteTable("camps", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  organiser: text("organiser").notNull(),
  source: text("source").notNull(),
  services: text("services", { mode: "json" }).notNull(),
  eligibility: text("eligibility"),
  start: text("start").notNull(),
  end: text("end").notNull(),
  recurrence: text("recurrence"),
  venue: text("venue").notNull(),
  lat: text("lat").notNull(),
  lng: text("lng").notNull(),
  contact: text("contact"),
  verification: text("verification", { enum: ["verified", "unverified", "stale", "disputed"] }).notNull(),
  lastVerifiedAt: text("last_verified_at"),
  cancelled: integer("cancelled", { mode: "boolean" }).notNull().default(false),
  validityEnd: text("validity_end").notNull(),
}, (t) => ({
  // Active-date-range index for hiding expired camps.
  byValidity: index("camps_by_validity").on(t.validityEnd, t.cancelled),
}));

export const referrals = sqliteTable("referrals", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").references(() => patients.id),
  originLat: text("origin_lat").notNull(),
  originLng: text("origin_lng").notNull(),
  originAccuracy: integer("origin_accuracy"),
  requiredCapabilities: text("required_capabilities", { mode: "json" }).notNull(),
  emergency: integer("emergency", { mode: "boolean" }).notNull().default(false),
  chosenFacilityId: text("chosen_facility_id").references(() => facilities.id),
  straightLineKm: text("straight_line_km"),
  roadEtaMin: text("road_eta_min"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
}, (t) => ({
  byPatient: index("referrals_by_patient").on(t.patientId),
}));

// Minimal, consent-gated location snapshot. Continuous history is NOT retained.
export const locationSnapshots = sqliteTable("location_snapshots", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").references(() => patients.id),
  lat: text("lat").notNull(),
  lng: text("lng").notNull(),
  accuracyMeters: integer("accuracy_meters").notNull(),
  capturedAt: text("captured_at").notNull(),
  source: text("source", { enum: ["gps", "manual", "approximate"] }).notNull(),
  purpose: text("purpose").notNull(),
  consentGivenAt: text("consent_given_at").notNull(),
  retentionUntil: text("retention_until").notNull(),
  deletedAt: text("deleted_at"),
}, (t) => ({
  byRetention: index("location_by_retention").on(t.retentionUntil),
}));

// ---------------------------------------------------------------------------
// Care Plan & Reminders (Problem Statement 4)
//   - care_plans, medication_orders, care_items, reminder_instances,
//     acknowledgements, caregiver_grants, push_subscriptions, pending_sync
//   - Doctor-only authoring enforced at the service layer (RBAC via users.role)
//   - All PHI minimized; no patient/medicine ids in URLs or cache keys.
//   - Medication names/strengths/doses preserved exactly (never translated).
// ---------------------------------------------------------------------------
export const carePlans = sqliteTable("care_plans", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull().references(() => patients.id),
  practitionerId: text("practitioner_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  languageAccepted: text("language_accepted").notNull(),
  packVersion: text("pack_version").notNull(),
  status: text("status", { enum: ["draft", "active", "paused", "discontinued"] }).notNull().default("draft"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().defaultNow(),
  version: integer("version").notNull().default(1),
}, (t) => ({
  byPatient: index("careplan_by_patient").on(t.patientId),
}));

export const medicationOrders = sqliteTable("medication_orders", {
  id: text("id").primaryKey(),
  carePlanId: text("care_plan_id").notNull().references(() => carePlans.id),
  patientId: text("patient_id").notNull().references(() => patients.id),
  medicine: text("medicine").notNull(),
  strength: text("strength").notNull(),
  form: text("form").notNull(),
  dose: text("dose").notNull(),
  route: text("route").notNull(),
  frequency: text("frequency", { mode: "json" }).notNull(), // Frequency (typed at app layer)
  foodRelation: text("food_relation").notNull(),
  indication: text("indication").notNull(),
  instructions: text("instructions").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  tapers: text("tapers", { mode: "json" }),
  highRisk: integer("high_risk", { mode: "boolean" }).notNull().default(false),
  missedDoseAdvice: text("missed_dose_advice"),
  signedByDoctorId: text("signed_by_doctor_id").references(() => users.id),
  signedAt: integer("signed_at", { mode: "timestamp" }),
  signature: text("signature"),
  status: text("status", { enum: ["draft", "active", "paused", "discontinued"] }).notNull().default("draft"),
  discontinuedReason: text("discontinued_reason"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().defaultNow(),
  version: integer("version").notNull().default(1),
}, (t) => ({
  byPatient: index("medorder_by_patient").on(t.patientId),
  byPlan: index("medorder_by_plan").on(t.carePlanId),
  byStatus: index("medorder_by_status").on(t.status),
}));

export const careItems = sqliteTable("care_items", {
  id: text("id").primaryKey(),
  carePlanId: text("care_plan_id").notNull().references(() => carePlans.id),
  patientId: text("patient_id").notNull().references(() => patients.id),
  type: text("type", {
    enum: ["appointment", "test", "refill", "activity", "symptom_checkin", "post_visit_task"],
  }).notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull(),
  scheduledAt: integer("scheduled_at", { mode: "timestamp" }).notNull(),
  prep: text("prep", { mode: "json" }),
  documentsToCarry: text("documents_to_carry", { mode: "json" }),
  signedByDoctorId: text("signed_by_doctor_id").references(() => users.id),
  status: text("status", { enum: ["active", "completed", "cancelled"] }).notNull().default("active"),
  version: integer("version").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().defaultNow(),
}, (t) => ({
  byPatient: index("careitem_by_patient").on(t.patientId),
  byPlan: index("careitem_by_plan").on(t.carePlanId),
}));

export const reminderInstances = sqliteTable("reminder_instances", {
  id: text("id").primaryKey(), // deterministic idempotency key
  sourceType: text("source_type", { enum: ["medication", "care_item"] }).notNull(),
  sourceId: text("source_id").notNull(),
  patientId: text("patient_id").notNull().references(() => patients.id),
  dueAt: integer("due_at", { mode: "timestamp" }).notNull(),
  state: text("state", { enum: ["upcoming", "due", "missed", "completed", "skipped", "snoozed"] }).notNull(),
  acknowledgedAs: text("acknowledged_as"),
  acknowledgedAt: integer("acknowledged_at", { mode: "timestamp" }),
  channels: text("channels", { mode: "json" }).notNull(),
}, (t) => ({
  byPatientDue: index("reminder_by_patient_due").on(t.patientId, t.dueAt),
}));

export const caregiverGrants = sqliteTable("caregiver_grants", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull().references(() => patients.id),
  caregiverId: text("caregiver_id").notNull().references(() => users.id),
  scope: text("scope", { enum: ["view_reminders", "receive_reminders"] }).notNull(),
  grantedAt: integer("granted_at", { mode: "timestamp" }).notNull(),
  revokedAt: integer("revoked_at", { mode: "timestamp" }),
}, (t) => ({
  byPatient: index("cg_by_patient").on(t.patientId, t.caregiverId),
}));

export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull().references(() => patients.id),
  subscription: text("subscription", { mode: "json" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
}, (t) => ({
  byPatient: index("push_by_patient").on(t.patientId),
}));

export const pendingSync = sqliteTable("pending_sync", {
  id: text("id").primaryKey(), // idempotency key
  kind: text("kind", { enum: ["ack", "edit", "discontinue", "grant", "revoke"] }).notNull(),
  payload: text("payload", { mode: "json" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
}, (t) => ({
  byKind: index("pendingsync_by_kind").on(t.kind),
}));

