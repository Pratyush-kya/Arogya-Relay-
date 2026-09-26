-- Arogya Relay Supabase foundation schema
-- Purpose: convert the current prototype's D1/SQLite model into a Supabase
-- Postgres backend with role-aware access, consent, auditability, and clear
-- clinical safety boundaries.
--
-- Production note:
-- This schema is designed for synthetic/prototype use first. Before storing
-- real patient data, complete legal/privacy review, clinician validation,
-- incident response planning, retention rules, and encryption/key management.

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('admin', 'doctor', 'health_worker', 'reviewer', 'patient', 'caregiver');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.age_group as enum ('infant', 'child', 'adolescent', 'adult', 'older_adult', 'unknown');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.encounter_type as enum ('screening', 'care_guidance', 'review');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.triage_urgency as enum (
    'emergency',
    'same_day',
    'clinician_review',
    'self_care_information',
    'insufficient_information'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.knowledge_mode as enum ('offline', 'online', 'offline_fallback');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.facility_type as enum ('hospital', 'phc', 'chc', 'aam', 'clinic', 'pharmacy', 'government_service');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.verification_status as enum ('verified', 'unverified', 'stale', 'disputed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.location_source as enum ('gps', 'manual', 'approximate');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.care_plan_status as enum ('draft', 'active', 'paused', 'discontinued');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.care_item_type as enum ('appointment', 'test', 'refill', 'activity', 'symptom_checkin', 'post_visit_task');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.care_item_status as enum ('active', 'completed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.reminder_state as enum ('upcoming', 'due', 'missed', 'completed', 'skipped', 'snoozed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.pending_sync_kind as enum ('ack', 'edit', 'discontinue', 'grant', 'revoke');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'health_worker',
  display_name text not null,
  pseudo_id text not null unique,
  registration_ref text,
  facility_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Application profile linked to Supabase Auth. Authorization data lives here/app metadata, never user-editable user_metadata.';

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  age_group public.age_group not null,
  age_years integer check (age_years is null or age_years between 0 and 120),
  village_code text,
  assigned_worker_id uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.patients is 'Minimized patient records. Store reference codes only; avoid names, precise addresses, IDs, or unnecessary PHI.';

create table if not exists public.patient_allergies (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  allergen text not null,
  severity text,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  purpose text not null,
  granted boolean not null,
  granted_at timestamptz,
  withdrawn_at timestamptz,
  expires_at timestamptz,
  deleted_at timestamptz,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.encounters (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  type public.encounter_type not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  note text,
  created_by uuid references public.profiles(id)
);

create table if not exists public.questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  pregnant boolean,
  duration_days integer check (duration_days is null or duration_days between 0 and 3650),
  rapid_deterioration boolean,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.observations (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  code text not null,
  value_text text not null,
  unit text,
  recorded_by uuid references public.profiles(id),
  recorded_at timestamptz not null default now()
);

create table if not exists public.triage_decisions (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  urgency public.triage_urgency not null,
  knowledge_mode public.knowledge_mode not null,
  retrieval_coverage text,
  triggered_rules jsonb not null default '[]'::jsonb,
  emergency_number text not null default '112',
  medicine_status text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.clinician_reviews (
  id uuid primary key default gen_random_uuid(),
  triage_decision_id uuid not null references public.triage_decisions(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id),
  state text not null check (state in ('pending', 'approved', 'rejected', 'amended')),
  note text,
  reviewed_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  actor_id uuid references public.profiles(id),
  actor_role public.app_role,
  detail jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

comment on table public.audit_events is 'Append-only audit log. Do not update or delete rows from application code.';

create table if not exists public.source_versions (
  id uuid primary key default gen_random_uuid(),
  source_id text not null,
  version text not null,
  title text not null,
  publisher text not null,
  canonical_url text not null,
  licence text not null,
  hash text not null,
  jurisdiction text,
  review_date date,
  requires_rmp_validation boolean not null default true,
  superseded_by uuid references public.source_versions(id),
  published_at timestamptz not null default now(),
  unique (source_id, version)
);

create table if not exists public.evidence_chunks (
  id uuid primary key default gen_random_uuid(),
  source_version_id uuid not null references public.source_versions(id) on delete cascade,
  section text not null,
  anchor text not null,
  body text not null,
  keywords jsonb not null default '[]'::jsonb
);

create table if not exists public.retrieval_events (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid references public.encounters(id) on delete set null,
  mode public.knowledge_mode not null,
  chunk_ids jsonb not null default '[]'::jsonb,
  coverage text,
  source_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.safety_rule_versions (
  id uuid primary key default gen_random_uuid(),
  rule_id text not null,
  version text not null,
  label text not null,
  action public.triage_urgency not null check (action <> 'insufficient_information'),
  requires_rmp_validation boolean not null default true,
  published_at timestamptz not null default now(),
  unique (rule_id, version)
);

create table if not exists public.facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.facility_type not null,
  lat numeric(9,6) not null,
  lng numeric(9,6) not null,
  accuracy_meters integer,
  address text not null,
  village_code text,
  phone text,
  emergency boolean not null default false,
  icu boolean not null default false,
  oxygen boolean not null default false,
  paediatrics boolean not null default false,
  maternity boolean not null default false,
  surgery boolean not null default false,
  ambulance boolean not null default false,
  pharmacy boolean not null default false,
  mental_health boolean not null default false,
  diagnostics boolean not null default false,
  schemes jsonb not null default '[]'::jsonb,
  open_now boolean,
  verification public.verification_status not null default 'unverified' check (verification <> 'cancelled'),
  verification_source text,
  verified_at timestamptz,
  expires_at timestamptz,
  external_id text,
  source_url text,
  last_fetched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_records (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid references public.facilities(id) on delete set null,
  organisation text not null,
  url text not null,
  external_id text,
  fetched_at timestamptz not null,
  verified_at timestamptz,
  expires_at timestamptz,
  field_provenance jsonb
);

create table if not exists public.verification_history (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('facility', 'camp', 'source')),
  entity_id uuid not null,
  status public.verification_status not null,
  actor_id uuid references public.profiles(id),
  note text,
  changed_at timestamptz not null default now()
);

create table if not exists public.camps (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organiser text not null,
  source text not null,
  services jsonb not null default '[]'::jsonb,
  eligibility text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  recurrence text,
  venue text not null,
  lat numeric(9,6) not null,
  lng numeric(9,6) not null,
  contact text,
  verification public.verification_status not null default 'unverified' check (verification <> 'cancelled'),
  last_verified_at timestamptz,
  cancelled boolean not null default false,
  validity_end timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete set null,
  origin_lat numeric(9,6) not null,
  origin_lng numeric(9,6) not null,
  origin_accuracy integer,
  required_capabilities jsonb not null default '[]'::jsonb,
  emergency boolean not null default false,
  chosen_facility_id uuid references public.facilities(id) on delete set null,
  straight_line_km numeric(8,3),
  road_eta_min numeric(8,2),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.location_snapshots (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade,
  lat numeric(9,6) not null,
  lng numeric(9,6) not null,
  accuracy_meters integer not null,
  captured_at timestamptz not null,
  source public.location_source not null,
  purpose text not null,
  consent_given_at timestamptz not null,
  retention_until timestamptz not null,
  deleted_at timestamptz
);

create table if not exists public.routing_results (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid references public.referrals(id) on delete cascade,
  facility_id uuid references public.facilities(id) on delete cascade,
  road_distance_km numeric(8,3),
  road_eta_min numeric(8,2),
  mode text not null check (mode in ('online', 'offline_estimate')),
  provider text,
  created_at timestamptz not null default now()
);

create table if not exists public.care_plans (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  practitioner_id uuid not null references public.profiles(id),
  title text not null,
  start_date date not null,
  end_date date not null,
  language_accepted text not null,
  pack_version text not null,
  status public.care_plan_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1
);

create table if not exists public.medication_orders (
  id uuid primary key default gen_random_uuid(),
  care_plan_id uuid not null references public.care_plans(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  medicine text not null,
  strength text not null,
  form text not null,
  dose text not null,
  route text not null,
  frequency jsonb not null,
  food_relation text not null check (food_relation in ('before_food', 'after_food', 'with_food', 'empty_stomach', 'any')),
  indication text not null,
  instructions text not null,
  start_date date not null,
  end_date date not null,
  tapers jsonb,
  high_risk boolean not null default false,
  missed_dose_advice text,
  signed_by_doctor_id uuid references public.profiles(id),
  signed_at timestamptz,
  signature text,
  status public.care_plan_status not null default 'draft',
  discontinued_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  constraint medication_orders_signed_when_active check (
    status <> 'active' or (signed_by_doctor_id is not null and signed_at is not null and signature is not null)
  )
);

create table if not exists public.care_items (
  id uuid primary key default gen_random_uuid(),
  care_plan_id uuid not null references public.care_plans(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  type public.care_item_type not null,
  title text not null,
  detail text not null,
  scheduled_at timestamptz not null,
  prep jsonb,
  documents_to_carry jsonb,
  signed_by_doctor_id uuid references public.profiles(id),
  status public.care_item_status not null default 'active',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reminder_instances (
  id text primary key,
  source_type text not null check (source_type in ('medication', 'care_item')),
  source_id uuid not null,
  patient_id uuid not null references public.patients(id) on delete cascade,
  due_at timestamptz not null,
  state public.reminder_state not null default 'upcoming',
  acknowledged_as text check (acknowledged_as is null or acknowledged_as in ('taken', 'snoozed', 'skipped', 'no_medicine', 'side_effect', 'unsure')),
  acknowledged_at timestamptz,
  channels jsonb not null default '[]'::jsonb
);

create table if not exists public.caregiver_grants (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  caregiver_id uuid not null references public.profiles(id) on delete cascade,
  scope text not null check (scope in ('view_reminders', 'receive_reminders')),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (patient_id, caregiver_id, scope)
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  subscription jsonb not null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.pending_sync (
  id text primary key,
  kind public.pending_sync_kind not null,
  patient_id uuid references public.patients(id) on delete cascade,
  payload jsonb not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  failed_at timestamptz,
  failure_reason text
);

-- Indexes: foreign keys, RLS predicates, dashboard queries, and active queues.
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists patients_assigned_worker_idx on public.patients(assigned_worker_id) where deleted_at is null;
create index if not exists patients_created_by_idx on public.patients(created_by) where deleted_at is null;
create index if not exists patient_allergies_patient_idx on public.patient_allergies(patient_id) where deleted_at is null;
create index if not exists consent_records_patient_idx on public.consent_records(patient_id);
create index if not exists encounters_patient_started_idx on public.encounters(patient_id, started_at desc);
create index if not exists questionnaire_responses_patient_idx on public.questionnaire_responses(patient_id, created_at desc);
create index if not exists questionnaire_responses_encounter_idx on public.questionnaire_responses(encounter_id);
create index if not exists observations_encounter_idx on public.observations(encounter_id);
create index if not exists observations_patient_recorded_idx on public.observations(patient_id, recorded_at desc);
create index if not exists triage_decisions_patient_idx on public.triage_decisions(patient_id, created_at desc);
create index if not exists triage_decisions_urgency_idx on public.triage_decisions(urgency, created_at desc);
create index if not exists clinician_reviews_reviewer_idx on public.clinician_reviews(reviewer_id, reviewed_at desc);
create index if not exists audit_events_entity_idx on public.audit_events(entity_type, entity_id, created_at desc);
create index if not exists evidence_chunks_source_idx on public.evidence_chunks(source_version_id);
create index if not exists evidence_chunks_keywords_gin_idx on public.evidence_chunks using gin (keywords);
create index if not exists retrieval_events_encounter_idx on public.retrieval_events(encounter_id, created_at desc);
create index if not exists facilities_type_idx on public.facilities(type);
create index if not exists facilities_verification_idx on public.facilities(verification);
create index if not exists facilities_box_idx on public.facilities(lat, lng);
create index if not exists source_records_facility_idx on public.source_records(facility_id);
create index if not exists verification_history_entity_idx on public.verification_history(entity_type, entity_id, changed_at desc);
create index if not exists camps_active_idx on public.camps(validity_end, cancelled);
create index if not exists referrals_patient_idx on public.referrals(patient_id, created_at desc);
create index if not exists referrals_chosen_facility_idx on public.referrals(chosen_facility_id);
create index if not exists location_snapshots_patient_idx on public.location_snapshots(patient_id, captured_at desc) where deleted_at is null;
create index if not exists location_snapshots_retention_idx on public.location_snapshots(retention_until) where deleted_at is null;
create index if not exists routing_results_referral_idx on public.routing_results(referral_id);
create index if not exists routing_results_facility_idx on public.routing_results(facility_id);
create index if not exists care_plans_patient_idx on public.care_plans(patient_id, updated_at desc);
create index if not exists care_plans_practitioner_idx on public.care_plans(practitioner_id, updated_at desc);
create index if not exists medication_orders_patient_idx on public.medication_orders(patient_id, status);
create index if not exists medication_orders_plan_idx on public.medication_orders(care_plan_id);
create index if not exists medication_orders_doctor_idx on public.medication_orders(signed_by_doctor_id);
create index if not exists care_items_patient_idx on public.care_items(patient_id, scheduled_at);
create index if not exists care_items_plan_idx on public.care_items(care_plan_id);
create index if not exists reminder_instances_patient_due_idx on public.reminder_instances(patient_id, due_at);
create index if not exists reminder_instances_due_idx on public.reminder_instances(due_at, state) where state in ('upcoming', 'due', 'snoozed');
create index if not exists caregiver_grants_patient_idx on public.caregiver_grants(patient_id, caregiver_id) where revoked_at is null;
create index if not exists caregiver_grants_caregiver_idx on public.caregiver_grants(caregiver_id) where revoked_at is null;
create index if not exists push_subscriptions_patient_idx on public.push_subscriptions(patient_id);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
create index if not exists pending_sync_kind_idx on public.pending_sync(kind, created_at);
create index if not exists pending_sync_patient_idx on public.pending_sync(patient_id, created_at);

-- Updated-at helper.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists patients_set_updated_at on public.patients;
create trigger patients_set_updated_at before update on public.patients
for each row execute function public.set_updated_at();

drop trigger if exists facilities_set_updated_at on public.facilities;
create trigger facilities_set_updated_at before update on public.facilities
for each row execute function public.set_updated_at();

drop trigger if exists care_plans_set_updated_at on public.care_plans;
create trigger care_plans_set_updated_at before update on public.care_plans
for each row execute function public.set_updated_at();

drop trigger if exists medication_orders_set_updated_at on public.medication_orders;
create trigger medication_orders_set_updated_at before update on public.medication_orders
for each row execute function public.set_updated_at();

drop trigger if exists care_items_set_updated_at on public.care_items;
create trigger care_items_set_updated_at before update on public.care_items
for each row execute function public.set_updated_at();

-- RLS enablement.
alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.patient_allergies enable row level security;
alter table public.consent_records enable row level security;
alter table public.encounters enable row level security;
alter table public.questionnaire_responses enable row level security;
alter table public.observations enable row level security;
alter table public.triage_decisions enable row level security;
alter table public.clinician_reviews enable row level security;
alter table public.audit_events enable row level security;
alter table public.source_versions enable row level security;
alter table public.evidence_chunks enable row level security;
alter table public.retrieval_events enable row level security;
alter table public.safety_rule_versions enable row level security;
alter table public.facilities enable row level security;
alter table public.source_records enable row level security;
alter table public.verification_history enable row level security;
alter table public.camps enable row level security;
alter table public.referrals enable row level security;
alter table public.location_snapshots enable row level security;
alter table public.routing_results enable row level security;
alter table public.care_plans enable row level security;
alter table public.medication_orders enable row level security;
alter table public.care_items enable row level security;
alter table public.reminder_instances enable row level security;
alter table public.caregiver_grants enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.pending_sync enable row level security;

-- Profile access. First admin/profile bootstrap should be done from the
-- Supabase dashboard SQL editor or service role, not the public client.
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = (select auth.uid()));

-- No public profile update policy yet: role/display-name changes should go
-- through a server route with service-role privileges and an admin audit event.

-- Patient access:
-- staff can work with assigned/created patients; doctors, reviewers and admins
-- can see clinical records for review. Patients/caregivers only see rows
-- through grants in the care-plan/reminder policies below.
create policy "patients_staff_select"
on public.patients for select
to authenticated
using (
  assigned_worker_id = (select auth.uid())
  or created_by = (select auth.uid())
  or exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin', 'doctor', 'reviewer')
  )
);

create policy "patients_staff_insert"
on public.patients for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin', 'doctor', 'health_worker')
  )
);

create policy "patients_staff_update"
on public.patients for update
to authenticated
using (
  assigned_worker_id = (select auth.uid())
  or created_by = (select auth.uid())
  or exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin', 'doctor')
  )
)
with check (
  assigned_worker_id = (select auth.uid())
  or created_by = (select auth.uid())
  or exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin', 'doctor')
  )
);

-- Clinical child tables follow patient visibility. Writes are staff-only.
create policy "patient_allergies_select_by_patient_access"
on public.patient_allergies for select
to authenticated
using (exists (select 1 from public.patients p where p.id = patient_id));

create policy "patient_allergies_staff_write"
on public.patient_allergies for all
to authenticated
using (exists (select 1 from public.patients p where p.id = patient_id))
with check (
  exists (select 1 from public.patients p where p.id = patient_id)
  and exists (
    select 1 from public.profiles pr
    where pr.id = (select auth.uid())
      and pr.role in ('admin', 'doctor', 'health_worker')
  )
);

create policy "consent_select_by_patient_access"
on public.consent_records for select
to authenticated
using (exists (select 1 from public.patients p where p.id = patient_id));

create policy "consent_staff_write"
on public.consent_records for all
to authenticated
using (exists (select 1 from public.patients p where p.id = patient_id))
with check (
  exists (select 1 from public.patients p where p.id = patient_id)
  and exists (
    select 1 from public.profiles pr
    where pr.id = (select auth.uid())
      and pr.role in ('admin', 'doctor', 'health_worker')
  )
);

create policy "encounters_select_by_patient_access"
on public.encounters for select
to authenticated
using (exists (select 1 from public.patients p where p.id = patient_id));

create policy "encounters_staff_insert"
on public.encounters for insert
to authenticated
with check (
  exists (select 1 from public.patients p where p.id = patient_id)
  and exists (
    select 1 from public.profiles pr
    where pr.id = (select auth.uid())
      and pr.role in ('admin', 'doctor', 'health_worker')
  )
);

create policy "questionnaire_select_by_patient_access"
on public.questionnaire_responses for select
to authenticated
using (exists (select 1 from public.patients p where p.id = patient_id));

create policy "questionnaire_staff_insert"
on public.questionnaire_responses for insert
to authenticated
with check (
  exists (select 1 from public.patients p where p.id = patient_id)
  and exists (
    select 1 from public.profiles pr
    where pr.id = (select auth.uid())
      and pr.role in ('admin', 'doctor', 'health_worker')
  )
);

create policy "observations_select_by_patient_access"
on public.observations for select
to authenticated
using (exists (select 1 from public.patients p where p.id = patient_id));

create policy "observations_staff_insert"
on public.observations for insert
to authenticated
with check (
  exists (select 1 from public.patients p where p.id = patient_id)
  and exists (
    select 1 from public.profiles pr
    where pr.id = (select auth.uid())
      and pr.role in ('admin', 'doctor', 'health_worker')
  )
);

create policy "triage_select_by_patient_access"
on public.triage_decisions for select
to authenticated
using (exists (select 1 from public.patients p where p.id = patient_id));

create policy "triage_staff_insert"
on public.triage_decisions for insert
to authenticated
with check (
  exists (select 1 from public.patients p where p.id = patient_id)
  and exists (
    select 1 from public.profiles pr
    where pr.id = (select auth.uid())
      and pr.role in ('admin', 'doctor', 'health_worker')
  )
);

create policy "clinician_reviews_doctor_reviewer_admin"
on public.clinician_reviews for all
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin', 'doctor', 'reviewer')
  )
)
with check (
  reviewer_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin', 'doctor', 'reviewer')
  )
);

create policy "audit_staff_select"
on public.audit_events for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin', 'doctor', 'reviewer')
  )
);

create policy "audit_staff_insert"
on public.audit_events for insert
to authenticated
with check (
  actor_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin', 'doctor', 'health_worker', 'reviewer')
  )
);

-- Knowledge and source data: readable to authenticated staff; writable only
-- by admin/reviewer. This prevents unreviewed source poisoning.
create policy "knowledge_authenticated_read"
on public.source_versions for select
to authenticated
using (true);

create policy "evidence_authenticated_read"
on public.evidence_chunks for select
to authenticated
using (true);

create policy "safety_rules_authenticated_read"
on public.safety_rule_versions for select
to authenticated
using (true);

create policy "retrieval_events_staff_insert"
on public.retrieval_events for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin', 'doctor', 'health_worker', 'reviewer')
  )
);

create policy "knowledge_admin_reviewer_write"
on public.source_versions for all
to authenticated
using (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'reviewer'))
)
with check (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'reviewer'))
);

create policy "evidence_admin_reviewer_write"
on public.evidence_chunks for all
to authenticated
using (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'reviewer'))
)
with check (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'reviewer'))
);

create policy "safety_rules_admin_reviewer_write"
on public.safety_rule_versions for all
to authenticated
using (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'reviewer'))
)
with check (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'reviewer'))
);

