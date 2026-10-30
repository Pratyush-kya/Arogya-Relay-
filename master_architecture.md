# Arogya Relay — Master Architecture & Security Blueprint

## 1. System Vision & Architecture
Arogya Relay is a doctor-linked patient follow-up, prescription dosage adjustment, and fair-price pharmacy fulfillment network. It directly connects citizens, verified doctors, and government Jan Aushadhi generic chemists.

```
                    ┌─────────────────────────┐
                    │     Arogya Relay Web    │
                    │  (Next.js 15 + React 19)│
                    └───────────┬─────────────┘
                                │
          ┌─────────────────────┼──────────────────────┐
          │                     │                      │
┌─────────▼─────────┐ ┌─────────▼──────────┐ ┌─────────▼──────────┐
│   Patient Portal  │ │  Doctor Workstation│ │  Chemist Dispensary│
│  - Follow-up Msg  │ │  - Case & Rx Queue │ │  - Token Verify    │
│  - Dose Change Req│ │  - Dose Adjust/Revise│ │ - Fair Price Lock │
│  - Fair Price View│ │  - Chemist Suggest │ │  - Non-Expired Ver │
│  - Nearest Chemist│ │  - Dispense Audit  │ │  - Escrow Settle   │
│  - Health Camps   │ │                    │ │                    │
│  - Disease Cures  │ │                    │ │                    │
│  - Emergency Hosp │ │                    │ │                    │
└───────────────────┘ └────────────────────┘ └────────────────────┘
```

---

## 2. Core Operational Workflow
1. **Prescription Linkage**: The patient consults a doctor and holds an active prescription token (e.g. `PT-1001` / `RX-9021`).
2. **Follow-up / Issue Messaging**: If the patient experiences side-effects, feels unwell, or requires a dosage change, they send a message to the prescribing doctor using their prescription ID.
3. **Doctor Review & Revision**: The doctor reviews the patient's record and previous prescription, adjusts doses or prescribes revised medicines, and suggests the nearest verified chemist.
4. **Transparent Pricing & Quality Assurance**: When the revised report is sent back to the patient, the **exact fair government price** is computed beforehand, with a guarantee of **zero fake prices and zero expired products**.
5. **Nearest Chemist Pickup**: The patient locates the nearest Jan Aushadhi / verified chemist, presents the token, and collects verified medicines.
6. **Doctor Dispense Audit**: The doctor can verify in their audit log whether the chemist dispensed the accurate prescribed medicines.

---

## 3. Role-Based Access Control (RBAC) & Actor Roles
- **Citizen / Patient**: Manages health records, sends dosage adjustment requests to doctors, views transparent pricing, finds nearest chemists and emergency hospitals.
- **Verified Doctor (NMC Licensed)**: Evaluates patient follow-up requests, adjusts dosages, signs prescriptions with cryptographic HMAC-SHA256, recommends chemists, and audits dispensing.
- **Jan Aushadhi Chemist / Pharma**: Verifies single-use prescription tokens, validates non-expired batch certification, and settles dispensing at locked government rates.
- **System Admin**: Verifies physician credentials against State / National Medical Council registries and audits system activity.
- *(Note: ASHA field worker intermediary role is removed to allow direct patient-doctor-chemist continuity).*

---

## 4. Key Public Health Utilities
- **Location-Based Health Camps**: Filter and discover upcoming medical camps by district/city.
- **Curated Diseases & Verified Cures**: Prominent disease guides displaying verified cures, treatments, and red-flag danger signs on top.
- **Emergency Nearest Hospital**: 1-tap locator for emergency-capable hospitals with direct 112 hotline integration.
- **Multilingual & Voice Support**: 8 Indian languages (English, Hindi, Odia, Bengali, Telugu, Marathi, Assamese, Santali) with text-to-speech audio read-aloud.
