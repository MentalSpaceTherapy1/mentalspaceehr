import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { assessRisks } from "./assessRisks.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateNoteRequest {
  sessionTranscript?: string;
  freeTextInput?: string;
  noteType: string;
  noteFormat: string;
  clientId: string;
  appointmentId?: string;
  sessionId?: string; // Database session ID for fetching transcript
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      sessionTranscript,
      freeTextInput,
      noteType,
      noteFormat,
      clientId,
      appointmentId,
      sessionId,
    }: GenerateNoteRequest = await req.json();

    console.log(`Generating ${noteType} note in ${noteFormat} format`);

    // Get AI settings
    const { data: aiSettings } = await supabase
      .from("ai_note_settings")
      .select("*")
      .maybeSingle();

    if (!aiSettings || !aiSettings.enabled) {
      throw new Error("AI note generation is not enabled");
    }

    // Determine which API to use based on provider
    const useOpenAI = aiSettings.provider === 'openai';
    const apiKey = useOpenAI ? Deno.env.get("OPENAI_API_KEY") : lovableApiKey;
    const apiUrl = useOpenAI 
      ? "https://api.openai.com/v1/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions";

    if (!apiKey) {
      throw new Error(`${useOpenAI ? 'OpenAI' : 'Lovable AI'} API key not configured`);
    }

    // Get client information for context
    const { data: client } = await supabase
      .from("clients")
      .select("first_name, last_name, date_of_birth, diagnoses")
      .eq("id", clientId)
      .single();

    // Get note template (use limit(1) in case of duplicates)
    const { data: templates } = await supabase
      .from("note_templates")
      .select("*")
      .eq("note_type", noteType)
      .eq("note_format", noteFormat)
      .eq("is_default", true)
      .order("created_at", { ascending: false })
      .limit(1);

    const template = templates?.[0];

    if (!template) {
      throw new Error(`No template found for ${noteType} in ${noteFormat} format`);
    }

    const templateStructure = template.template_structure as any;
    const aiPrompts = template.ai_prompts as any;

    // Build system prompt for Progress Note SOAP format
    const systemPrompt = `You are a clinical documentation assistant for mental health professionals. 
Your role is to help generate accurate, professional clinical notes following HIPAA compliance and clinical best practices.

Client Context:
- Name: ${client?.first_name} ${client?.last_name}
- Age: ${client?.date_of_birth ? calculateAge(client.date_of_birth) : 'Unknown'}

Note Type: ${noteType}
Note Format: ${noteFormat}

CRITICAL INSTRUCTIONS:
1. Use professional, objective clinical language
2. Distinguish between observations and interpretations
3. Use appropriate terminology (e.g., "anxious" vs "anxiety disorder")
4. Flag any safety concerns clearly
5. Maintain clinical accuracy and avoid over-pathologizing
6. Return ONLY a valid JSON object (no markdown, no code blocks) with the EXACT structure below

REQUIRED JSON STRUCTURE for Progress Note SOAP:
{
  "subjective": {
    "presentingConcerns": "string - Main issues client reports",
    "moodReport": "string - Client's self-reported mood",
    "recentEvents": "string - Significant recent life events",
    "symptomsReported": ["array of symptoms client reports"],
    "symptomsImproved": ["array of symptoms that improved"],
    "symptomsWorsened": ["array of symptoms that worsened"],
    "symptomsUnchanged": ["array of symptoms that stayed the same"],
    "medicationAdherence": "string - Good/Fair/Poor/N/A",
    "medicationSideEffects": boolean,
    "sideEffectDetails": "string - if medicationSideEffects is true",
    "homeworkCompliance": "string - Completed/Partially/Not Completed/N/A",
    "homeworkReview": "string - Review of assigned homework",
    "lifeStressors": "string - Current stressors",
    "copingStrategies": "string - Coping methods used",
    "functionalImpairment": {
      "work": "string - None/Mild/Moderate/Severe/N/A",
      "school": "string - None/Mild/Moderate/Severe/N/A",
      "relationships": "string - None/Mild/Moderate/Severe",
      "selfCare": "string - None/Mild/Moderate/Severe",
      "social": "string - None/Mild/Moderate/Severe"
    }
  },
  "objective": {
    "behavioralObservations": {
      "appearance": "string - Physical presentation",
      "mood": "string - Observed mood",
      "affect": {
        "range": "string - Constricted/Full/Blunted/Flat",
        "appropriateness": "string - Appropriate/Inappropriate",
        "quality": "string - Euthymic/Dysphoric/Anxious/etc"
      },
      "behavior": "string - Observed behavior",
      "speech": "string - Rate, volume, tone",
      "thoughtProcess": "string - Linear/Tangential/Circumstantial/etc",
      "attention": "string - Intact/Impaired",
      "cooperation": "string - Cooperative/Guarded/Hostile",
      "insightJudgment": "string - Good/Fair/Poor"
    },
    "riskAssessment": {
      "suicidalIdeation": "string - Denied/Passive/Active/Intent/Plan",
      "suicidalDetails": "string - if not Denied",
      "homicidalIdeation": "string - Denied/Passive/Active/Intent/Plan",
      "homicidalDetails": "string - if not Denied",
      "selfHarm": "string - Denied/History/Recent/Current",
      "substanceUse": "string - Denied/Social/Problematic/Dependent",
      "overallRiskLevel": "string - Low/Moderate/High/Imminent",
      "interventions": "string - if risk level elevated"
    },
    "symptomsObserved": ["array of clinician-observed symptoms"],
    "progressObserved": "string - Observed progress"
  },
  "assessment": {
    "progressTowardGoals": {
      "overallProgress": "string - Excellent/Good/Fair/Poor/Regression",
      "goalProgress": [
        {
          "goalId": "string",
          "goalDescription": "string",
          "progress": "string - Met/Progress/No Progress/Regression",
          "details": "string"
        }
      ]
    },
    "currentDiagnoses": [
      {
        "icdCode": "string - ICD-10 code",
        "diagnosis": "string - Diagnosis name",
        "status": "string - Active/Provisional/Rule Out/Resolved"
      }
    ],
    "clinicalImpression": "string - Comprehensive synthesis of S+O data",
    "changesToTreatmentPlan": boolean,
    "changeDetails": "string - if changesToTreatmentPlan is true",
    "medicalNecessity": "string - Justification for continued treatment"
  },
  "plan": {
    "interventionsProvided": ["array of intervention types used"],
    "interventionDetails": "string - Detailed description of interventions",
    "therapeuticTechniques": ["array of specific techniques used"],
    "homework": {
      "assigned": boolean,
      "homeworkDetails": "string - if assigned"
    },
    "nextSteps": "string - Action items and goals",
    "medicationChanges": {
      "changesMade": boolean,
      "changeDetails": "string - if changes made",
      "newPrescriptions": ["array if applicable"],
      "discontinuedMedications": ["array if applicable"],
      "doseAdjustments": ["array if applicable"]
    },
    "referrals": {
      "referralMade": boolean,
      "referralDetails": "string - if referral made",
      "referralTo": "string - who/where",
      "referralReason": "string"
    },
    "nextAppointment": {
      "scheduled": boolean,
      "appointmentDate": "string - if scheduled",
      "appointmentType": "string",
      "frequency": "string"
    },
    "additionalPlanning": "string - Other planning notes"
  }
}

GENERATION GUIDELINES:
- Subjective: Focus on what the CLIENT says, reports, describes
- Objective: Focus on what YOU observe, measure, assess
- Assessment: Synthesize S+O to form clinical impression and evaluate progress
- Plan: Detail interventions used, homework assigned, and next steps
- Be thorough but concise
- Use clinical terminology appropriately
- Always assess safety/risk
- Return ONLY the JSON object, no additional text`;

    const userPrompt = sessionTranscript
      ? `Based on the following session transcript, generate a clinical note:\n\n${sessionTranscript}`
      : `Based on the following clinical information, generate a complete note:\n\n${freeTextInput}`;

    const startTime = Date.now();

    // Call AI API (Lovable AI or OpenAI)
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiSettings.model || (useOpenAI ? "gpt-5-2025-08-07" : "google/gemini-2.5-flash"),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        ...(useOpenAI ? { max_completion_tokens: 4000 } : { temperature: 0.3 }),
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${useOpenAI ? 'OpenAI' : 'Lovable AI'} error:`, response.status, errorText);
      throw new Error(`AI generation failed: ${response.statusText}`);
    }

    const aiResponse = await response.json();
    const processingTime = Date.now() - startTime;

    const generatedContent = JSON.parse(aiResponse.choices[0].message.content);

    // Enhanced risk assessment if enabled
    let riskFlags: string[] = [];
    let riskSeverity = 'none';
    let riskRationale = '';
    
    if (aiSettings.risk_assessment_enabled) {
      const riskAssessment = await assessRisksEnhanced(
        generatedContent, 
        sessionTranscript || freeTextInput || "",
        aiSettings.model
      );
      riskFlags = riskAssessment.flags;
      riskSeverity = riskAssessment.severity;
      riskRationale = riskAssessment.rationale;
    }

    // Calculate confidence score (simplified version)
    const confidenceScore = calculateConfidenceScore(aiResponse);

    // Log AI request for audit trail
    await supabase.from('ai_request_logs').insert({
      request_type: 'note_generation',
      model_used: aiSettings.model,
      input_length: (sessionTranscript || freeTextInput || "").length,
      output_length: JSON.stringify(generatedContent).length,
      processing_time_ms: processingTime,
      confidence_score: confidenceScore,
      success: true
    });

    const result = {
      success: true,
      content: generatedContent,
      riskFlags,
      riskSeverity,
      riskRationale,
      metadata: {
        ai_generated: true,
        ai_model_used: aiSettings.model,
        ai_confidence_score: confidenceScore,
        ai_processing_time_ms: processingTime,
        requires_review: confidenceScore < aiSettings.minimum_confidence_threshold,
      },
    };

    console.log(`Note generated successfully in ${processingTime}ms with confidence ${confidenceScore}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error generating note:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Enhanced AI-powered risk assessment with severity scoring
async function assessRisksEnhanced(content: any, inputText: string, model: string) {
  const allText = JSON.stringify(content) + ' ' + inputText;

  // Get AI settings to determine provider
  const { data: aiSettings } = await supabase
    .from("ai_note_settings")
    .select("provider")
    .maybeSingle();

  const useOpenAI = aiSettings?.provider === 'openai';
  const apiKey = useOpenAI ? Deno.env.get("OPENAI_API_KEY") : lovableApiKey;
  const apiUrl = useOpenAI 
    ? "https://api.openai.com/v1/chat/completions"
    : "https://ai.gateway.lovable.dev/v1/chat/completions";

  try {
    const aiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "You are a clinical risk assessment expert. Analyze clinical content for safety risks and assess severity."
          },
          {
            role: "user",
            content: `Analyze this clinical content for risks:\n\n${allText}\n\nIdentify risks and assess severity level.`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "assess_clinical_risks",
            description: "Assess clinical safety risks and determine severity",
            parameters: {
              type: "object",
              properties: {
                risks: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: ["suicidal_ideation", "homicidal_ideation", "self_harm", "abuse_disclosure", "substance_abuse", "psychosis", "manic_symptoms"]
                  }
                },
                severity: {
                  type: "string",
                  enum: ["none", "low", "medium", "high", "critical"]
                },
                rationale: {
                  type: "string"
                }
              },
              required: ["risks", "severity", "rationale"],
              additionalProperties: false
            }
          }
        }],
        ...(useOpenAI ? { max_completion_tokens: 500 } : {}),
        tool_choice: { type: "function", function: { name: "assess_clinical_risks" } }
      }),
    });

    if (aiResponse.ok) {
      const result = await aiResponse.json();
      const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
      
      if (toolCall) {
        const assessment = JSON.parse(toolCall.function.arguments);
        return {
          flags: assessment.risks || [],
          severity: assessment.severity || 'none',
          rationale: assessment.rationale || ''
        };
      }
    }
  } catch (error) {
    console.error("AI risk assessment error:", error);
  }

  // Fallback to basic assessment
  const basicRisks = await assessRisks(content, inputText);
  return {
    flags: basicRisks,
    severity: basicRisks.length > 0 ? 'low' : 'none',
    rationale: 'Basic keyword-based assessment (AI unavailable)'
  };
}

function calculateConfidenceScore(aiResponse: any): number {
  // Simplified confidence calculation
  // In production, this would be more sophisticated
  const finishReason = aiResponse.choices[0].finish_reason;
  
  if (finishReason === "stop") {
    return 0.85; // High confidence for complete responses
  } else if (finishReason === "length") {
    return 0.70; // Medium confidence if truncated
  }
  
  return 0.60; // Lower confidence for other cases
}
