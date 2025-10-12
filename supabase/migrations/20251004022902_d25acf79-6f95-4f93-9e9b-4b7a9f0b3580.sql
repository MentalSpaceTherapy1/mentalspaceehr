-- Insert missing note templates with proper type casting
-- Temporarily make created_by nullable, insert seed data, then make it NOT NULL again
ALTER TABLE public.note_templates ALTER COLUMN created_by DROP NOT NULL;

INSERT INTO public.note_templates (name, note_type, note_format, template_structure, ai_prompts, is_default, is_active)
SELECT
  name, note_type::note_type, note_format::note_format, template_structure::jsonb, ai_prompts::jsonb, is_default, is_active
FROM (VALUES
  ('Standard Intake Assessment', 'intake_assessment', 'SOAP', 
   '{"subjective": {"label": "Presenting Problem & History", "placeholder": "Chief complaint, history, psychiatric/medical/family/social history"}, "objective": {"label": "Mental Status Exam", "placeholder": "Appearance, behavior, speech, mood, affect, thought process/content"}, "assessment": {"label": "Clinical Impressions", "placeholder": "Diagnostic impressions, risk assessment, strengths"}, "plan": {"label": "Treatment Recommendations", "placeholder": "Goals, modality, frequency, referrals"}}',
   '{"systemPrompt": "Generate intake assessment with comprehensive biopsychosocial assessment and risk evaluation.", "sectionPrompts": {"subjective": "Document presenting problem and relevant history", "objective": "Complete mental status examination", "assessment": "Clinical impressions and risk assessment", "plan": "Treatment recommendations"}}',
   true, true),
  
  ('Psychiatric Evaluation', 'psychiatric_evaluation', 'SOAP',
   '{"subjective": {"label": "Chief Complaint & History", "placeholder": "Psychiatric symptoms, medication history"}, "objective": {"label": "Mental Status", "placeholder": "Mental status exam, vital signs"}, "assessment": {"label": "Psychiatric Diagnosis", "placeholder": "DSM-5 diagnoses, differential diagnoses"}, "plan": {"label": "Medication Plan", "placeholder": "Medications, lab work, follow-up"}}',
   '{"systemPrompt": "Generate psychiatric evaluation focused on medication management.", "sectionPrompts": {"subjective": "Document symptoms and medication history", "objective": "Mental status examination", "assessment": "DSM-5 diagnoses", "plan": "Medication recommendations"}}',
   true, true),
  
  ('Crisis Assessment', 'crisis_assessment', 'DAP',
   '{"data": {"label": "Crisis Presentation", "placeholder": "Presenting crisis, timeline, triggers"}, "assessment": {"label": "Risk Assessment", "placeholder": "Suicide/homicide risk, protective factors"}, "plan": {"label": "Crisis Plan", "placeholder": "Interventions, safety plan, resources"}}',
   '{"systemPrompt": "Generate crisis assessment focused on immediate safety.", "sectionPrompts": {"data": "Document crisis and risk factors", "assessment": "Assess level of risk", "plan": "Crisis intervention and safety plan"}}',
   true, true),
  
  ('Discharge Summary', 'discharge_summary', 'Narrative',
   '{"content": {"label": "Discharge Summary", "placeholder": "Admission date, treatment provided, progress, diagnoses, aftercare"}}',
   '{"systemPrompt": "Generate comprehensive discharge summary.", "sectionPrompts": {"content": "Include admission, treatment, progress, aftercare plan"}}',
   true, true),
  
  ('Treatment Plan Update', 'treatment_plan', 'SOAP',
   '{"subjective": {"label": "Client Progress Report", "placeholder": "Client perspective on progress"}, "objective": {"label": "Clinical Observations", "placeholder": "Treatment engagement, goal progress"}, "assessment": {"label": "Treatment Progress", "placeholder": "Goal progress review"}, "plan": {"label": "Updated Goals", "placeholder": "Updated goals and interventions"}}',
   '{"systemPrompt": "Generate treatment plan update focused on measurable progress.", "sectionPrompts": {"subjective": "Client-reported progress", "objective": "Observable progress", "assess": "Evaluate goals", "plan": "Update treatment plan"}}',
   true, true)
) AS v(name, note_type, note_format, template_structure, ai_prompts, is_default, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM public.note_templates 
  WHERE note_templates.note_type = v.note_type::note_type
    AND note_templates.note_format = v.note_format::note_format
);