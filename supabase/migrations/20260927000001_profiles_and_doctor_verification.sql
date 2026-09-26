-- =========================================================================
-- Arogya Relay — User Profiles, Doctor Verification & Storage Policies
-- =========================================================================

-- 1. Profiles Table with Doctor Verification Schema
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'health_worker' check (role in ('admin', 'doctor', 'health_worker', 'reviewer', 'patient')),
  pseudo_id text,
  facility_name text,
  phone text,
  medical_reg_no text,
  council_name text,
  qualification text,
  specialization text,
  experience_years integer default 0,
  verification_status text not null default 'verified' check (verification_status in ('pending_verification', 'verified', 'rejected')),
  verification_notes text,
  license_document_url text,
  verified_at timestamptz,
  verified_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);

-- 2. Row Level Security for Profiles
alter table public.profiles enable row level security;

create policy "Profiles are viewable by authenticated users or public" 
  on public.profiles for select 
  using (true);

create policy "Users can update their own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

create policy "Users can insert their own profile" 
  on public.profiles for insert 
  with check (true);

-- 3. Automatic Admin Provisioning Trigger for pratyushkiranrath4@gmail.com
create or replace function public.handle_new_user_profile()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    email,
    display_name,
    role,
    pseudo_id,
    verification_status
  ) values (
    new.id,
    new.email,
    case 
      when new.email = 'pratyushkiranrath4@gmail.com' then 'Pratyush Kiran Rath (Admin)'
      else coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
    end,
    case 
      when new.email = 'pratyushkiranrath4@gmail.com' then 'admin'
      else coalesce(new.raw_user_meta_data->>'role', 'health_worker')
    end,
    case 
      when new.email = 'pratyushkiranrath4@gmail.com' then 'ADM-PRATYUSH'
      else coalesce(new.raw_user_meta_data->>'pseudo_id', 'HW-' || substring(new.id::text from 1 for 6))
    end,
    case 
      when new.email = 'pratyushkiranrath4@gmail.com' then 'verified'
      when new.raw_user_meta_data->>'role' = 'doctor' then 'pending_verification'
      else 'verified'
    end
  )
  on conflict (id) do update set
    role = case when new.email = 'pratyushkiranrath4@gmail.com' then 'admin' else profiles.role end,
    verification_status = case when new.email = 'pratyushkiranrath4@gmail.com' then 'verified' else profiles.verification_status end;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users (if running inside Supabase with auth permissions)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

-- 4. Storage Buckets (S3 compatible)
insert into storage.buckets (id, name, public) 
values 
  ('prescriptions', 'prescriptions', true),
  ('screenings', 'screenings', true),
  ('doctor-credentials', 'doctor-credentials', true)
on conflict (id) do nothing;

create policy "Public Access to prescriptions" 
  on storage.objects for select 
  using (bucket_id in ('prescriptions', 'screenings', 'doctor-credentials'));

create policy "Authenticated & Public Uploads" 
  on storage.objects for insert 
  with check (bucket_id in ('prescriptions', 'screenings', 'doctor-credentials'));
