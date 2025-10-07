-- Add columns for sharing and staff access to portal_form_templates if they don't exist
ALTER TABLE portal_form_templates 
ADD COLUMN IF NOT EXISTS shareable_on_portal boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS staff_access_level text DEFAULT 'Administrative',
ADD COLUMN IF NOT EXISTS shareable_on_demand boolean DEFAULT true;

-- Create standard form templates for client portal
INSERT INTO portal_form_templates (
  form_type, title, description, version, sections, is_active, 
  requires_signature, allow_partial_save, estimated_minutes,
  shareable_on_portal, shareable_on_demand, staff_access_level
) VALUES
-- Client History Form
('Intake', 'Client History Form', 'Comprehensive client history and background information', 1,
 '[{
   "id": "section1",
   "title": "Personal History",
   "order": 1,
   "description": "Please provide your personal and medical history",
   "fields": [
     {"id": "past_treatments", "label": "Previous Mental Health Treatment", "type": "textarea", "required": true, "order": 1},
     {"id": "medications", "label": "Current Medications", "type": "textarea", "required": true, "order": 2},
     {"id": "medical_history", "label": "Medical History", "type": "textarea", "required": true, "order": 3}
   ]
 }]'::jsonb, 
 true, true, true, 15, true, true, 'Clinical'),

-- Client Information Form  
('Intake', 'Client Information Form', 'Basic client demographic and contact information', 1,
 '[{
   "id": "section1",
   "title": "Personal Information",
   "order": 1,
   "fields": [
     {"id": "address", "label": "Home Address", "type": "textarea", "required": true, "order": 1},
     {"id": "phone", "label": "Phone Number", "type": "text", "required": true, "order": 2},
     {"id": "email", "label": "Email Address", "type": "text", "required": true, "order": 3},
     {"id": "employer", "label": "Employer", "type": "text", "required": false, "order": 4}
   ]
 }]'::jsonb,
 true, true, true, 10, true, true, 'Administrative'),

-- Client Insurance Form
('Insurance Update', 'Client Insurance Form', 'Insurance information and authorization', 1,
 '[{
   "id": "section1",
   "title": "Insurance Information",
   "order": 1,
   "fields": [
     {"id": "insurance_company", "label": "Insurance Company", "type": "text", "required": true, "order": 1},
     {"id": "policy_number", "label": "Policy Number", "type": "text", "required": true, "order": 2},
     {"id": "group_number", "label": "Group Number", "type": "text", "required": false, "order": 3},
     {"id": "subscriber_name", "label": "Subscriber Name", "type": "text", "required": true, "order": 4}
   ]
 }]'::jsonb,
 true, true, true, 8, true, true, 'Billing'),

-- Consent for Services
('Consent', 'Consent for Services', 'General consent for mental health services', 1,
 '[{
   "id": "section1",
   "title": "Consent Agreement",
   "order": 1,
   "fields": [
     {"id": "understanding", "label": "I understand the nature of the services being provided", "type": "checkbox", "required": true, "order": 1},
     {"id": "agreement", "label": "I consent to receive mental health services", "type": "checkbox", "required": true, "order": 2}
   ]
 }]'::jsonb,
 true, true, false, 5, true, true, 'Administrative'),

-- Emergency & Other Contacts Form
('Intake', 'Emergency & Other Contacts Form', 'Emergency contact information', 1,
 '[{
   "id": "section1",
   "title": "Emergency Contacts",
   "order": 1,
   "fields": [
     {"id": "contact_name", "label": "Emergency Contact Name", "type": "text", "required": true, "order": 1},
     {"id": "relationship", "label": "Relationship", "type": "text", "required": true, "order": 2},
     {"id": "phone", "label": "Phone Number", "type": "text", "required": true, "order": 3}
   ]
 }]'::jsonb,
 true, true, true, 5, true, true, 'Administrative'),

-- Notice of Privacy Practices
('Consent', 'Notice of Privacy Practices', 'HIPAA Notice of Privacy Practices acknowledgment', 1,
 '[{
   "id": "section1",
   "title": "Privacy Acknowledgment",
   "order": 1,
   "fields": [
     {"id": "received", "label": "I have received the Notice of Privacy Practices", "type": "checkbox", "required": true, "order": 1},
     {"id": "understood", "label": "I have read and understood my privacy rights", "type": "checkbox", "required": true, "order": 2}
   ]
 }]'::jsonb,
 true, true, false, 5, true, true, 'Administrative'),

-- Payment Authorization Form
('Consent', 'Payment Authorization Form', 'Financial agreement and payment authorization', 1,
 '[{
   "id": "section1",
   "title": "Payment Agreement",
   "order": 1,
   "fields": [
     {"id": "payment_responsibility", "label": "I understand my payment responsibility", "type": "checkbox", "required": true, "order": 1},
     {"id": "insurance_authorization", "label": "I authorize filing of insurance claims on my behalf", "type": "checkbox", "required": true, "order": 2}
   ]
 }]'::jsonb,
 true, true, false, 5, true, true, 'Billing'),

-- Release of Information
('Consent', 'Release of Information', 'Authorization to release protected health information', 1,
 '[{
   "id": "section1",
   "title": "Release Authorization",
   "order": 1,
   "fields": [
     {"id": "release_to", "label": "Release Information To", "type": "text", "required": true, "order": 1},
     {"id": "purpose", "label": "Purpose of Release", "type": "textarea", "required": true, "order": 2},
     {"id": "information_types", "label": "Types of Information to Release", "type": "multiselect", "required": true, "order": 3, "options": ["Treatment Records", "Diagnosis", "Progress Notes", "Test Results", "Other"]}
   ]
 }]'::jsonb,
 true, true, false, 10, true, true, 'Administrative'),

-- Consent for Use of AI
('Consent', 'Consent for Use of Artificial Intelligence (AI)', 'Consent for AI-assisted documentation and treatment planning', 1,
 '[{
   "id": "section1",
   "title": "AI Usage Consent",
   "order": 1,
   "fields": [
     {"id": "ai_documentation", "label": "I consent to the use of AI for clinical documentation", "type": "checkbox", "required": true, "order": 1},
     {"id": "ai_understanding", "label": "I understand that AI is used as a tool to assist clinicians, not replace them", "type": "checkbox", "required": true, "order": 2},
     {"id": "data_privacy", "label": "I understand my data will be protected according to HIPAA guidelines", "type": "checkbox", "required": true, "order": 3}
   ]
 }]'::jsonb,
 true, true, false, 5, false, false, 'Administrative'),

-- Psychiatric Advance Directive Information Form
('Custom', 'Psychiatric Advance Directive Information Form', 'Information about psychiatric advance directives', 1,
 '[{
   "id": "section1",
   "title": "Advance Directive Information",
   "order": 1,
   "fields": [
     {"id": "has_directive", "label": "Do you have a psychiatric advance directive?", "type": "radio", "required": true, "order": 1, "options": ["Yes", "No"]},
     {"id": "location", "label": "If yes, where is it located?", "type": "text", "required": false, "order": 2},
     {"id": "preferences", "label": "Treatment Preferences", "type": "textarea", "required": false, "order": 3}
   ]
 }]'::jsonb,
 true, false, true, 10, false, false, 'Administrative');

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_portal_forms_shareable ON portal_form_templates(shareable_on_portal, is_active);
CREATE INDEX IF NOT EXISTS idx_portal_forms_access_level ON portal_form_templates(staff_access_level);