-- Migration: 20260905000000_create_screenings_table.sql
-- Description: Create public.screenings table for field health worker screenings and clinical evaluations.

create table if not exists public.screenings (
  id text primary key,
  patient_ref text not null,
  age integer not null check (age >= 0 and age <= 130),
  temperature numeric(4, 1) not null,
  spo2 integer not null check (spo2 >= 0 and spo2 <= 100),
  symptoms text[] not null default '{}',
  field_notes text default '',
  village text not null default 'North Ridge',
  urgency_tier text not null default 'review' check (urgency_tier in ('emergency', 'urgent', 'review', 'cleared')),
  status text not null default 'pending_doctor_review' check (status in ('pending_doctor_review', 'doctor_evaluated', 'completed')),
  doctor_notes text,
  prescription_advice text,
  evaluated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.screenings is 'Field screening assessments submitted by ASHA workers and evaluated by clinicians.';

-- Indexes for efficient queries
create index if not exists idx_screenings_created_at on public.screenings (created_at desc);
create index if not exists idx_screenings_urgency_tier on public.screenings (urgency_tier);
create index if not exists idx_screenings_status on public.screenings (status);
create index if not exists idx_screenings_patient_ref on public.screenings (patient_ref);

-- Updated_at trigger
drop trigger if exists trg_screenings_updated_at on public.screenings;
create trigger trg_screenings_updated_at
  before update on public.screenings
  for each row
  execute function public.set_updated_at();

-- Enable Row Level Security
alter table public.screenings enable row level security;

-- Policies: allow field workers (anon and authenticated) to read, insert, and update screenings
drop policy if exists "screenings_select_policy" on public.screenings;
create policy "screenings_select_policy"
  on public.screenings
  for select
  to anon, authenticated
  using (true);

drop policy if exists "screenings_insert_policy" on public.screenings;
create policy "screenings_insert_policy"
  on public.screenings
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "screenings_update_policy" on public.screenings;
create policy "screenings_update_policy"
  on public.screenings
  for update
  to anon, authenticated
  using (true)
  with check (true);
