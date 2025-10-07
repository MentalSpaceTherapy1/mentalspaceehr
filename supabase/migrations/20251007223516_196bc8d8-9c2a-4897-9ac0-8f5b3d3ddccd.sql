-- ============================================================================
-- PHASE 1 SECURITY HARDENING (CRITICAL FIXES)
-- Fixes staff profile exposure and patient insurance data over-exposure
-- ============================================================================

-- ============================================================================
-- FIX 1: RESTRICT STAFF PROFILE ACCESS
-- Remove overly permissive profile viewing, allow only:
-- - Own profile (existing policy)
-- - Administrators (existing policy)
-- - Direct supervisor (for supervisees) - NEW
-- - Supervisee viewing supervisor - NEW
-- ============================================================================

-- Drop the overly permissive policy that allows all authenticated users to view profiles
DROP POLICY IF EXISTS "All authenticated users can view basic profiles" ON public.profiles;

-- Add strict supervisor viewing policy
CREATE POLICY "Supervisors can view supervisee profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT supervisee_id 
    FROM public.supervision_relationships 
    WHERE supervisor_id = auth.uid() 
    AND status = 'Active'
  )
);

-- Add policy for supervisees to view their supervisor's profile
CREATE POLICY "Supervisees can view supervisor profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT supervisor_id 
    FROM public.supervision_relationships 
    WHERE supervisee_id = auth.uid() 
    AND status = 'Active'
  )
);

-- ============================================================================
-- FIX 2: RESTRICT PATIENT INSURANCE DATA ACCESS
-- Remove broad access, restrict to billing staff and assigned clinicians only
-- Front desk should NOT have full access to insurance data
-- ============================================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authorized staff can manage client insurance" ON public.client_insurance;
DROP POLICY IF EXISTS "Users can view insurance for accessible clients" ON public.client_insurance;

-- Restrict viewing to billing staff, administrators, and PRIMARY therapist only
CREATE POLICY "Billing and primary therapist can view insurance"
ON public.client_insurance
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'administrator'::app_role)
  OR has_role(auth.uid(), 'billing_staff'::app_role)
  OR EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = client_insurance.client_id
    AND clients.primary_therapist_id = auth.uid()
  )
);

-- Restrict modifications to billing staff and administrators only
-- Front desk and therapists cannot modify insurance data
CREATE POLICY "Billing staff can manage insurance"
ON public.client_insurance
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'administrator'::app_role)
  OR has_role(auth.uid(), 'billing_staff'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'administrator'::app_role)
  OR has_role(auth.uid(), 'billing_staff'::app_role)
);