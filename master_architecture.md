# Arogya Relay — Master Architecture & Security Blueprint

## 1. System Vision & Architecture
Arogya Relay is an offline-first rural telehealth web platform connecting community health workers (ASHAs), patients, and verified doctors across remote and low-connectivity Indian regions.

```
                    ┌─────────────────────────┐
                    │     Arogya Relay Web    │
                    │  (Next.js 16 + React 19)│
                    └───────────┬─────────────┘
                                │
          ┌─────────────────────┼──────────────────────┐
          │                     │                      │
┌─────────▼─────────┐ ┌─────────▼──────────┐ ┌─────────▼──────────┐
│   Offline Layer   │ │   Security & RBAC  │ │  Supabase / Cloud  │
│  IndexedDB Queue  │ │ Admin / Doctor / HW│ │ PostgreSQL + Auth  │
│  Local Disease DB │ │ NMC Reg. Approval  │ │ S3 Storage Buckets │
│  Web Speech TTS   │ │ Screener Credential│ │ Web Push Service   │
└───────────────────┘ └────────────────────┘ └────────────────────┘
```

---

## 2. Role-Based Access Control (RBAC) & Doctor Verification

### 2.1 Admin Persona
- **Primary Admin Email**: `pratyushkiranrath4@gmail.com`
- **Initial Password**: `Pratyush@#3130`
- **Privileges**:
  - Full system administration, audit log access, database connection management.
  - Exclusive access to the **Doctor Verification Portal** to review medical council registration numbers, credentials, and approve or reject clinical practitioner accounts.

### 2.2 Doctor Verification Safeguard (Anti-Impersonation)
- **Problem**: In rural telehealth, unverified accounts claiming to be doctors could issue lethal drug prescriptions or misdiagnose patients.
- **Enforcement**:
  - Registration as a doctor mandates:
    1. Full Name & Dr. Title
    2. National Medical Commission (NMC) or State Medical Council Registration Number
    3. State Medical Council (e.g. Maharashtra Medical Council, Odisha Council of Medical Registration, etc.)
    4. Year of Registration
    5. Primary Specialization (General Medicine, Paediatrics, Community Medicine, etc.)
    6. Primary Hospital / CHC / Clinic Affiliation
    7. License Document / ID Upload
  - Default status: `pending_verification`.
  - In `pending_verification` state, prescriptions cannot be finalized or signed, and clinical approvals are blocked.
  - Once verified by Admin (`pratyushkiranrath4@gmail.com`), the doctor gains `verified` status and full prescribing rights.

### 2.3 Field Health Worker (ASHA / ANM) Attribution
- **Problem**: Untraceable anonymous screenings compromise patient safety and legal accountability.
- **Enforcement**:
  - Every screening captures screener metadata: Screener ID, Full Name, Role, and Village / Unit code.
  - Active session automatically injects authenticated credentials into the submission payload.
  - In offline guest mode, an explicit Health Worker Operator ID / PIN is validated.

---

## 3. Storage Architecture (Supabase Storage / S3 API)
- **Buckets**:
  - `prescriptions`: Encrypted storage for scanned or photographed doctor paper prescriptions.
  - `screenings`: Visual disease photos for Drishti AI skin/eye/wound lesion triage.
  - `doctor-credentials`: Medical registration certificates and ID proofs uploaded during doctor signup.
- **Offline Fallback**:
  - When offline or when bucket credentials are not reached, image payloads are persisted to local base64 / IndexedDB storage and synced automatically once internet connectivity is restored.

---

## 4. UI Refactoring & Header Modernization
- **Header Top-Right Action Center**:
  - Remove key sign (`🔑`) from the bottom sidebar.
  - Consolidate user profile, role badge, login / logout, and verification status in the top right navigation bar.
  - Clean separation: `[⚡ Supabase]` `[🌐 Language]` `[👤 Profile/Sign-in]` `[🔔 Alerts]`.
- **New Screening Form Enhancements**:
  - Display authenticated screener credential banner at the top of the modal.
  - Instant vitals risk flags (SpO2 < 90% in crimson, Temp > 38.5°C in amber).
  - Drishti AI lesion photo capture directly inside screening intake.
  - Interactive anatomical body map location selector.
  - Vitals voice dictation with automatic parsing.

---

## 5. Deployment & Release Pipeline
- **Git Repository**: `https://github.com/Pratyush-kya/Arogya-Relay-`
- **Hosting**: Vercel (Edge runtime / Serverless) + Cloudflare Worker security headers.
- **Zero-Downtime Guarantee**: Full application functions even if Supabase backend or network is offline.
