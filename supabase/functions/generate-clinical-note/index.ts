import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
  sessionId?: string;
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

    // Get client information for context
    const { data: client } = await supabase
      .from("clients")
      .select("first_name, last_name, date_of_birth, diagnoses")
      .eq("id", clientId)
      .single();

    // Get note template
    const { data: template } = await supabase
      .from("note_templates")
      .select("*")
      .eq("note_type", noteType)
      .eq("note_format", noteFormat)
      .eq("is_default", true)
      .maybeSingle();

    if (!template) {
      throw new Error(`No template found for ${noteType} in ${noteFormat} format`);
    }

    const templateStructure = template.template_structure as any;
    const aiPrompts = template.ai_prompts as any;

    // Build system prompt
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
6. Return a JSON object with keys matching the template sections

Template Structure:
${JSON.stringify(templateStructure.sections.map((s: any) => ({ key: s.key, label: s.label })), null, 2)}

Section Guidelines:
${JSON.stringify(aiPrompts, null, 2)}`;

    const userPrompt = sessionTranscript
      ? `Based on the following session transcript, generate a clinical note:\n\n${sessionTranscript}`
      : `Based on the following clinical information, generate a complete note:\n\n${freeTextInput}`;

    const startTime = Date.now();

    // Call Lovable AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiSettings.model || "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3, // Lower temperature for more consistent clinical language
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      throw new Error(`AI generation failed: ${response.statusText}`);
    }

    const aiResponse = await response.json();
    const processingTime = Date.now() - startTime;

    const generatedContent = JSON.parse(aiResponse.choices[0].message.content);

    // Risk assessment if enabled
    let riskFlags: string[] = [];
    if (aiSettings.risk_assessment_enabled) {
      riskFlags = await assessRisks(generatedContent, sessionTranscript || freeTextInput || "");
    }

    // Calculate confidence score (simplified version)
    const confidenceScore = calculateConfidenceScore(aiResponse);

    const result = {
      success: true,
      content: generatedContent,
      riskFlags,
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

async function assessRisks(content: any, inputText: string): Promise<string[]> {
  const risks: string[] = [];
  const fullText = JSON.stringify(content) + " " + inputText;
  const lowerText = fullText.toLowerCase();

  // Simple keyword-based risk detection
  const riskPatterns = {
    suicidal_ideation: ["suicidal", "kill myself", "end my life", "want to die", "not worth living"],
    homicidal_ideation: ["kill someone", "hurt someone", "homicidal", "violent thoughts towards"],
    self_harm: ["cut myself", "self-harm", "self harm", "cutting"],
    substance_abuse: ["drinking heavily", "using drugs", "substance abuse", "addiction"],
    abuse_disclosure: ["being abused", "abuse at home", "hitting me", "sexual abuse"],
  };

  for (const [risk, patterns] of Object.entries(riskPatterns)) {
    if (patterns.some((pattern) => lowerText.includes(pattern))) {
      risks.push(risk);
    }
  }

  return risks;
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
