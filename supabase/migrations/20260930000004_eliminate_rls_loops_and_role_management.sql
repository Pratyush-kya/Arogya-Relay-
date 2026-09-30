-- Migration: 20260930000004_eliminate_rls_loops_and_role_management.sql
-- Description: Eliminates infinite recursion loops in RLS policies by using SECURITY DEFINER functions,
-- and provides stored procedures to safely assign roles (admin, doctor, health_worker, chemist, patient).

-- 1. Helper function: is_admin() without RLS recursion
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 2. Helper function: get_my_role() without RLS recursion
create or replace function public.get_my_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid() limit 1),
    'patient'
  );
$$;

-- 3. Helper function: is_clinician()
create or replace function public.is_clinician()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('doctor', 'reviewer') and verification_status = 'verified'
  );
$$;

-- 4. Helper function: is_health_worker()
create or replace function public.is_health_worker()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('health_worker', 'admin')
  );
$$;

-- 5. Helper function: is_chemist()
create or replace function public.is_chemist()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('chemist', 'admin')
  );
$$;

-- 6. Ensure profiles check constraint supports all roles
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check 
  check (role in ('admin', 'doctor', 'health_worker', 'reviewer', 'patient', 'chemist', 'caregiver'));

-- 7. Fix RLS on profiles to avoid any recursive self-referencing policies
drop policy if exists "User can view own profile or admin can view all" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "Allow individual read" on public.profiles;
drop policy if exists "Allow admin full select" on public.profiles;
drop policy if exists "profiles_read_policy" on public.profiles;

create policy "profiles_read_policy"
  on public.profiles for select
  using (
    auth.uid() = id 
    or public.is_admin()
    or role in ('doctor') -- Allow patients to view doctor profiles for consultations
  );

drop policy if exists "User can update own profile" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_update_policy" on public.profiles;

create policy "profiles_update_policy"
  on public.profiles for update
  using (
    auth.uid() = id or public.is_admin()
  )
  with check (
    -- Normal users cannot elevate their own role to admin
    (auth.uid() = id and (role = public.get_my_role() or public.is_admin()))
    or public.is_admin()
  );

drop policy if exists "profiles_insert_policy" on public.profiles;
create policy "profiles_insert_policy"
  on public.profiles for insert
  with check (
    auth.uid() = id or public.is_admin()
  );

-- 8. Stored Procedure: set_user_role
-- Allows administrators or SQL editor users to assign roles without tricky joins
create or replace function public.set_user_role(target_email text, new_role text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
  updated_profile jsonb;
begin
  -- Enforce that caller is either postgres superuser, service_role, or an admin
  if current_user not in ('postgres', 'service_role') and not public.is_admin() then
    raise exception 'Unauthorized: Only platform administrators can change user roles.';
  end if;

  if new_role not in ('admin', 'doctor', 'health_worker', 'chemist', 'patient', 'reviewer') then
    raise exception 'Invalid role: %. Allowed roles: admin, doctor, health_worker, chemist, patient, reviewer', new_role;
  end if;

  select id into target_user_id from auth.users where email = target_email limit 1;
  if target_user_id is null then
    select id into target_user_id from public.profiles where email = target_email limit 1;
  end if;

  if target_user_id is null then
    raise exception 'User with email % was not found.', target_email;
  end if;

  -- Update or insert profile
  insert into public.profiles (id, email, role, display_name, pseudo_id, verification_status)
  values (
    target_user_id,
    target_email,
    new_role,
    split_part(target_email, '@', 1),
    case 
      when new_role = 'admin' then 'ADM-' || substring(target_user_id::text from 1 for 6)
      when new_role = 'doctor' then 'DOC-' || substring(target_user_id::text from 1 for 6)
      when new_role = 'health_worker' then 'HW-' || substring(target_user_id::text from 1 for 6)
      when new_role = 'chemist' then 'CHM-' || substring(target_user_id::text from 1 for 6)
      else 'PAT-' || substring(target_user_id::text from 1 for 6)
    end,
    'verified'
  )
  on conflict (id) do update set
    role = new_role,
    verification_status = 'verified',
    updated_at = now()
  returning to_jsonb(profiles.*) into updated_profile;

  -- Synchronize auth.users metadata
  update auth.users
  set 
    raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new_role),
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', new_role)
  where id = target_user_id;

  return jsonb_build_object(
    'status', 'success',
    'email', target_email,
    'assigned_role', new_role,
    'profile', updated_profile
  );
end;
$$;

-- Grant execution to authenticated users, postgres, and service_role
grant execute on function public.is_admin to authenticated, anon;
grant execute on function public.get_my_role to authenticated, anon;
grant execute on function public.set_user_role to postgres, authenticated, service_role;
