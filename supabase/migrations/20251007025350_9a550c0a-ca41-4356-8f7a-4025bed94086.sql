-- Update form templates with detailed sections and fields
-- Also add columns to track form response approval workflow

-- Add workflow columns to portal_form_responses
ALTER TABLE portal_form_responses
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'needs_revision')),
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS data_imported_to_chart boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS imported_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS imported_by uuid REFERENCES auth.users(id);

-- Update Client Information Form with detailed fields
UPDATE portal_form_templates
SET sections = '[
  {
    "id": "personal_info",
    "title": "Personal Information",
    "order": 1,
    "description": "Please provide your personal information",
    "fields": [
      {"id": "full_legal_name", "label": "Full Legal Name", "type": "text", "required": true, "order": 1},
      {"id": "preferred_name", "label": "Preferred Name/Nickname", "type": "text", "required": false, "order": 2},
      {"id": "pronouns", "label": "Pronouns", "type": "text", "required": false, "order": 3},
      {"id": "date_of_birth", "label": "Date of Birth", "type": "date", "required": true, "order": 4},
      {"id": "sex_assigned_at_birth", "label": "Sex Assigned at Birth", "type": "select", "required": true, "order": 5, "options": ["Male", "Female", "Intersex", "Prefer not to say"]},
      {"id": "gender_identity", "label": "Gender Identity", "type": "text", "required": false, "order": 6},
      {"id": "ssn", "label": "Social Security Number (for insurance billing)", "type": "text", "required": false, "order": 7}
    ]
  },
  {
    "id": "contact_info",
    "title": "Contact Information",
    "order": 2,
    "fields": [
      {"id": "home_address", "label": "Home Address", "type": "text", "required": true, "order": 1},
      {"id": "city", "label": "City", "type": "text", "required": true, "order": 2},
      {"id": "state", "label": "State", "type": "text", "required": true, "order": 3},
      {"id": "zip", "label": "ZIP Code", "type": "text", "required": true, "order": 4},
      {"id": "mailing_address", "label": "Mailing Address (if different)", "type": "text", "required": false, "order": 5},
      {"id": "primary_phone", "label": "Primary Phone", "type": "text", "required": true, "order": 6},
      {"id": "phone_type", "label": "Phone Type", "type": "select", "required": true, "order": 7, "options": ["Mobile", "Home", "Work"]},
      {"id": "voicemail_ok", "label": "May we leave voicemail?", "type": "radio", "required": true, "order": 8, "options": ["Yes", "No"]},
      {"id": "secondary_phone", "label": "Secondary Phone", "type": "text", "required": false, "order": 9},
      {"id": "email", "label": "Email Address", "type": "text", "required": true, "order": 10},
      {"id": "preferred_contact", "label": "Preferred Method of Contact", "type": "select", "required": true, "order": 11, "options": ["Phone", "Email", "Text", "Mail"]},
      {"id": "reminder_consent", "label": "May we send appointment reminders via text/email?", "type": "radio", "required": true, "order": 12, "options": ["Yes", "No"]}
    ]
  },
  {
    "id": "demographics",
    "title": "Demographic Information",
    "order": 3,
    "fields": [
      {"id": "marital_status", "label": "Marital Status", "type": "select", "required": true, "order": 1, "options": ["Single", "Married", "Partnered", "Separated", "Divorced", "Widowed"]},
      {"id": "race_ethnicity", "label": "Race/Ethnicity (optional)", "type": "text", "required": false, "order": 2},
      {"id": "primary_language", "label": "Primary Language", "type": "text", "required": true, "order": 3},
      {"id": "other_languages", "label": "Other Languages", "type": "text", "required": false, "order": 4},
      {"id": "needs_interpreter", "label": "Do you require an interpreter?", "type": "radio", "required": true, "order": 5, "options": ["Yes", "No"]},
      {"id": "interpreter_language", "label": "If yes, language", "type": "text", "required": false, "order": 6},
      {"id": "religious_affiliation", "label": "Religious/Spiritual Affiliation (optional)", "type": "text", "required": false, "order": 7}
    ]
  },
  {
    "id": "employment_education",
    "title": "Employment & Education",
    "order": 4,
    "fields": [
      {"id": "employment_status", "label": "Employment Status", "type": "select", "required": true, "order": 1, "options": ["Employed Full-Time", "Employed Part-Time", "Self-Employed", "Unemployed", "Student", "Retired", "Disabled", "Homemaker"]},
      {"id": "employer_school", "label": "Employer/School", "type": "text", "required": false, "order": 2},
      {"id": "occupation", "label": "Occupation", "type": "text", "required": false, "order": 3},
      {"id": "education_level", "label": "Highest Level of Education", "type": "select", "required": true, "order": 4, "options": ["Some High School", "High School/GED", "Some College", "Associates", "Bachelors", "Masters", "Doctorate"]}
    ]
  },
  {
    "id": "living_situation",
    "title": "Living Situation",
    "order": 5,
    "fields": [
      {"id": "living_arrangement", "label": "Current Living Arrangement", "type": "select", "required": true, "order": 1, "options": ["Own Home", "Rent", "With Family", "Group Home", "Homeless", "Other"]},
      {"id": "lives_with", "label": "Who do you live with?", "type": "text", "required": false, "order": 2},
      {"id": "household_size", "label": "Number of people in household", "type": "text", "required": false, "order": 3}
    ]
  },
  {
    "id": "referring_info",
    "title": "Referring Information",
    "order": 6,
    "fields": [
      {"id": "how_heard", "label": "How did you hear about MentalSpace?", "type": "text", "required": false, "order": 1},
      {"id": "referred_by", "label": "Referred by", "type": "text", "required": false, "order": 2},
      {"id": "pcp_name", "label": "Primary Care Physician", "type": "text", "required": false, "order": 3},
      {"id": "pcp_phone", "label": "PCP Phone", "type": "text", "required": false, "order": 4},
      {"id": "contact_pcp", "label": "May we contact your PCP?", "type": "radio", "required": false, "order": 5, "options": ["Yes", "No"]}
    ]
  }
]'::jsonb,
estimated_minutes = 20
WHERE title = 'Client Information Form';

-- Update Client Insurance Form
UPDATE portal_form_templates
SET sections = '[
  {
    "id": "primary_insurance",
    "title": "Primary Insurance",
    "order": 1,
    "fields": [
      {"id": "insurance_company", "label": "Insurance Company", "type": "text", "required": true, "order": 1},
      {"id": "policy_holder_name", "label": "Policy Holder Name", "type": "text", "required": true, "order": 2},
      {"id": "policy_holder_dob", "label": "Policy Holder Date of Birth", "type": "date", "required": true, "order": 3},
      {"id": "relationship_to_client", "label": "Relationship to Client", "type": "select", "required": true, "order": 4, "options": ["Self", "Spouse", "Parent", "Other"]},
      {"id": "policy_number", "label": "Policy Number", "type": "text", "required": true, "order": 5},
      {"id": "group_number", "label": "Group Number", "type": "text", "required": false, "order": 6},
      {"id": "insurance_phone", "label": "Insurance Phone Number", "type": "text", "required": true, "order": 7},
      {"id": "insurance_address", "label": "Insurance Address", "type": "textarea", "required": false, "order": 8},
      {"id": "effective_date", "label": "Effective Date", "type": "date", "required": false, "order": 9},
      {"id": "copay", "label": "Copay Amount", "type": "text", "required": false, "order": 10},
      {"id": "deductible", "label": "Deductible", "type": "text", "required": false, "order": 11},
      {"id": "deductible_met", "label": "Deductible Met", "type": "text", "required": false, "order": 12},
      {"id": "oop_max", "label": "Out-of-Pocket Max", "type": "text", "required": false, "order": 13}
    ]
  },
  {
    "id": "secondary_insurance",
    "title": "Secondary Insurance (if applicable)",
    "order": 2,
    "fields": [
      {"id": "secondary_company", "label": "Insurance Company", "type": "text", "required": false, "order": 1},
      {"id": "secondary_holder", "label": "Policy Holder Name", "type": "text", "required": false, "order": 2},
      {"id": "secondary_policy", "label": "Policy Number", "type": "text", "required": false, "order": 3},
      {"id": "secondary_group", "label": "Group Number", "type": "text", "required": false, "order": 4},
      {"id": "secondary_phone", "label": "Insurance Phone Number", "type": "text", "required": false, "order": 5}
    ]
  },
  {
    "id": "authorization",
    "title": "Insurance Authorization",
    "order": 3,
    "description": "I authorize MentalSpace to bill my insurance company for services rendered. I understand that I am financially responsible for any charges not covered by insurance.",
    "fields": [
      {"id": "billing_authorization", "label": "I authorize MentalSpace to bill my insurance", "type": "checkbox", "required": true, "order": 1},
      {"id": "payment_assignment", "label": "I authorize payment of medical benefits directly to MentalSpace", "type": "checkbox", "required": true, "order": 2},
      {"id": "information_release", "label": "I authorize release of medical information necessary for insurance claims", "type": "checkbox", "required": true, "order": 3}
    ]
  }
]'::jsonb,
estimated_minutes = 15
WHERE title = 'Client Insurance Form';

-- Update Client History Form
UPDATE portal_form_templates
SET sections = '[
  {
    "id": "presenting_concerns",
    "title": "Presenting Concerns",
    "order": 1,
    "fields": [
      {"id": "seeking_help_reason", "label": "Why are you seeking help now? What is happening or is different?", "type": "textarea", "required": true, "order": 1},
      {"id": "concern_details", "label": "When did it start? How often does it happen? How does it affect your life?", "type": "textarea", "required": true, "order": 2}
    ]
  },
  {
    "id": "mental_health_history",
    "title": "Mental Health History",
    "order": 2,
    "fields": [
      {"id": "previous_treatment", "label": "Have you ever received mental health treatment before?", "type": "radio", "required": true, "order": 1, "options": ["Yes", "No"]},
      {"id": "treatment_details", "label": "If yes, please provide details (dates, providers, diagnoses, treatment type)", "type": "textarea", "required": false, "order": 2},
      {"id": "hospitalized", "label": "Have you ever been hospitalized for mental health reasons?", "type": "radio", "required": true, "order": 3, "options": ["Yes", "No"]},
      {"id": "hospitalization_details", "label": "If yes, when and where?", "type": "textarea", "required": false, "order": 4},
      {"id": "current_diagnoses", "label": "Current or past psychiatric diagnoses", "type": "textarea", "required": false, "order": 5}
    ]
  },
  {
    "id": "family_history",
    "title": "Family Mental Health History",
    "order": 3,
    "fields": [
      {"id": "family_mental_health", "label": "Has anyone in your family experienced mental health or substance use issues?", "type": "textarea", "required": false, "order": 1}
    ]
  },
  {
    "id": "medical_history",
    "title": "Medical History",
    "order": 4,
    "fields": [
      {"id": "medical_conditions", "label": "Current medical conditions", "type": "textarea", "required": false, "order": 1},
      {"id": "surgeries", "label": "Past surgeries or hospitalizations", "type": "textarea", "required": false, "order": 2},
      {"id": "allergies", "label": "Allergies (medications, foods, other)", "type": "textarea", "required": false, "order": 3},
      {"id": "current_medications", "label": "Current medications (name, dosage, frequency, prescriber)", "type": "textarea", "required": false, "order": 4}
    ]
  },
  {
    "id": "substance_use",
    "title": "Substance Use History",
    "order": 5,
    "fields": [
      {"id": "alcohol_use", "label": "Alcohol", "type": "select", "required": true, "order": 1, "options": ["Never", "Past use", "Current use"]},
      {"id": "alcohol_frequency", "label": "If current use, how often?", "type": "text", "required": false, "order": 2},
      {"id": "tobacco_use", "label": "Tobacco/Nicotine", "type": "select", "required": true, "order": 3, "options": ["Never", "Past use", "Current use"]},
      {"id": "tobacco_details", "label": "Type/Frequency", "type": "text", "required": false, "order": 4},
      {"id": "cannabis_use", "label": "Cannabis/Marijuana", "type": "select", "required": true, "order": 5, "options": ["Never", "Past use", "Current use"]},
      {"id": "cannabis_frequency", "label": "Frequency", "type": "text", "required": false, "order": 6},
      {"id": "other_substances", "label": "Other substances", "type": "textarea", "required": false, "order": 7},
      {"id": "substance_treatment", "label": "Have you ever received treatment for substance use?", "type": "radio", "required": false, "order": 8, "options": ["Yes", "No"]},
      {"id": "substance_treatment_details", "label": "If yes, details", "type": "textarea", "required": false, "order": 9}
    ]
  },
  {
    "id": "trauma_history",
    "title": "Trauma History",
    "order": 6,
    "fields": [
      {"id": "trauma_types", "label": "Have you experienced any of the following?", "type": "multiselect", "required": false, "order": 1, "options": ["Physical abuse", "Sexual abuse", "Emotional abuse", "Neglect", "Domestic violence", "Combat exposure", "Serious accident", "Natural disaster", "Loss of loved one", "Other traumatic event"]},
      {"id": "trauma_details", "label": "If comfortable, please provide any additional details", "type": "textarea", "required": false, "order": 2}
    ]
  },
  {
    "id": "strengths_goals",
    "title": "Strengths and Goals",
    "order": 7,
    "fields": [
      {"id": "strengths", "label": "What are your personal strengths and coping skills?", "type": "textarea", "required": false, "order": 1},
      {"id": "therapy_goals", "label": "What are your goals for therapy?", "type": "textarea", "required": true, "order": 2},
      {"id": "additional_info", "label": "What else is important for us to know about you?", "type": "textarea", "required": false, "order": 3}
    ]
  }
]'::jsonb,
estimated_minutes = 25
WHERE title = 'Client History Form';

-- Update Emergency Contacts Form
UPDATE portal_form_templates
SET sections = '[
  {
    "id": "emergency_contact_1",
    "title": "Emergency Contact #1",
    "order": 1,
    "fields": [
      {"id": "ec1_name", "label": "Full Name", "type": "text", "required": true, "order": 1},
      {"id": "ec1_relationship", "label": "Relationship to You", "type": "text", "required": true, "order": 2},
      {"id": "ec1_primary_phone", "label": "Primary Phone", "type": "text", "required": true, "order": 3},
      {"id": "ec1_alt_phone", "label": "Alternative Phone", "type": "text", "required": false, "order": 4},
      {"id": "ec1_email", "label": "Email", "type": "text", "required": false, "order": 5},
      {"id": "ec1_address", "label": "Address", "type": "textarea", "required": false, "order": 6}
    ]
  },
  {
    "id": "emergency_contact_2",
    "title": "Emergency Contact #2",
    "order": 2,
    "fields": [
      {"id": "ec2_name", "label": "Full Name", "type": "text", "required": false, "order": 1},
      {"id": "ec2_relationship", "label": "Relationship to You", "type": "text", "required": false, "order": 2},
      {"id": "ec2_primary_phone", "label": "Primary Phone", "type": "text", "required": false, "order": 3},
      {"id": "ec2_alt_phone", "label": "Alternative Phone", "type": "text", "required": false, "order": 4},
      {"id": "ec2_email", "label": "Email", "type": "text", "required": false, "order": 5},
      {"id": "ec2_address", "label": "Address", "type": "textarea", "required": false, "order": 6}
    ]
  },
  {
    "id": "authorization",
    "title": "Authorization to Contact",
    "order": 3,
    "description": "I authorize MentalSpace to contact the above individuals in case of emergency, including situations where I may be at risk of harm.",
    "fields": [
      {"id": "contact_authorization", "label": "I authorize emergency contact", "type": "checkbox", "required": true, "order": 1}
    ]
  }
]'::jsonb,
estimated_minutes = 8
WHERE title = 'Emergency & Other Contacts Form';

-- Create index for approval workflow
CREATE INDEX IF NOT EXISTS idx_form_responses_approval ON portal_form_responses(approval_status, client_id);