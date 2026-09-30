-- Remote Supabase Security Loophole Fix & Schema Alignment
-- Migration: 20260930000002_fix_remote_supabase_loopholes.sql

BEGIN;

-- ============================================================================
-- 1. Align public.screenings Table Schema
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.screenings_new (
  id TEXT PRIMARY KEY,
  patient_ref TEXT NOT NULL,
  age INTEGER,
  temperature NUMERIC(4, 1),
  spo2 INTEGER,
  symptoms TEXT[] DEFAULT '{}',
  field_notes TEXT DEFAULT '',
  village TEXT DEFAULT '',
  urgency_tier TEXT NOT NULL DEFAULT 'cleared',
  status TEXT NOT NULL DEFAULT 'pending_doctor_review',
  doctor_notes TEXT,
  prescription_advice TEXT,
  evaluated_by TEXT,
  screener_id TEXT,
  screener_name TEXT,
  screener_role TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Copy any existing rows if any existed (0 currently)
INSERT INTO public.screenings_new (id, patient_ref, age, field_notes, village, urgency_tier, image_url, screener_name, created_at)
SELECT id::text, COALESCE(pseudo_id, 'UNKNOWN'), age, clinical_notes, village, urgency_tier, image_url, screener_name, created_at
FROM public.screenings
ON CONFLICT (id) DO NOTHING;

-- Drop legacy table and rename new table
DROP TABLE public.screenings CASCADE;
ALTER TABLE public.screenings_new RENAME TO screenings;

-- Enable RLS on screenings
ALTER TABLE public.screenings ENABLE ROW LEVEL SECURITY;

-- Drop any lingering policies
DROP POLICY IF EXISTS "Public Read Screenings" ON public.screenings;
DROP POLICY IF EXISTS "Allow Insert Screenings" ON public.screenings;
DROP POLICY IF EXISTS "Allow public read access to screenings" ON public.screenings;
DROP POLICY IF EXISTS "Allow public insert to screenings" ON public.screenings;
DROP POLICY IF EXISTS "Authenticated users can read screenings" ON public.screenings;
DROP POLICY IF EXISTS "Authorized users can insert screenings" ON public.screenings;
DROP POLICY IF EXISTS "Authorized clinicians can update screenings" ON public.screenings;

-- Strict, Secure RLS for Screenings:
-- 1. Authenticated patients read only their own records (patient_ref = auth.uid()::text or email)
-- 2. Verified healthcare staff (doctor, health_worker, admin, reviewer) can view cases
-- 3. Anonymous reading is restricted to offline demonstration/demo records only
CREATE POLICY "Authorized users can read screenings"
ON public.screenings
FOR SELECT
TO authenticated, anon
USING (
  (auth.role() = 'authenticated' AND (
    auth.uid()::text = patient_ref
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('doctor', 'health_worker', 'admin', 'reviewer')
    )
  ))
  OR (auth.role() = 'anon' AND id LIKE 'DEMO-%')
);

CREATE POLICY "Authorized users can insert screenings"
ON public.screenings
FOR INSERT
TO authenticated, anon
WITH CHECK (
  auth.role() = 'authenticated'
  OR (auth.role() = 'anon' AND id LIKE 'SCR-%')
);

CREATE POLICY "Authorized clinicians can update screenings"
ON public.screenings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('doctor', 'admin', 'health_worker')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('doctor', 'admin', 'health_worker')
  )
);

-- ============================================================================
-- 2. Create public.prescriptions Table & RLS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id TEXT PRIMARY KEY,
  patient_ref TEXT NOT NULL,
  doctor_name TEXT NOT NULL,
  diagnosis TEXT,
  prescription_image_url TEXT,
  medicines JSONB NOT NULL DEFAULT '[]'::jsonb,
  adherence_logs JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Allow public insert to prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Authenticated users can read prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Authorized users can read prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Clinicians can insert prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Clinicians and chemists can update prescriptions" ON public.prescriptions;

CREATE POLICY "Authorized users can read prescriptions"
ON public.prescriptions
FOR SELECT
TO authenticated, anon
USING (
  (auth.role() = 'authenticated' AND (
    auth.uid()::text = patient_ref
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('doctor', 'health_worker', 'admin', 'chemist')
    )
  ))
  OR (auth.role() = 'anon' AND id LIKE 'DEMO-%')
);

CREATE POLICY "Clinicians can insert prescriptions"
ON public.prescriptions
FOR INSERT
TO authenticated, anon
WITH CHECK (
  auth.role() = 'authenticated'
  OR (auth.role() = 'anon' AND id LIKE 'RX-%')
);

CREATE POLICY "Clinicians and chemists can update prescriptions"
ON public.prescriptions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('doctor', 'admin', 'health_worker', 'chemist')
  )
);

-- ============================================================================
-- 3. Create public.doctor_active_sessions Table & RLS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.doctor_active_sessions (
  doctor_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_free_now BOOLEAN NOT NULL DEFAULT false,
  consultation_fee_inr INTEGER NOT NULL DEFAULT 50,
  active_case_id TEXT,
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  specialization TEXT DEFAULT 'General Medicine',
  rating NUMERIC(3,2) DEFAULT 4.90
);

ALTER TABLE public.doctor_active_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view available doctors" ON public.doctor_active_sessions;
DROP POLICY IF EXISTS "Doctors manage their own availability" ON public.doctor_active_sessions;

CREATE POLICY "Anyone can view available doctors"
ON public.doctor_active_sessions
FOR SELECT
TO authenticated, anon
USING (is_free_now = true OR (auth.role() = 'authenticated' AND auth.uid() = doctor_id));

CREATE POLICY "Doctors manage their own availability"
ON public.doctor_active_sessions
FOR ALL
TO authenticated
USING (auth.uid() = doctor_id)
WITH CHECK (auth.uid() = doctor_id);

-- ============================================================================
-- 4. Hardened RPC Functions (SECURITY DEFINER with Search Path)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.claim_patient_case(
  p_case_id TEXT,
  p_doctor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_case RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_case
  FROM public.screenings
  WHERE id = p_case_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Case not found');
  END IF;

  IF v_case.status = 'doctor_evaluated' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Case already evaluated by another clinician');
  END IF;

  UPDATE public.screenings
  SET 
    evaluated_by = p_doctor_id::text,
    status = 'pending_doctor_review',
    updated_at = v_now
  WHERE id = p_case_id;

  UPDATE public.doctor_active_sessions
  SET 
    active_case_id = p_case_id,
    last_heartbeat = v_now
  WHERE doctor_id = p_doctor_id;

  RETURN jsonb_build_object('success', true, 'case_id', p_case_id, 'claimed_at', v_now);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_prescription_dispensed(
  p_prescription_id TEXT,
  p_chemist_id TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rx RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_rx
  FROM public.prescriptions
  WHERE id = p_prescription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Prescription not found');
  END IF;

  IF (v_rx.diagnosis LIKE '%[DISPENSED]%') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PRESCRIPTION_ALREADY_DISPENSED',
      'message', 'This single-use prescription has already been dispensed and cannot be re-used.'
    );
  END IF;

  UPDATE public.prescriptions
  SET 
    diagnosis = COALESCE(diagnosis, '') || ' [DISPENSED by ' || p_chemist_id || ' at ' || v_now::text || ']',
    updated_at = v_now
  WHERE id = p_prescription_id;

  RETURN jsonb_build_object(
    'success', true,
    'prescription_id', p_prescription_id,
    'dispensed_at', v_now,
    'chemist_id', p_chemist_id
  );
END;
$$;

-- Secure doctor evaluations table
ALTER TABLE IF EXISTS public.doctor_evaluations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Doctor Evaluations" ON public.doctor_evaluations;
DROP POLICY IF EXISTS "Allow Doctor Insert Evaluation" ON public.doctor_evaluations;

CREATE POLICY "Clinicians can read evaluations"
ON public.doctor_evaluations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('doctor', 'admin', 'health_worker', 'reviewer')
  )
);

CREATE POLICY "Clinicians can insert evaluations"
ON public.doctor_evaluations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('doctor', 'admin')
  )
);

-- ============================================================================
-- 5. Storage Buckets Privacy Hardening
-- ============================================================================
UPDATE storage.buckets
SET public = false
WHERE id IN ('doctor-credentials', 'patient-records', 'prescriptions');

UPDATE storage.buckets
SET public = true
WHERE id = 'screenings';

-- ============================================================================
-- 6. Indexes for Performance & Latency Reduction
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_screenings_status_urgency ON public.screenings(status, urgency_tier);
CREATE INDEX IF NOT EXISTS idx_screenings_created_at ON public.screenings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_screenings_village ON public.screenings(village);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_ref ON public.prescriptions(patient_ref);
CREATE INDEX IF NOT EXISTS idx_prescriptions_created_at ON public.prescriptions(created_at DESC);

COMMIT;
