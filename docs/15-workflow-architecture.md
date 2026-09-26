# Arogya Relay — Workflow Architecture & Diagrams

This document outlines the operational and data workflows of **Arogya Relay**, an offline-first disease surveillance and clinical decision-support interface engineered for community health workers (ASHAs/ANMs) operating in remote, low-bandwidth environments.

---

## 1. High-Level End-to-End Operational Workflow

The overall lifecycle from patient field intake to doctor review, facility referral, and medication adherence monitoring.

```mermaid
flowchart TD
    %% Actors
    CHW["👩‍⚕️ Community Health Worker (ASHA / Field Worker)"]
    Doc["👨‍⚕️ Registered Medical Practitioner (Doctor)"]
    Patient["🧑 Patient / Caregiver"]

    %% Step 1: Field Screening
    subgraph S1["1. Field Intake & Screening"]
        Intake["Conduct Field Screening\n(Symptoms, Vitals: Temp, SpO2, Age)"]
        LocalStore[("Local Device Storage\n(localStorage / IndexedDB)")]
    end

    %% Step 2: Clinical Decision Support
    subgraph S2["2. Care Guidance & Triage"]
        RedFlagEngine{"Deterministic Red-Flag\nSafety Engine"}
        EmergencyAlert["🚨 EMERGENCY VERDICT\n(Immediate Call 112 / Urgent Transfer)"]
        KnowledgePack["Curated Clinical RAG\n(WHO / ICMR / MoHFW Pack)"]
        TriageDecision["Triage Tier Assigned:\nEmergency | Same Day | Clinician Review | Cleared"]
    end

    %% Step 3: Referral
    subgraph S3["3. Referral & Navigation"]
        NearbyCheck{"Requires Specialist\nReferral?"}
        NearbyCare["Capability-First Nearby Care\n(Filter Level: PHC / CHC / Hospital)"]
        ReferralBrief["Generate Structured\nReferral Brief"]
    end

    %% Step 4: Sync & Doctor Review
    subgraph S4["4. Synchronization & Remote Evaluation"]
        NetDetect{"Connectivity\nAvailable?"}
        SyncWorker["Background Sync Engine\n(Cloudflare Worker / Supabase API)"]
        CloudDB[("Supabase Cloud DB\n(RLS, Encrypted Audit Trail)")]
        DocQueue["Doctor Case Review Queue\n(Prioritized: Urgent > Review > Cleared)"]
        DocEval["Doctor Diagnosis, Orders &\nPrescription Advice"]
    end

    %% Step 5: Care Plan & Reminders
    subgraph S5["5. Care Plan & Adherence"]
        OrderVerify{"Doctor Auth &\nAmbiguity Check"}
        ScheduleGen["Deterministic Scheduling Engine\n(Recurring / Taper / Interval)"]
        Reminders["Patient Daily Care Plan\n(Web Push / ICS / Offline Card)"]
        Adherence["Record Adherence\n(Self-reported 'Taken')"]
    end

    %% Connections
    CHW --> Intake
    Intake --> LocalStore
    LocalStore --> RedFlagEngine

    RedFlagEngine -- "Red Flag Triggered" --> EmergencyAlert
    RedFlagEngine -- "Standard Case" --> KnowledgePack
    KnowledgePack --> TriageDecision
    TriageDecision --> NearbyCheck

    NearbyCheck -- "Yes" --> NearbyCare
    NearbyCare --> ReferralBrief
    NearbyCheck -- "No / Routine" --> NetDetect
    ReferralBrief --> NetDetect

    NetDetect -- "Offline" --> LocalStore
    NetDetect -- "Online / Signal Acquired" --> SyncWorker
    SyncWorker --> CloudDB
    CloudDB --> DocQueue

    Doc --> DocQueue
    DocQueue --> DocEval
    DocEval --> OrderVerify

    OrderVerify -- "Doctor Signed & Valid" --> ScheduleGen
    ScheduleGen --> Reminders
    Reminders --> Patient
    Patient --> Adherence
    Adherence -. "Feedback to Field Worker" .-> CHW
```

---

## 2. Clinical Care Guidance & Decision-Support Workflow

Arogya Relay implements a **safety-first, deterministic-before-AI** clinical triage pipeline. Emergency verdicts are irrevocable and cannot be downgraded by generative models.

```mermaid
flowchart TD
    Start(["Patient Symptoms & Demographics Entered"]) --> LangCheck["i18n & Translation Safety Gate\n(Tier 1 Critical Clinical Terms Locked)"]
    LangCheck --> DeterministicRules{"Deterministic Red-Flag\nEngine (Rules Versioned)"}

    %% Critical Branch
    DeterministicRules -- "Emergency Criteria Met\n(e.g., SpO2 < 90%, Severe Chest Pain)" --> EmrgAction["🚨 Trigger Emergency Action\n• Prominent Call 112 Button\n• Lock Status: Emergency\n• Irreversible Verdict"]

    %% Non-critical Branch
    DeterministicRules -- "No Critical Red Flag" --> LocalRAG["Offline Curated Knowledge Pack\n(Vector / Hybrid Search on Verified MoHFW/ICMR/WHO)"]

    LocalRAG --> EvidenceEval{"Offline Evidence\nSufficient?"}

    EvidenceEval -- "Yes" --> CiteGen["Assemble Guidance with Sentence Citations\n• Source Attribution\n• Versioning\n• Non-diagnostic Disclaimer"]
    
    EvidenceEval -- "No (And Network Available)" --> OnlineAdapter["Guarded Online Evidence Adapter\n(Concept-Only Allow-Listed Lookup)"]
    EvidenceEval -- "No (And Offline)" --> Insufficient["Return 'Insufficient Information'\nRecommend Primary Health Centre Review"]
    
    OnlineAdapter --> CiteGen
    CiteGen --> TriageClassification["Classify Action Level:\n• Same Day Review\n• Clinician Review\n• Self-Care / Monitoring"]

    EmrgAction --> ReferralRouting["Route to Nearby Care with Emergency Priority"]
    TriageClassification --> ReferralRouting
```

---

## 3. Offline-First Synchronization & Storage Lifecycle

Designed to withstand field realities: dead zones, intermittent 2G networks, and sudden device resets.

```mermaid
sequenceDiagram
    autonumber
    actor ASHA as 👩‍⚕️ Health Worker
    participant UI as 📱 Client Interface
    participant LocalDB as 💾 Local Store (localStorage/IDB)
    participant SyncMgr as 🔄 Sync Manager
    participant API as 🌐 Supabase API / Worker
    participant RemoteDB as 🗄️ PostgreSQL Database

    ASHA->>UI: Submit Screening Form
    UI->>LocalDB: Write ScreeningRecord (synced = false, id = SCR-XXX)
    UI-->>ASHA: Instant UI Confirmation (Optimistic UX)

    SyncMgr->>SyncMgr: Network Health & Ping Check
    alt When Offline / No Network
        SyncMgr-->>UI: Badge: "Reports stored securely offline"
        Note over LocalDB,SyncMgr: Records queued safely; queue count updated
    else When Connectivity Restored
        SyncMgr->>LocalDB: Read all unsynced records
        LocalDB-->>SyncMgr: Return pending batches
        SyncMgr->>API: POST /api/screenings/sync (Bounded Payload)
        API->>RemoteDB: Upsert Records with RLS & Role Verification
        RemoteDB-->>API: 200 OK (Batch Acknowledged)
        API-->>SyncMgr: Sync Receipt & Server Timestamps
        SyncMgr->>LocalDB: Mark synced = true or purge synced cache
        SyncMgr-->>UI: Status Update: "All records synchronized"
    end
```

---

## 4. Capability-First Nearby Care & Referral Workflow

Facilities are ranked strictly by **capability matching first**, before distance. A closer facility lacking maternity or oxygen support is never recommended over a slightly further, fully equipped hospital.

```mermaid
flowchart TD
    Req(["Referral Triggered (from Triage / Screening)"]) --> Consent["Request Explicit Geolocation Consent\n(HTTPS navigator.geolocation)"]

    Consent --> GeoCheck{"Consent Granted & Lat/Lng Received?"}
    GeoCheck -- "No / Denied / Unavailable" --> ManualLoc["Manual Location Selection\n(Select Village / Sub-District Block)"]
    GeoCheck -- "Yes" --> StatusTag["Tag Position Accuracy:\n• Accurate | Approximate | Stale"]

    ManualLoc --> CapFilter["Capability-First Filter Engine"]
    StatusTag --> CapFilter

    CapFilter --> MatchCap{"Match Required Care Level\n(Emergency, C-Section, NICU, Oxygen, MMU)"}
    
    MatchCap -- "Matches Level" --> GeoSort["Calculate Haversine Distance &\nSort by Distance + Verification Freshness"]
    MatchCap -- "Does Not Match Level" --> ExcludeFacility["Exclude Facility\n(Prevents sending critical patients to incapable centres)"]

    GeoSort --> OutputView["Present Referral Directory:\n1. Direct Call 112 (if Emergency)\n2. Accessible List View (Primary)\n3. MapLibre GL Tile Map (Attributed OSM)"]

    OutputView --> ShareAction["Generate Referral Brief:\n• Patient Pseudonym / Ref ID\n• Vitals & Triage Tier\n• Target Facility & Handover Summary"]
```

---

## 5. Doctor Care Plan, Medication Orders & Reminders

Ensures patient safety through strict doctor-only authoring, schedule ambiguity prevention, and deterministic reminder generation.

```mermaid
flowchart LR
    subgraph DoctorAuth["Clinician Order Authorization"]
        DocLogin["Doctor Authenticated\n(Role = doctor / admin)"] --> DraftOrder["Draft Medication Order\n(RxNorm / Concept / Dose)"]
        DraftOrder --> AmbiguityCheck{"Ambiguity &\nSafety Checks"}
    end

    subgraph SafetyRules["Validation Rules Engine"]
        AmbiguityCheck -- "Free-text or Unclear Schedule" --> Reject["❌ Reject Order\n(Require structured timing & daily max)"]
        AmbiguityCheck -- "Allergy or Duplicate Order" --> Alert["⚠️ Clinical Warning Alert"]
        AmbiguityCheck -- "Structured & Clean" --> SignOrder["✍️ Cryptographic / Doctor HMAC Signature"]
    end

    subgraph Engine["Deterministic Scheduling Engine"]
        SignOrder --> CalcSchedule["Calculate Scheduled Doses\n• Recurring (e.g. BD, TDS)\n• Tapering dosages\n• Interval / Weekday specific\n• Pause on hospitalization"]
        CalcSchedule --> FHIRMap["Export FHIR R4 Resource\n(MedicationRequest & CarePlan)"]
    end

    subgraph Execution["Patient Reminder Delivery"]
        CalcSchedule --> Dispatch["Reminder Surface:\n• Daily Offline Patient Schedule Card\n• Printable Adherence Chart\n• Privacy-Preserving ICS Calendar\n• Best-effort Web Push"]
        Dispatch --> LogAction["Patient / Caregiver Logs Action:\n• Taken (Self-reported)\n• Missed (Prompts clinician advice)"]
    end
```

---

## 6. Security, Privacy & Role-Based Access Boundary

```mermaid
flowchart TD
    User([User Request / Role]) --> AuthBoundary{"Supabase Auth\n& Role Gate"}

    AuthBoundary -- "Health Worker" --> HWPerms["Permissions:\n• Create / Read Assigned Screenings\n• Run Care Guidance & Nearby Referrals\n• Mark Reminders Taken\n❌ Cannot create/alter medication orders"]

    AuthBoundary -- "Doctor / RMP" --> DocPerms["Permissions:\n• View All Triage Queues\n• Submit Case Evaluations\n• Create, Sign, Pause & Discontinue Care Plans\n• Access Clinical Audit Logs"]

    AuthBoundary -- "Public / Anonymous" --> AnonPerms["Permissions:\n• Read Public Facility Catalog & Camp Timetables\n❌ No patient, screening, or encounter access"]

    AuthBoundary -- "Admin" --> AdminPerms["Permissions:\n• User Management & Role Assignment\n• Knowledge Pack & Protocol Updates\n• Full Audit & Compliance Export"]

    HWPerms --> RLS[PostgreSQL Row-Level Security Policy]
    DocPerms --> RLS
    AnonPerms --> RLS
    AdminPerms --> RLS
```
