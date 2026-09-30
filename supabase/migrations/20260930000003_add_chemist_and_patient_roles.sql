-- Migration: Support chemist and patient roles in public.profiles table
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check 
  check (role in ('admin', 'doctor', 'health_worker', 'reviewer', 'patient', 'chemist', 'caregiver'));
