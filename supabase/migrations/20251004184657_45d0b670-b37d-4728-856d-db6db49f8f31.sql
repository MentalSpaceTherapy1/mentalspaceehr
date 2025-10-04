-- Insert a template for Progress Note (SOAP format)
INSERT INTO public.note_templates (
  note_type,
  note_format,
  name,
  is_default,
  is_active,
  template_structure,
  ai_prompts,
  created_by
) VALUES (
  'progress_note'::note_type,
  'SOAP'::note_format,
  'Progress Note - SOAP Format',
  true,
  true,
  '{
    "sections": [
      {
        "key": "subjective",
        "label": "Subjective",
        "fields": [
          "presentingConcerns",
          "moodReport",
          "recentEvents",
          "symptomsReported",
          "symptomsImproved",
          "symptomsWorsened",
          "symptomsUnchanged",
          "medicationAdherence",
          "homeworkCompliance",
          "lifeStressors",
          "copingStrategies",
          "functionalImpairment"
        ]
      },
      {
        "key": "objective",
        "label": "Objective",
        "fields": [
          "behavioralObservations",
          "riskAssessment",
          "symptomsObserved",
          "progressObserved"
        ]
      },
      {
        "key": "assessment",
        "label": "Assessment",
        "fields": [
          "progressTowardGoals",
          "currentDiagnoses",
          "clinicalImpression",
          "medicalNecessity"
        ]
      },
      {
        "key": "plan",
        "label": "Plan",
        "fields": [
          "interventionsProvided",
          "interventionDetails",
          "therapeuticTechniques",
          "homework",
          "nextSteps",
          "nextAppointment"
        ]
      }
    ]
  }'::jsonb,
  '{
    "subjective": {
      "prompt": "Extract and organize the client''s subjective report including: presenting concerns, mood report, symptoms (reported, improved, worsened, unchanged), medication adherence, homework compliance, life stressors, coping strategies, and functional impairment across work, relationships, self-care, and social domains. Use the client''s own words when possible."
    },
    "objective": {
      "prompt": "Document clinical observations including: appearance, mood, affect (range, appropriateness, quality), behavior, speech, thought process, attention, cooperation, insight and judgment. CRITICAL: Perform thorough risk assessment for suicidal ideation, homicidal ideation, self-harm, and substance use. Assign overall risk level (Low/Moderate/High) and document any interventions."
    },
    "assessment": {
      "prompt": "Provide clinical assessment including: progress toward treatment goals (rate each goal), current diagnoses with status, comprehensive clinical impression synthesizing subjective and objective data, and clear medical necessity justification for continued treatment."
    },
    "plan": {
      "prompt": "Document treatment plan including: specific interventions provided during session, therapeutic techniques used, homework assignments (if any), next steps for treatment, medication changes (if any), referrals made (if any), and next appointment details."
    }
  }'::jsonb,
  (SELECT id FROM auth.users LIMIT 1)
)
ON CONFLICT DO NOTHING;