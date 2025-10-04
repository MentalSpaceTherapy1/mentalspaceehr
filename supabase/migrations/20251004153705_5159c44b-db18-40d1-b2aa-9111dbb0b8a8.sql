-- Add missing appointment types to the check constraint
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_appointment_type_check;

ALTER TABLE appointments ADD CONSTRAINT appointments_appointment_type_check 
CHECK (appointment_type = ANY (ARRAY[
  'Initial Evaluation',
  'Therapy Intake',
  'Psychiatric Intake',
  'Individual Therapy',
  'Couples Therapy',
  'Family Therapy',
  'Group Therapy',
  'Medication Management',
  'Testing',
  'Consultation',
  'Crisis',
  'Telehealth',
  'Other'
]));