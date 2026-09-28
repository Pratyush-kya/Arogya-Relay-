-- =========================================================================
-- Arogya Relay — AES-256 Profile Encryption, Admin Governance & Anti-SQLi
-- Migration: 20260928000000_aes256_admin_and_encrypted_auth.sql
-- =========================================================================

-- 1. Enable pgcrypto for cryptographic operations
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Add Encrypted Bytea Columns to public.profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS phone_encrypted bytea,
  ADD COLUMN IF NOT EXISTS address_encrypted bytea,
  ADD COLUMN IF NOT EXISTS gov_id_encrypted bytea;

-- 3. Dedicated Encryption Key Function (Protected with fixed search_path)
CREATE OR REPLACE FUNCTION public.get_app_cipher_key()
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT 'ArogyaRelay-AES256GCM-SecureKey-2026-ZeroTrust'::text;
$$;

-- 4. Stored Procedure: Promote User to Administrator (Safe & Idempotent)
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(target_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_user_id uuid;
  v_clean_email text := lower(trim(target_email));
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_clean_email;
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found in auth.users');
  END IF;

  -- 1. Update auth.users app_metadata for JWT token claim
  UPDATE auth.users 
  SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin", "is_admin": true}'::jsonb
  WHERE id = v_user_id;

  -- 2. Upsert profile with admin privileges
  INSERT INTO public.profiles (
    id, email, role, display_name, pseudo_id, verification_status, verified_at, updated_at
  ) VALUES (
    v_user_id, v_clean_email, 'admin', 'System Administrator', 'ADM-' || substring(v_user_id::text from 1 for 6), 'verified', now(), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    verification_status = 'verified',
    updated_at = now();

  RETURN jsonb_build_object('success', true, 'user_id', v_user_id, 'email', v_clean_email, 'role', 'admin');
END;
$$;

-- 5. Stored Procedure: Revoke Administrator Role (Safeguarded against root lockout)
CREATE OR REPLACE FUNCTION public.demote_admin_user(target_email text, new_role text DEFAULT 'health_worker')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_user_id uuid;
  v_clean_email text := lower(trim(target_email));
BEGIN
  IF v_clean_email = 'pratyushkiranrath4@gmail.com' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot demote the platform root administrator.');
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = v_clean_email;
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Strip admin claim from auth.users
  UPDATE auth.users 
  SET raw_app_meta_data = (coalesce(raw_app_meta_data, '{}'::jsonb) - 'is_admin') || jsonb_build_object('role', new_role)
  WHERE id = v_user_id;

  -- Update public.profiles
  UPDATE public.profiles
  SET role = new_role, updated_at = now()
  WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true, 'email', v_clean_email, 'new_role', new_role);
END;
$$;

-- 6. Hardened Signup Trigger: Encrypts PII with AES-256 and Prevents SQLi / Role Tampering
CREATE OR REPLACE FUNCTION public.handle_new_user_signup_secure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_raw_phone text := new.raw_user_meta_data->>'phone';
  v_raw_address text := new.raw_user_meta_data->>'address';
  v_raw_gov_id text := new.raw_user_meta_data->>'gov_id';
  v_role text;
  v_cipher_key text := public.get_app_cipher_key();
BEGIN
  -- Strict Privilege Separation: Clients cannot self-appoint 'admin'
  IF new.email = 'pratyushkiranrath4@gmail.com' THEN
    v_role := 'admin';
  ELSIF (new.raw_user_meta_data->>'role') IN ('doctor', 'health_worker', 'patient') THEN
    v_role := new.raw_user_meta_data->>'role';
  ELSE
    v_role := 'patient';
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    role,
    pseudo_id,
    phone,
    phone_encrypted,
    address_encrypted,
    gov_id_encrypted,
    verification_status,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    v_role,
    CASE 
      WHEN v_role = 'admin' THEN 'ADM-' || substring(new.id::text from 1 for 6)
      WHEN v_role = 'doctor' THEN 'DR-' || substring(new.id::text from 1 for 6)
      WHEN v_role = 'health_worker' THEN 'HW-' || substring(new.id::text from 1 for 6)
      ELSE 'PT-' || substring(new.id::text from 1 for 6)
    END,
    -- Store masked phone for non-sensitive UI display
    CASE WHEN v_raw_phone IS NOT NULL AND length(v_raw_phone) >= 4 THEN '******' || right(v_raw_phone, 4) ELSE NULL END,
    -- Store AES-256 encrypted ciphertext
    CASE WHEN v_raw_phone IS NOT NULL THEN pgp_sym_encrypt(v_raw_phone, v_cipher_key, 'cipher-algo=aes256') ELSE NULL END,
    CASE WHEN v_raw_address IS NOT NULL THEN pgp_sym_encrypt(v_raw_address, v_cipher_key, 'cipher-algo=aes256') ELSE NULL END,
    CASE WHEN v_raw_gov_id IS NOT NULL THEN pgp_sym_encrypt(v_raw_gov_id, v_cipher_key, 'cipher-algo=aes256') ELSE NULL END,
    CASE WHEN v_role = 'doctor' THEN 'pending_verification' ELSE 'verified' END,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = CASE WHEN new.email = 'pratyushkiranrath4@gmail.com' THEN 'admin' ELSE profiles.role END,
    verification_status = CASE WHEN new.email = 'pratyushkiranrath4@gmail.com' THEN 'verified' ELSE profiles.verification_status END,
    updated_at = now();

  RETURN new;
END;
$$;

-- Drop prior triggers and bind hardened trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_secure ON auth.users;
CREATE TRIGGER on_auth_user_created_secure
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup_secure();

-- 7. Safe Decryption Function: Zero-Leakage Profile Retrieval for Authenticated Users
CREATE OR REPLACE FUNCTION public.get_my_decrypted_profile()
RETURNS TABLE (
  id uuid,
  email text,
  display_name text,
  role text,
  pseudo_id text,
  phone text,
  address text,
  verification_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_cipher_key text := public.get_app_cipher_key();
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.display_name,
    p.role,
    p.pseudo_id,
    CASE WHEN p.phone_encrypted IS NOT NULL THEN pgp_sym_decrypt(p.phone_encrypted, v_cipher_key) ELSE p.phone END AS phone,
    CASE WHEN p.address_encrypted IS NOT NULL THEN pgp_sym_decrypt(p.address_encrypted, v_cipher_key) ELSE NULL END AS address,
    p.verification_status
  FROM public.profiles p
  WHERE p.id = v_caller_id;
END;
$$;

-- 8. Row Level Security Hardening
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User can view own profile or admin can view all" ON public.profiles;
CREATE POLICY "User can view own profile or admin can view all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR (auth.jwt()->'app_metadata'->>'is_admin')::boolean = true);

DROP POLICY IF EXISTS "User can update own profile" ON public.profiles;
CREATE POLICY "User can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));
