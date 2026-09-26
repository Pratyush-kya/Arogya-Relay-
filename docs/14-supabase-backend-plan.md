# Supabase Backend Plan

This project already has a D1/Drizzle prototype schema. The Supabase backend should be the production-style source of truth for authenticated users, role-based access, audit logs, consent, screening records, triage decisions, nearby-care source data, referrals, and care-plan reminders.

## What To Build First

1. Create a Supabase project from the Supabase dashboard.
2. Install the Supabase CLI locally.
3. Apply the starter migration in `supabase/migrations/0001_arogya_relay_core.sql`.
4. Create one admin profile manually from the SQL editor after your first Auth user exists.
5. Add Supabase client libraries to the app and replace the prototype bearer-token helper with Supabase Auth.
6. Wire API routes to Supabase writes in small steps: profiles/auth first, then patients/screenings, then care guidance audit, then nearby care, then doctor care plans.

## Data Model

The migration creates these groups:

- Identity: `profiles`
- Patient core: `patients`, `patient_allergies`, `consent_records`
- Screening and guidance: `encounters`, `questionnaire_responses`, `observations`, `triage_decisions`, `clinician_reviews`
- Audit and evidence: `audit_events`, `source_versions`, `evidence_chunks`, `retrieval_events`, `safety_rule_versions`
- Nearby care: `facilities`, `source_records`, `verification_history`, `camps`, `referrals`, `location_snapshots`, `routing_results`
- Care plans: `care_plans`, `medication_orders`, `care_items`, `reminder_instances`, `caregiver_grants`, `push_subscriptions`, `pending_sync`

## Role Model

Use Supabase Auth for login, and use `profiles.role` for app authorization:

- `admin`: manage staff, source data, all clinical records
- `doctor`: review triage, author and sign care plans/medication orders
- `health_worker`: create assigned patients, screenings, observations, referrals
- `reviewer`: review knowledge/facility source quality
- `patient`: future patient app access
- `caregiver`: consent-gated reminder access

Do not authorize from `user_metadata`; it is user-editable. Keep role decisions in `profiles`, server-side checks, or app metadata.

## Security Rules

- RLS is enabled on every public table.
- Facility and camp catalogs are readable anonymously because they should contain no patient data.
- Patient-linked records require authenticated access and patient assignment or staff role.
- Medication orders require doctor/admin role and cannot become active unless signed.
- Audit events are append-only from application code.
- Location snapshots have retention fields and should be periodically deleted after `retention_until`.

## Local Setup Commands

Install the CLI:

```bash
npm install -g supabase
supabase --version
```

Initialize Supabase in this repo if you want the CLI config:

```bash
cd /home/pratyush/Project/Website/Arogya-Relay
supabase init
```

Start local Supabase if Docker is running:

```bash
supabase start
supabase db reset
```

Create a remote project in the dashboard, then link and push:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push --dry-run
supabase db push
```

## Environment Variables

Add these to `.env.local` after creating the project:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code and never prefix it with `NEXT_PUBLIC_`.

## First Bootstrap SQL

After you create your own user in Supabase Auth, get that user's UUID from the Auth dashboard and run this in the Supabase SQL editor:

```sql
insert into public.profiles (id, role, display_name, pseudo_id)
values ('<your-auth-user-id>', 'admin', 'Pratyush', 'admin-pratyush')
on conflict (id) do update
set role = 'admin',
    display_name = excluded.display_name,
    pseudo_id = excluded.pseudo_id;
```

## Implementation Order

1. Install `@supabase/supabase-js` and `@supabase/ssr`.
2. Add `lib/supabase/client.ts` and `lib/supabase/server.ts`.
3. Replace `lib/auth.ts` role resolution with `supabase.auth.getUser()` plus `profiles.role`.
4. Update `/api/admin/ingest` to require an admin profile.
5. Update `/api/doctor/recommend` to require doctor/admin profile and persist signed medication orders.
6. Update `/api/care-guidance` to create encounters, questionnaire responses, triage decisions, retrieval events, and audit rows.
7. Add a background cleanup job later for expired `location_snapshots` and stale `pending_sync`.


