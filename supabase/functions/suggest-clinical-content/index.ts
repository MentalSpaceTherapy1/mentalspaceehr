import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SuggestionRequest {
  content: string;
  suggestionType: 'diagnoses' | 'interventions' | 'both';
  clientId?: string;
  noteType?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const { content, suggestionType, clientId, noteType }: SuggestionRequest = await req.json();

    console.log(`Generating ${suggestionType} suggestions`);

    // Get AI settings
    const { data: aiSettings } = await supabase
      .from('ai_note_settings')
      .select('*')
      .single();

    if (!aiSettings?.enabled || !aiSettings?.suggestion_engine_enabled) {
      return new Response(
        JSON.stringify({ error: "AI suggestion engine is not enabled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine which API to use
    const useOpenAI = aiSettings.provider === 'openai';
    const apiKey = useOpenAI ? Deno.env.get("OPENAI_API_KEY") : LOVABLE_API_KEY;
    const apiUrl = useOpenAI 
      ? "https://api.openai.com/v1/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions";

    if (!apiKey) {
      throw new Error(`${useOpenAI ? 'OpenAI' : 'Lovable AI'} API key not configured`);
    }

    // Get client context if provided
    let clientContext = '';
    if (clientId) {
      const { data: client } = await supabase
        .from('clients')
        .select('date_of_birth, gender')
        .eq('id', clientId)
        .single();
      
      if (client) {
        const age = calculateAge(client.date_of_birth);
        clientContext = `Client is ${age} years old, gender: ${client.gender || 'not specified'}.`;
      }
    }

    // Build prompts based on suggestion type
    let systemPrompt = '';
    let userPrompt = '';

    if (suggestionType === 'diagnoses' || suggestionType === 'both') {
      systemPrompt += `You are a clinical assistant helping with ICD-10 diagnosis suggestions based on DSM-5-TR criteria. ${clientContext}\n\n`;
      systemPrompt += `Based on the clinical content provided, suggest 3-5 relevant ICD-10 diagnoses that align with DSM-5-TR criteria. Consider symptom patterns, duration, severity, and functional impairment. Provide both the ICD-10 code (e.g., F41.1) and the full diagnosis name. Provide clinical rationale for each suggestion.\n\n`;
      
      userPrompt += `Clinical Content:\n${content}\n\nSuggest appropriate ICD-10 diagnoses.`;
    }

    if (suggestionType === 'interventions' || suggestionType === 'both') {
      systemPrompt += `You are a clinical assistant helping with evidence-based intervention suggestions.\n\n`;
      systemPrompt += `Based on the clinical content and any suggested diagnoses, recommend 5-7 therapeutic interventions that are evidence-based and appropriate for the presentation. Include specific techniques, skills, or approaches.\n\n`;
      
      userPrompt += `\n\nSuggest evidence-based therapeutic interventions.`;
    }

    // Define tools for structured output
    const tools = [];

    if (suggestionType === 'diagnoses' || suggestionType === 'both') {
      tools.push({
        type: "function",
        function: {
          name: "suggest_diagnoses",
          description: "Return ICD-10 diagnosis suggestions based on DSM-5-TR criteria",
          parameters: {
            type: "object",
            properties: {
              diagnoses: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    code: { type: "string", description: "ICD-10 code (e.g., F41.1, F32.1)" },
                    description: { type: "string", description: "Full diagnosis description" },
                    type: { type: "string", description: "Diagnosis type", enum: ["Principal", "Secondary", "Rule Out", "Provisional"] },
                    specifiers: { type: "string", description: "Any relevant specifiers (e.g., 'Moderate', 'With anxious distress')" },
                    rationale: { type: "string", description: "Clinical rationale for this diagnosis suggestion" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  },
                  required: ["code", "description", "type", "rationale", "confidence"],
                  additionalProperties: false
                }
              }
            },
            required: ["diagnoses"],
            additionalProperties: false
          }
        }
      });
    }

    if (suggestionType === 'interventions' || suggestionType === 'both') {
      tools.push({
        type: "function",
        function: {
          name: "suggest_interventions",
          description: "Return evidence-based intervention suggestions",
          parameters: {
            type: "object",
            properties: {
              interventions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Intervention name" },
                    description: { type: "string", description: "How to apply this intervention" },
                    evidence_level: { type: "string", enum: ["strong", "moderate", "emerging"] },
                    modality: { type: "string", description: "Treatment modality (e.g., CBT, DBT, MI)" }
                  },
                  required: ["name", "description", "evidence_level", "modality"],
                  additionalProperties: false
                }
              }
            },
            required: ["interventions"],
            additionalProperties: false
          }
        }
      });
    }

    // Call AI API
    const aiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiSettings.model || (useOpenAI ? "gpt-5-2025-08-07" : "google/gemini-2.5-flash"),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools,
        ...(useOpenAI ? { max_completion_tokens: 2000 } : {}),
        tool_choice: tools.length === 1 ? { type: "function", function: { name: tools[0].function.name } } : "auto"
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`${useOpenAI ? 'OpenAI' : 'Lovable AI'} error:`, aiResponse.status, errorText);
      
      // Log the error
      await supabase.from('ai_request_logs').insert({
        user_id: req.headers.get('authorization')?.split('Bearer ')[1] ? null : null,
        request_type: 'suggestion',
        model_used: aiSettings.model,
        input_length: content.length,
        processing_time_ms: Date.now() - startTime,
        success: false,
        error_message: `AI API error: ${aiResponse.status}`
      });

      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await aiResponse.json();
    const processingTime = Date.now() - startTime;

    // Extract tool calls
    const toolCalls = aiResult.choices?.[0]?.message?.tool_calls || [];
    
    const suggestions: any = {};
    
    for (const toolCall of toolCalls) {
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      
      if (functionName === 'suggest_diagnoses') {
        suggestions.diagnoses = args.diagnoses;
      } else if (functionName === 'suggest_interventions') {
        suggestions.interventions = args.interventions;
      }
    }

    // Log the request
    await supabase.from('ai_request_logs').insert({
      request_type: 'suggestion',
      model_used: aiSettings.model,
      input_length: content.length,
      output_length: JSON.stringify(suggestions).length,
      processing_time_ms: processingTime,
      success: true
    });

    console.log(`Suggestions generated in ${processingTime}ms`);

    return new Response(
      JSON.stringify({
        suggestions,
        processingTime,
        model: aiSettings.model
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
