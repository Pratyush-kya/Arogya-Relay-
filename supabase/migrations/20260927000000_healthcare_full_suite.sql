-- =========================================================================
-- Arogya Relay / Telehealth Suite — Full PostgreSQL & Supabase Schema
-- =========================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1. Screenings & Doctor-Patient Consultation Queue
create table if not exists public.screenings (
  id text primary key,
  patient_ref text not null,
  age integer not null default 30,
  temperature numeric(4,1) not null default 98.6,
  spo2 numeric(4,1) not null default 98.0,
  symptoms jsonb not null default '[]'::jsonb,
  field_notes text default '',
  village text not null default 'Mawlynnong',
  urgency_tier text not null default 'review' check (urgency_tier in ('emergency', 'urgent', 'review', 'cleared')),
  status text not null default 'pending_doctor_review' check (status in ('pending_doctor_review', 'doctor_evaluated', 'completed')),
  doctor_notes text,
  prescription_advice text,
  evaluated_by text,
  image_url text,
  audio_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);

-- 2. Patient Prescriptions & Scheduled Dose Alarms
create table if not exists public.prescriptions (
  id text primary key,
  patient_ref text not null,
  doctor_name text not null default 'Doctor on Call',
  diagnosis text,
  prescription_image_url text,
  medicines jsonb not null default '[]'::jsonb,
  adherence_logs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);

-- 3. Predefined Disease & Remedies Library
create table if not exists public.disease_library (
  id text primary key,
  name text not null,
  hindi_name text,
  category text not null check (category in ('fever', 'stomach', 'respiratory', 'skin', 'first_aid', 'maternal_child')),
  urgency text not null check (urgency in ('low', 'medium', 'urgent', 'emergency')),
  icon text default '🩺',
  symptoms jsonb not null default '[]'::jsonb,
  remedies jsonb not null default '[]'::jsonb,
  otc_guidance jsonb not null default '[]'::jsonb,
  red_flags jsonb not null default '[]'::jsonb,
  narration_text text,
  created_at timestamptz not null default now()
);

-- 4. Scheduled Community Health Camps & MMU Visits
create table if not exists public.health_camps (
  id text primary key,
  title text not null,
  organizer text not null,
  village text not null,
  latitude numeric(10, 6),
  longitude numeric(10, 6),
  start_date date not null,
  end_date date not null,
  timings text not null default '09:00 AM - 04:00 PM',
  services jsonb not null default '["General Checkup", "BP/Blood Sugar", "Free Medicines"]'::jsonb,
  contact_phone text default '+91112',
  status text not null default 'scheduled' check (status in ('scheduled', 'ongoing', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

-- 5. Verified Healthcare Facilities & Jan Aushadhi Kendras
create table if not exists public.facilities (
  id text primary key,
  name text not null,
  type text not null check (type in ('hospital', 'chc', 'phc', 'sub_center', 'pharmacy', 'jan_aushadhi')),
  address text not null,
  village_code text default 'MWL',
  phone text default '+91112',
  latitude numeric(10, 6) not null,
  longitude numeric(10, 6) not null,
  capabilities jsonb not null default '{}'::jsonb,
  is_jan_aushadhi boolean default false,
  open_now boolean default true,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- Enable Row Level Security (RLS) & Policies
-- =========================================================================

alter table public.screenings enable row level security;
alter table public.prescriptions enable row level security;
alter table public.disease_library enable row level security;
alter table public.health_camps enable row level security;
alter table public.facilities enable row level security;

-- Public read access for reference directories
create policy "Allow public read on disease_library" on public.disease_library for select using (true);
create policy "Allow public read on health_camps" on public.health_camps for select using (true);
create policy "Allow public read on facilities" on public.facilities for select using (true);

-- Frontline read/write for screenings & prescriptions
create policy "Allow public insert on screenings" on public.screenings for insert with check (true);
create policy "Allow public select on screenings" on public.screenings for select using (true);
create policy "Allow public update on screenings" on public.screenings for update using (true);

create policy "Allow public insert on prescriptions" on public.prescriptions for insert with check (true);
create policy "Allow public select on prescriptions" on public.prescriptions for select using (true);
create policy "Allow public update on prescriptions" on public.prescriptions for update using (true);

-- Enable Realtime publication
alter publication supabase_realtime add table public.screenings;
alter publication supabase_realtime add table public.prescriptions;
