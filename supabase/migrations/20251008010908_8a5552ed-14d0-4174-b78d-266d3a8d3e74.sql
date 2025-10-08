-- Enable RLS on clinician_schedules if not already enabled
ALTER TABLE clinician_schedules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can manage all schedules" ON clinician_schedules;
DROP POLICY IF EXISTS "Clinicians can view their own schedule" ON clinician_schedules;
DROP POLICY IF EXISTS "Clinicians can manage their own schedule" ON clinician_schedules;

-- Policy: Administrators can manage all schedules
CREATE POLICY "Admins can manage all schedules"
ON clinician_schedules
FOR ALL
USING (has_role(auth.uid(), 'administrator'))
WITH CHECK (has_role(auth.uid(), 'administrator'));

-- Policy: Clinicians can view their own schedule
CREATE POLICY "Clinicians can view their own schedule"
ON clinician_schedules
FOR SELECT
USING (clinician_id = auth.uid() OR has_role(auth.uid(), 'administrator'));

-- Policy: Clinicians can insert their own schedule
CREATE POLICY "Clinicians can insert their own schedule"
ON clinician_schedules
FOR INSERT
WITH CHECK (clinician_id = auth.uid() AND created_by = auth.uid());

-- Policy: Clinicians can update their own schedule
CREATE POLICY "Clinicians can update their own schedule"
ON clinician_schedules
FOR UPDATE
USING (clinician_id = auth.uid())
WITH CHECK (clinician_id = auth.uid() AND updated_by = auth.uid());