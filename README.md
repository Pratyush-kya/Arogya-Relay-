# Arogya Relay


**🌍 Live Demo:** [https://arogya-relay.vercel.app](https://arogya-relay.vercel.app)

Arogya Relay is an offline-first disease-monitoring interface designed for
community health workers operating in remote and low-connectivity areas. The
prototype explores how field teams could record screenings, identify emerging
health signals, prioritize follow-ups, prepare referrals, and synchronize
reports when connectivity returns.

> [!IMPORTANT]
> Arogya Relay is a research and user-interface prototype. It is not a
> certified medical device, diagnostic product, or substitute for clinical
> judgment. All people, readings, locations, and case records shown in the
> application are fictional demonstration data.

## Current Prototype

The interface currently demonstrates:

- A field overview with screening and follow-up summaries
- Syndromic trend visualization for possible outbreak signals
- Priority case queues for urgent and routine review
- A guided screening form for symptoms and vital-sign readings
- Offline report status and simulated synchronization
- Referral summaries and follow-up tracking
- Battery, sensor, and local-storage diagnostics for a proposed field device
- Responsive layouts for desktop, tablet, and mobile screens
- **Multilingual and voice-ready experience** (Problem Statement 3): an
  offline-first i18n layer with 8 Indian languages (English, Hindi, Odia,
  Bengali, Assamese, Telugu, Marathi, Santali), translation safety tiers
  (Tier 1 safety-critical strings are English-only and never machine-translated),
  a clinical concept glossary, an integrated language switcher, and a
  progressive read-aloud interface. See
  `Update of Arogya Relay/Problem Statement 3/deliverables/`.
- Clear screening-support and non-diagnostic safety messaging

The current version is a prototype application with deterministic browser logic
and guarded demonstration API routes. It does not connect to physical sensors,
store real patient records, perform clinical diagnosis, or send reports to a
health authority.

## Care Guidance (decision-support assistant)

A **Care Guidance** assistant is integrated into the dashboard (sidebar →
**Care guidance**). It is a screening/decision-support feature, not a
diagnostic tool:

- Structured, accessible symptom intake (chips, free text, age group, duration,
  pregnancy, allergies, conditions, current medicines).
- A **deterministic, versioned red-flag rules engine** that classifies the next
  action as `emergency | same_day | clinician_review | self_care_information |
  insufficient_information` **before** any model or search runs.
- Works **offline** from a curated, cited clinical knowledge pack (WHO / MoHFW /
  ICMR-aligned sources), with optional allow-listed online augmentation.
- Sentence/section citations, source dates, versions and online/offline status.
- Emergency red flags immediately show the action and India number **112**; an
  emergency verdict is never downgraded by a model.
- Medication instructions appear **only** with a signed, doctor-authored order.
- Implementation under `lib/clinical/*`; schema under `db/schema.ts`; UI under
  `app/care-guidance.tsx`. See
  `Update of Arogya Relay/Problem Statement 1/deliverables/` for the architecture,
  safety case, source approval, setup and limitations documents.

## Nearby Care (referral navigation)

A **Nearby Care** system is integrated into the dashboard (sidebar →
**Nearby care**). It is a referral-navigation aid, not a live directory:

- Explicit location consent; `navigator.geolocation` over HTTPS with accuracy,
  timestamp, and `accurate | approximate | stale | denied | unavailable` states.
  Never labelled "exact"; poor accuracy requires confirmation.
- MapLibre GL JS map (attributed OSM tiles) plus an accessible list view.
- Synthetic, clearly-labelled facilities (hospital/CHC/PHC/Arogya Mandir/clinic/
  pharmacy) and active health camps / MMU visits.
- **Capability-first ranking:** required capability is filtered before distance,
  so a critical patient is never sent to a closer incapable facility.
- Emergency action offers **Call 112** immediately and does not wait for the map.
- Government/PM-JAY, maternal, child and accessibility filters; source/last-
  verified labels; copy/share referral brief.
- Implementation under `lib/nearby/*`; D1 tables in `db/schema.ts`; UI under
  `app/nearby-care.tsx`. See
  `Update of Arogya Relay/Problem Statement 2/deliverables/` for architecture,
  referral-ranking, source/freshness and agreements documents.

> [!IMPORTANT]
> Nearby Care is a research prototype. All facilities and camps shown are
> **synthetic demonstration data**. It does not show live beds, current camps, or
> ambulance dispatch, and HFR registration is not proof a facility is open.

> [!IMPORTANT]
> Care Guidance is a research prototype. It does not diagnose, prescribe, or
> replace a clinician. All people, readings and records shown are fictional
> demonstration data, and every rule/source is flagged for Registered Medical
> Practitioner validation.

## Care Plan & Reminders (doctor schedules, medicines, reminders)

A **Care Plan & Reminders** system is integrated into the dashboard (sidebar →
**Care plan**). It is a clinician-controlled scheduling and reminder aid, not a
prescriber or diagnostic tool:

- Only an authorised doctor (or admin) may create, approve, change, pause, or
  discontinue a medicine order. The assistant/chatbot path is explicitly blocked
  from mutating orders.
- Ambiguous schedules are **blocked** and returned to the clinician — the engine
  never infers a schedule from free text. PRN medicines get no ordinary
  scheduled-dose reminders unless the prescriber defines safe conditions + a
  daily max.
- Offline-first scheduling engine: recurring, one-time, taper, weekday, interval,
  paused (hospitalization) — deterministic and unit-tested with a fake clock.
- Safety surfaces in the editor: completeness/ambiguity blocking, duplicate
  active-order and allergy conflict warnings, high-risk flags, clinician-authored
  missed-dose advice (safe default when absent).
- Patient daily schedule with upcoming/due/missed/completed states, ICS export
  (privacy-safe generic titles) and printable daily chart.
- FHIR R4-aligned (ABDM-compatible) resource mappers, D1/Drizzle schema, and a
  Web Push adapter contract. Web Push and PWA persistent alarms are **best-effort**
  (platform-dependent) and are documented separately — not over-claimed.
- Implementation under `lib/careplan/*`; D1 tables in `db/schema.ts` +
  `db/migrations/0002_care_plan.sql`; UI under `app/care-plan.tsx`. See
  `Update of Arogya Relay/Problem Statement 4/deliverables/` for architecture,
  guaranteed-vs-best-effort behaviour, and the RMP/privacy/security checklist.

> [!IMPORTANT]
> Care Plan & Reminders is a research prototype. All plans, medicines, schedules
> and patients shown are **synthetic demonstration data**. Reminders are NOT proof
> of adherence; "Taken" is self-reported and never verifies ingestion. No LLM
> drug-interaction checker is included.

## Technology

- Next.js 16 and React 19
- TypeScript
- Tailwind CSS
- Vinext and Vite
- Cloudflare Workers-compatible build tooling
- Optional Drizzle ORM and Cloudflare D1 scaffolding for future development

## Requirements

- Node.js 22.13.0 or later
- npm

## Local Development

Clone the repository, install its dependencies, and start the development
server:

```

Open [http://localhost:3000](http://localhost:3000) in a browser. The project
uses a cross-platform launcher, so the same commands work in PowerShell,
Command Prompt, macOS, and Linux terminals.

Create a production build with:

```bash
npm run build
```

Run the production build locally with:

```bash
npm run start
```

## Useful Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Create and validate a production build |
| `npm run start` | Run the production build locally |
| `npm run lint` | Check the source with ESLint |
| `npm test` | Build and run the included rendered-output and clinical-engine tests |
| `npm run check` | Run the complete lint, build, and test gate used by GitHub Actions |
| `npm run audit:prod` | Check production dependencies against the npm advisory database |
| `npm run db:generate` | Generate Drizzle migrations after schema changes |

## GitHub Readiness

The repository includes a least-privilege GitHub Actions workflow, weekly
Dependabot checks, a security policy, contribution guidance, and a safe
environment-variable template. Before pushing, confirm that `git status` does
not include `.env`, build output, local databases, screenshots containing real
data, or credentials.

After creating an empty GitHub repository, connect and push this local checkout:

```bash
git remote add origin https://github.com/YOUR-USERNAME/arogya-relay.git
git push -u origin main
```

## Project Structure

```text
app/                    Application interface and global styling
build/                  Cross-platform Vinext launcher and Sites build support
db/                     Optional database connection and schema scaffolding
drizzle/                Database migration metadata
public/                 Static assets
tests/                  Rendered-output checks
worker/                 Cloudflare Worker entry point
.openai/hosting.json    Sites deployment configuration
```

## Security and Privacy

Do not collect or process real patient information with this prototype. A
production healthcare implementation should be designed and reviewed with
qualified clinical, security, privacy, legal, and regulatory specialists.

Before any real-world pilot, the project would need at least:

- Strong authentication, authorization, and role-based access controls
- Encryption in transit and at rest with managed key rotation
- Data minimization, consent handling, retention limits, and secure deletion
- Tamper-resistant audit logs and incident-response procedures
- Secret management with no credentials committed to source control
- Input validation, rate limiting, dependency scanning, and threat modeling
- Secure offline storage and conflict-safe synchronization
- Backup, recovery, availability, and device-loss procedures
- Compliance review for applicable health, privacy, and medical-device laws
- Independent penetration testing and clinical safety validation

Environment files are excluded by `.gitignore`. Never commit API keys,
credentials, access tokens, private certificates, or real patient data.

The prototype currently enforces bounded same-origin JSON requests, no-store API
responses, server-side role gates for protected demonstration routes, controlled
concept-only online evidence lookup, an HMAC requirement for signed order API
responses, restrictive security headers, explicit browser permissions, and
allow-listed map tile origins. These controls improve the prototype but do not
make it suitable for real health data or replace a professional security review.

Nearby Care uses location only after explicit consent. The list view is the
default. Opening the map requests OpenStreetMap raster tiles, which means the
tile provider can receive ordinary network metadata such as the visitor's IP
address; patient details and entered free text are not sent with tile requests.

## Medical and Regulatory Limitations

The displayed alerts and thresholds are illustrative and must not be treated as
clinical rules. Any production scoring, triage, or referral logic must be
defined by qualified clinicians, validated for the intended population, and
approved under the regulations that apply in each deployment region.

## Suggested Next Steps

1. Review the threat model, privacy requirements, and intended users.
2. Define clinically approved screening and referral protocols.
3. Add authenticated, encrypted, and auditable data storage.
4. Develop secure offline synchronization and conflict resolution.
5. Integrate validated sensors through a documented hardware interface.
6. Conduct accessibility, usability, security, and clinical-safety testing.

## Contributing

Use a separate branch for each change. Run the build and lint checks before
opening a pull request, and never include sensitive health data in issues,
commits, screenshots, test fixtures, or example records.

