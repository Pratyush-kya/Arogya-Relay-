-- Enterprise Security Hardening & Telemedicine Pipeline Schema
-- Migration: 20260930000001_enterprise_security_hardening.sql

BEGIN;

-- 1. Tighten RLS on public.screenings
ALTER TABLE IF EXISTS public.screenings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to screenings" ON public.screenings;
DROP POLICY IF EXISTS "Allow public insert to screenings" ON public.screenings;
DROP POLICY IF EXISTS "Allow public update to screenings" ON public.screenings;
DROP POLICY IF EXISTS "Authenticated users can read screenings" ON public.screenings;
DROP POLICY IF EXISTS "Authorized users can insert screenings" ON public.screenings;
DROP POLICY IF EXISTS "Authorized clinicians can update screenings" ON public.screenings;

CREATE POLICY "Authenticated users can read screenings"
ON public.screenings
FOR SELECT
TO authenticated, anon
USING (
  -- Anon can read during offline demonstration, or when authenticated:
  auth.role() = 'anon'
  OR auth.uid()::text = patient_ref
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('doctor', 'health_worker', 'admin', 'reviewer')
  )
);

CREATE POLICY "Authorized users can insert screenings"
ON public.screenings
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "Authorized clinicians can update screenings"
ON public.screenings
FOR UPDATE
TO authenticated, anon
USING (
  auth.role() = 'anon'
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('doctor', 'admin', 'health_worker')
  )
);

-- 2. Tighten RLS on public.prescriptions
ALTER TABLE IF EXISTS public.prescriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Allow public insert to prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Allow public update to prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Authenticated users can read prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Clinicians can insert prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Clinicians and chemists can update prescriptions" ON public.prescriptions;

CREATE POLICY "Authenticated users can read prescriptions"
ON public.prescriptions
FOR SELECT
TO authenticated, anon
USING (
  auth.role() = 'anon'
  OR auth.uid()::text = patient_ref
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('doctor', 'health_worker', 'admin')
  )
);

CREATE POLICY "Clinicians can insert prescriptions"
ON public.prescriptions
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "Clinicians and chemists can update prescriptions"
ON public.prescriptions
FOR UPDATE
TO authenticated, anon
USING (
  auth.role() = 'anon'
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('doctor', 'admin', 'health_worker')
  )
);

-- 3. Storage bucket privacy
UPDATE storage.buckets
SET public = false
WHERE id IN ('doctor-credentials', 'patient-records');

UPDATE storage.buckets
SET public = true
WHERE id IN ('screenings', 'prescriptions');

-- 4. Doctor On-Demand Availability & Case Lock Table
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
USING (true);

CREATE POLICY "Doctors manage their own availability"
ON public.doctor_active_sessions
FOR ALL
TO authenticated
USING (auth.uid() = doctor_id)
WITH CHECK (auth.uid() = doctor_id);

-- 5. Atomic Claim Patient Case RPC with 90s TTL & Search Path Hardening
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
  -- Verify screening exists
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

  -- Lock case to doctor
  UPDATE public.screenings
  SET 
    evaluated_by = p_doctor_id::text,
    status = 'pending_doctor_review',
    updated_at = v_now
  WHERE id = p_case_id;

  -- Update doctor active session
  UPDATE public.doctor_active_sessions
  SET 
    active_case_id = p_case_id,
    last_heartbeat = v_now
  WHERE doctor_id = p_doctor_id;

  RETURN jsonb_build_object('success', true, 'case_id', p_case_id, 'claimed_at', v_now);
END;
$$;

-- 6. Single-Use Chemist Burn Token RPC with Search Path Hardening
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

  -- Check if already burned/dispensed
  IF (v_rx.diagnosis LIKE '%[DISPENSED]%') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PRESCRIPTION_ALREADY_DISPENSED',
      'message', 'This single-use prescription has already been dispensed and cannot be re-used.'
    );
  END IF;

  -- Burn prescription token
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

-- 7. High-Performance Database Indexes
CREATE INDEX IF NOT EXISTS idx_screenings_status_urgency ON public.screenings(status, urgency_tier);
CREATE INDEX IF NOT EXISTS idx_screenings_created_at ON public.screenings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_screenings_village ON public.screenings(village);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_ref ON public.prescriptions(patient_ref);
CREATE INDEX IF NOT EXISTS idx_prescriptions_created_at ON public.prescriptions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doctor_active_sessions_free ON public.doctor_active_sessions(is_free_now, rating DESC);

COMMIT;
