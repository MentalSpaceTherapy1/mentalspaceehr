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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const { sectionType, context, clientId, existingData } = await req.json();

    // Get AI settings
    const { data: aiSettings } = await supabase
      .from('ai_note_settings')
      .select('*')
      .single();

    if (!aiSettings?.enabled) {
      return new Response(
        JSON.stringify({ error: "AI is not enabled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const useOpenAI = aiSettings.provider === 'openai';
    const apiKey = useOpenAI ? Deno.env.get("OPENAI_API_KEY") : LOVABLE_API_KEY;
    const apiUrl = useOpenAI 
      ? "https://api.openai.com/v1/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions";

    if (!apiKey) {
      throw new Error(`${useOpenAI ? 'OpenAI' : 'Lovable AI'} API key not configured`);
    }

    // Get client demographics if provided
    let clientContext = '';
    if (clientId) {
      const { data: client } = await supabase
        .from('clients')
        .select('date_of_birth, gender, first_name, last_name')
        .eq('id', clientId)
        .single();
      
      if (client) {
        const age = calculateAge(client.date_of_birth);
        clientContext = `Client: ${client.first_name} ${client.last_name}, Age: ${age}, Gender: ${client.gender || 'not specified'}`;
      }
    }

    // Build prompts based on section type
    const promptData = buildSectionPrompt(sectionType, clientContext);

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
          { role: "system", content: promptData.systemPrompt },
          { role: "user", content: `Context: ${context}\n\nExisting Data: ${JSON.stringify(existingData || {})}\n\nGenerate appropriate clinical content for this ${sectionType} section.` }
        ],
        tools: promptData.tools,
        ...(useOpenAI ? { max_completion_tokens: 4000 } : {}),
        tool_choice: promptData.toolChoice
      }),
    });

    if (!aiResponse.ok) {
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await aiResponse.json();
    const processingTime = Date.now() - startTime;
    
    // Extract tool call
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const generatedContent = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ content: generatedContent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Section generation failed' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildSectionPrompt(sectionType: string, clientContext: string) {
  let systemPrompt = `You are a clinical assistant helping generate intake assessment content. ${clientContext}\n\n`;
  let tools: any[] = [];
  let toolChoice: any;

  switch (sectionType) {
    case 'presenting':
      systemPrompt += `Generate a comprehensive presenting problem section including chief complaint, history of presenting problem, symptom details, and previous treatment attempts. Use professional clinical language.`;
      tools = [{
        type: "function",
        function: {
          name: "generate_presenting",
          description: "Generate presenting problem content",
          parameters: {
            type: "object",
            properties: {
              chiefComplaint: { type: "string", description: "Brief statement of primary concern" },
              historyOfPresentingProblem: { type: "string", description: "Detailed narrative" },
              symptomOnset: { type: "string", description: "When symptoms started" },
              symptomDuration: { type: "string", description: "How long symptoms have persisted" },
              precipitatingFactors: { type: "string", description: "Triggering events" },
              exacerbatingFactors: { type: "array", items: { type: "string" }, description: "What makes it worse" },
              alleviatingFactors: { type: "array", items: { type: "string" }, description: "What helps" }
            },
            required: ["chiefComplaint", "historyOfPresentingProblem"],
            additionalProperties: false
          }
        }
      }];
      toolChoice = { type: "function", function: { name: "generate_presenting" } };
      break;

    case 'mse':
      systemPrompt += `Generate a comprehensive Mental Status Examination. Include all standard MSE components with appropriate clinical observations.`;
      tools = [{
        type: "function",
        function: {
          name: "generate_mse",
          description: "Generate Mental Status Exam content",
          parameters: {
            type: "object",
            properties: {
              appearance: {
                type: "object",
                properties: {
                  grooming: { type: "string", enum: ["Well-groomed", "Disheveled", "Unkempt", "Appropriate"] },
                  hygiene: { type: "string", enum: ["Good", "Fair", "Poor"] },
                  dress: { type: "string", enum: ["Appropriate", "Inappropriate", "Unusual"] },
                  physicalCondition: { type: "string" }
                }
              },
              behavior: {
                type: "object",
                properties: {
                  eyeContact: { type: "string", enum: ["Good", "Minimal", "Excessive", "Avoidant"] },
                  motorActivity: { type: "string", enum: ["Normal", "Restless", "Agitated", "Retarded", "Hyperactive"] },
                  cooperation: { type: "string", enum: ["Cooperative", "Guarded", "Uncooperative", "Resistant"] },
                  rapport: { type: "string", enum: ["Good", "Fair", "Poor", "Difficult to establish"] }
                }
              },
              speech: {
                type: "object",
                properties: {
                  rate: { type: "string", enum: ["Normal", "Slow", "Rapid", "Pressured"] },
                  volume: { type: "string", enum: ["Normal", "Loud", "Soft", "Mute"] },
                  fluency: { type: "string", enum: ["Fluent", "Dysfluent", "Stuttering"] },
                  articulation: { type: "string", enum: ["Clear", "Slurred", "Mumbled"] },
                  spontaneity: { type: "string", enum: ["Spontaneous", "Prompted", "Minimal"] }
                }
              },
              mood: { type: "string" },
              affect: {
                type: "object",
                properties: {
                  range: { type: "string", enum: ["Full", "Restricted", "Blunted", "Flat"] },
                  appropriateness: { type: "string", enum: ["Appropriate", "Inappropriate"] },
                  mobility: { type: "string", enum: ["Mobile", "Fixed"] },
                  quality: { type: "string", enum: ["Euthymic", "Depressed", "Anxious", "Irritable", "Euphoric", "Angry"] }
                }
              }
            },
            required: ["appearance", "behavior", "speech", "mood", "affect"],
            additionalProperties: false
          }
        }
      }];
      toolChoice = { type: "function", function: { name: "generate_mse" } };
      break;

    case 'safety':
      systemPrompt += `Generate a comprehensive safety assessment. Be conservative and thorough in assessing risks.`;
      tools = [{
        type: "function",
        function: {
          name: "generate_safety",
          description: "Generate safety assessment content",
          parameters: {
            type: "object",
            properties: {
              suicideRisk: {
                type: "object",
                properties: {
                  currentIdeation: { type: "boolean" },
                  frequency: { type: "string", enum: ["Rare", "Occasional", "Frequent", "Constant"] },
                  intensity: { type: "string", enum: ["Mild", "Moderate", "Severe"] },
                  riskLevel: { type: "string", enum: ["Low", "Moderate", "High", "Imminent"] },
                  plan: { type: "boolean" },
                  planDetails: { type: "string" },
                  intent: { type: "boolean" },
                  interventions: { type: "array", items: { type: "string" } }
                }
              },
              homicideRisk: {
                type: "object",
                properties: {
                  currentIdeation: { type: "boolean" },
                  riskLevel: { type: "string" },
                  dutyToWarnNotified: { type: "boolean" }
                }
              }
            },
            required: ["suicideRisk"],
            additionalProperties: false
          }
        }
      }];
      toolChoice = { type: "function", function: { name: "generate_safety" } };
      break;

    case 'treatment':
      systemPrompt += `Generate treatment recommendations including frequency, modality, therapeutic approaches, and initial treatment goals based on assessment data.`;
      tools = [{
        type: "function",
        function: {
          name: "generate_treatment",
          description: "Generate treatment recommendations",
          parameters: {
            type: "object",
            properties: {
              recommendedFrequency: { type: "string", enum: ["Weekly", "Biweekly", "Monthly", "As Needed", "Other"] },
              recommendedModality: { type: "string", enum: ["Individual", "Couples", "Family", "Group", "Combination"] },
              therapeuticApproach: { type: "array", items: { type: "string" }, description: "e.g. CBT, DBT, MI" },
              medicationRecommendation: {
                type: "object",
                properties: {
                  recommended: { type: "boolean" },
                  referralMade: { type: "boolean" },
                  referralTo: { type: "string" }
                }
              },
              additionalRecommendations: { type: "array", items: { type: "string" } },
              initialGoals: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    goalDescription: { type: "string" },
                    targetDate: { type: "string" },
                    measurableOutcome: { type: "string" }
                  }
                }
              }
            },
            required: ["recommendedFrequency", "recommendedModality"],
            additionalProperties: false
          }
        }
      }];
      toolChoice = { type: "function", function: { name: "generate_treatment" } };
      break;

    case 'current_symptoms':
      systemPrompt += `Generate current symptoms assessment based on clinical presentation.`;
      tools = [{
        type: "function",
        function: {
          name: "generate_symptoms",
          description: "Generate current symptoms",
          parameters: {
            type: "object",
            properties: {
              depression: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
              anxiety: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string" } } },
              irritability: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string" } } },
              insomnia: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string" } } },
              concentrationDifficulty: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string" } } }
            },
            additionalProperties: true
          }
        }
      }];
      toolChoice = { type: "function", function: { name: "generate_symptoms" } };
      break;

    case 'history':
      systemPrompt += `Generate comprehensive history including developmental, family, medical, substance use, and social history.`;
      tools = [{
        type: "function",
        function: {
          name: "generate_history",
          description: "Generate comprehensive history",
          parameters: {
            type: "object",
            properties: {
              developmentalHistory: { type: "object", description: "Developmental milestones and history" },
              familyHistory: { type: "object", description: "Family mental health and medical history" },
              medicalHistory: { type: "object", description: "Current and past medical conditions" },
              substanceUseHistory: { type: "object", description: "Substance use patterns" },
              socialHistory: { type: "object", description: "Social and occupational functioning" }
            },
            additionalProperties: false
          }
        }
      }];
      toolChoice = { type: "function", function: { name: "generate_history" } };
      break;

    case 'diagnosis':
      systemPrompt += `Generate diagnostic formulation with ICD-10 codes and clinical impression.`;
      tools = [{
        type: "function",
        function: {
          name: "generate_diagnosis",
          description: "Generate diagnostic formulation",
          parameters: {
            type: "object",
            properties: {
              diagnoses: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    icdCode: { type: "string" },
                    diagnosis: { type: "string" },
                    type: { type: "string", enum: ["Principal", "Secondary", "Rule Out", "Provisional"] },
                    specifiers: { type: "string" }
                  }
                }
              },
              clinicianImpression: { type: "string" },
              strengthsAndResources: { type: "array", items: { type: "string" } }
            },
            additionalProperties: false
          }
        }
      }];
      toolChoice = { type: "function", function: { name: "generate_diagnosis" } };
      break;

    default:
      throw new Error(`Unknown section type: ${sectionType}`);
  }

  return { systemPrompt, tools, toolChoice };
}

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
