-- Add all missing appointment types to the check constraint
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_appointment_type_check;

ALTER TABLE appointments ADD CONSTRAINT appointments_appointment_type_check 
CHECK (appointment_type = ANY (ARRAY[
  'Initial Evaluation',
  'Therapy Intake',
  'Psychiatric Intake',
  'Individual Therapy',
  'Therapy Session',
  'Couples Therapy',
  'Family Therapy',
  'Group Therapy',
  'Medication Management',
  'Testing',
  'Psychological Evaluation',
  'Psychiatric Evaluation',
  'Consultation',
  'Crisis',
  'Telehealth',
  'Other'
]));