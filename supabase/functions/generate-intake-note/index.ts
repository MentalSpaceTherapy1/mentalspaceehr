import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, freeTextInput, existingData } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    // Fetch AI settings to determine provider
    const { data: aiSettings } = await supabaseClient
      .from('ai_note_settings')
      .select('*')
      .maybeSingle();

    const useOpenAI = aiSettings?.provider === 'openai';
    const apiKey = useOpenAI ? Deno.env.get('OPENAI_API_KEY') : Deno.env.get('LOVABLE_API_KEY');
    const apiUrl = useOpenAI 
      ? 'https://api.openai.com/v1/chat/completions'
      : 'https://ai.gateway.lovable.dev/v1/chat/completions';
    const model = aiSettings?.model || (useOpenAI ? 'gpt-5-2025-08-07' : 'google/gemini-2.5-flash');

    if (!apiKey) {
      throw new Error(`${useOpenAI ? 'OPENAI' : 'LOVABLE'}_API_KEY not configured`);
    }

    // Fetch client data
    const { data: client, error: clientError } = await supabaseClient
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError) throw clientError;

    // Build context from client data
    const clientContext = `
Client Information:
- Name: ${client.first_name} ${client.last_name}
- Age: ${new Date().getFullYear() - new Date(client.date_of_birth).getFullYear()}
- Gender: ${client.gender || 'Not specified'}
- DOB: ${client.date_of_birth}
`;

    const systemPrompt = `You are an expert clinical psychologist specializing in comprehensive psychiatric intake assessments. Generate detailed, professional clinical content following DSM-5-TR criteria and best practices in mental health documentation.

Use clinical terminology, evidence-based observations, and realistic details appropriate for a thorough intake evaluation.`;

    const userPrompt = `Based on the following information, generate a complete intake assessment:\n\n${clientContext}\n\nClinician's Notes:\n${freeTextInput}\n\nGenerate comprehensive clinical content for all sections of the intake assessment. Return ONLY valid JSON, no other text.`;

    // Define comprehensive tool schema for structured output
    const tools = [{
      type: "function",
      function: {
        name: "generate_intake_assessment",
        description: "Generate a complete psychiatric intake assessment with all clinical sections",
        parameters: {
          type: "object",
          properties: {
            chiefComplaint: { type: "string", description: "Primary reason for seeking treatment" },
            historyOfPresentingProblem: { type: "string", description: "Detailed narrative of presenting concerns" },
            currentSymptoms: {
              type: "object",
              description: "Current symptom inventory with severity ratings",
              properties: {
                depression: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                anxiety: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                irritability: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                hopelessness: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                worthlessness: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                guilt: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                anhedonia: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                fatigue: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                sleepDisturbance: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                appetiteChanges: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                concentrationDifficulty: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                psychomotorChanges: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                panicAttacks: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                worryRumination: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                socialAnxiety: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                avoidanceBehavior: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                flashbacks: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                nightmares: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                hypervigilance: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                emotionalNumbing: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                moodSwings: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                impulsivity: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                agitation: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                paranoia: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                dissociation: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                hallucinationsAuditory: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                hallucinationsVisual: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                delusionalThinking: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                disorganizedThinking: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                obsessions: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                compulsions: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                attentionDifficulty: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } },
                hyperactivity: { type: "object", properties: { present: { type: "boolean" }, severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] } } }
              }
            },
            mentalStatusExam: {
              type: "object",
              properties: {
                appearance: { type: "string" },
                behavior: { type: "string" },
                speech: { type: "string" },
                mood: { type: "string" },
                affect: { type: "string" },
                thoughtProcess: { type: "string" },
                thoughtContent: { type: "string" },
                perceptions: { type: "string" },
                cognition: { type: "string" },
                insight: { type: "string" },
                judgment: { type: "string" }
              },
              required: ["appearance", "behavior", "speech", "mood", "affect", "thoughtProcess", "thoughtContent", "perceptions", "cognition", "insight", "judgment"]
            },
            safetyAssessment: {
              type: "object",
              properties: {
                suicide: {
                  type: "object",
                  properties: {
                    currentIdeation: { type: "boolean" },
                    frequency: { type: "string" },
                    intensity: { type: "string" },
                    plan: { type: "boolean" },
                    planDetails: { type: "string" },
                    intent: { type: "boolean" },
                    means: { type: "boolean" },
                    meansDetails: { type: "string" },
                    pastAttempts: { type: "boolean" },
                    attemptDetails: { type: "string" },
                    protectiveFactors: { type: "string" },
                    riskLevel: { type: "string", enum: ["Low", "Medium", "High"] }
                  }
                },
                homicide: {
                  type: "object",
                  properties: {
                    currentIdeation: { type: "boolean" },
                    targetIdentified: { type: "boolean" },
                    plan: { type: "boolean" },
                    intent: { type: "boolean" },
                    means: { type: "boolean" },
                    riskLevel: { type: "string", enum: ["Low", "Medium", "High"] }
                  }
                },
                selfHarm: {
                  type: "object",
                  properties: {
                    currentBehaviors: { type: "boolean" },
                    frequency: { type: "string" },
                    methods: { type: "string" },
                    functions: { type: "string" },
                    riskLevel: { type: "string", enum: ["Low", "Medium", "High"] }
                  }
                }
              }
            },
            developmentalHistory: {
              type: "object",
              properties: {
                prenatal: {
                  type: "object",
                  properties: {
                    plannedPregnancy: { type: "boolean" },
                    maternalAge: { type: "number" },
                    complications: { type: "string" },
                    substanceUse: { type: "string" }
                  }
                },
                birth: {
                  type: "object",
                  properties: {
                    deliveryType: { type: "string" },
                    birthWeight: { type: "string" },
                    apgarScores: { type: "string" },
                    complications: { type: "string" },
                    neonatalComplications: { type: "string" }
                  }
                },
                earlyDevelopment: {
                  type: "object",
                  properties: {
                    milestoneDelays: { type: "boolean" },
                    delayDetails: { type: "string" },
                    earlyInterventions: { type: "string" }
                  }
                }
              }
            },
            familyHistory: {
              type: "object",
              properties: {
                mentalHealthHistory: {
                  type: "object",
                  properties: {
                    hasFamilyHistory: { type: "boolean" },
                    relatives: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          relationship: { type: "string" },
                          conditions: { type: "array", items: { type: "string" } },
                          treatmentHistory: { type: "string" },
                          hospitalizations: { type: "boolean" },
                          completedSuicide: { type: "boolean" },
                          substanceAbuse: { type: "boolean" }
                        }
                      }
                    }
                  }
                },
                medicalHistory: {
                  type: "object",
                  properties: {
                    significantConditions: { type: "string" }
                  }
                },
                familyDynamics: { type: "string" },
                childhoodEnvironment: { type: "string" },
                traumaHistory: { type: "boolean" },
                traumaDetails: { type: "string" }
              }
            },
            medicalHistory: {
              type: "object",
              properties: {
                currentMedicalConditions: { type: "array", items: { type: "string" } },
                pastMedicalConditions: { type: "array", items: { type: "string" } },
                surgeries: { type: "array", items: { type: "string" } },
                allergies: {
                  type: "object",
                  properties: {
                    medications: { type: "array", items: { type: "string" } },
                    environmental: { type: "array", items: { type: "string" } },
                    food: { type: "array", items: { type: "string" } }
                  }
                },
                currentMedications: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      dosage: { type: "string" },
                      frequency: { type: "string" },
                      prescribedFor: { type: "string" },
                      prescriber: { type: "string" }
                    }
                  }
                },
                lastPhysicalExam: { type: "string" },
                primaryCarePhysician: { type: "string" }
              }
            },
            substanceUseHistory: {
              type: "object",
              properties: {
                alcohol: {
                  type: "object",
                  properties: {
                    current: { type: "boolean" },
                    frequency: { type: "string" },
                    amount: { type: "string" },
                    ageOfFirstUse: { type: "number" },
                    problemsRelated: { type: "boolean" },
                    problemDetails: { type: "string" }
                  }
                },
                tobacco: {
                  type: "object",
                  properties: {
                    current: { type: "boolean" },
                    type: { type: "string" },
                    packsPerDay: { type: "string" },
                    yearsOfUse: { type: "number" }
                  }
                },
                cannabis: {
                  type: "object",
                  properties: {
                    current: { type: "boolean" },
                    frequency: { type: "string" },
                    ageOfFirstUse: { type: "number" }
                  }
                },
                otherSubstances: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      substance: { type: "string" },
                      current: { type: "boolean" },
                      frequency: { type: "string" },
                      ageOfFirstUse: { type: "number" },
                      lastUse: { type: "string" },
                      routeOfAdministration: { type: "string" }
                    }
                  }
                },
                previousTreatment: { type: "boolean" },
                treatmentHistory: { type: "string" }
              }
            },
            socialHistory: {
              type: "object",
              properties: {
                currentLivingSituation: { type: "string" },
                maritalStatus: { type: "string" },
                children: { type: "boolean" },
                childrenDetails: { type: "string" },
                educationLevel: { type: "string" },
                employmentStatus: { type: "string" },
                occupationHistory: { type: "string" },
                financialStressors: { type: "boolean" },
                financialDetails: { type: "string" },
                legalHistory: { type: "boolean" },
                legalDetails: { type: "string" },
                supportSystem: { type: "string" },
                religiousSpirituality: { type: "string" },
                hobbiesInterests: { type: "string" }
              }
            },
            culturalHistory: {
              type: "object",
              properties: {
                culturalIdentity: { type: "string" },
                immigrationHistory: { type: "string" },
                languagePreferences: { type: "string" },
                culturalBeliefs: { type: "string" },
                discriminationExperiences: { type: "string" }
              }
            },
            diagnosticFormulation: {
              type: "object",
              properties: {
                clinicianImpression: { type: "string" },
                diagnoses: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      code: { type: "string", description: "ICD-10 code" },
                      description: { type: "string" },
                      type: { type: "string", enum: ["Primary", "Secondary"] },
                      specifiers: { type: "string" }
                    },
                    required: ["code", "description", "type"]
                  }
                },
                differentialDiagnoses: { type: "string" },
                diagnosticRationale: { type: "string" },
                strengthsAndResources: { type: "array", items: { type: "string" } }
              }
            },
            treatmentRecommendations: {
              type: "object",
              properties: {
                recommendedFrequency: { type: "string" },
                recommendedModality: { type: "string" },
                therapeuticApproach: { type: "string" },
                medicationRecommendation: {
                  type: "object",
                  properties: {
                    recommended: { type: "boolean" },
                    referralMade: { type: "boolean" },
                    referralTo: { type: "string" }
                  }
                },
                additionalRecommendations: { type: "string" }
              }
            },
            initialGoals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  goalDescription: { type: "string" },
                  targetDate: { type: "string" },
                  measurableOutcome: { type: "string" }
                },
                required: ["goalDescription", "measurableOutcome"]
              }
            }
          },
          required: ["chiefComplaint", "historyOfPresentingProblem", "currentSymptoms", "mentalStatusExam", "safetyAssessment", "diagnosticFormulation", "treatmentRecommendations", "initialGoals"]
        }
      }
    }];

    // Call AI API with structured output
    const requestBody: any = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      tools: tools,
      tool_choice: { type: "function", function: { name: "generate_intake_assessment" } }
    };

    // For OpenAI GPT-5+ models, use max_completion_tokens
    if (useOpenAI && (model.includes('gpt-5') || model.includes('o3') || model.includes('o4'))) {
      requestBody.max_completion_tokens = 4000;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to your workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    
    // Extract content from tool call response
    let content;
    try {
      const toolCall = data.choices[0].message.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        // Parse the function arguments which contains our structured data
        content = JSON.parse(toolCall.function.arguments);
      } else {
        // Fallback to old format if tool calling didn't work
        const aiResponse = data.choices[0].message.content;
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          content = JSON.parse(jsonMatch[0]);
        } else {
          content = JSON.parse(aiResponse);
        }
      }
    } catch (parseError) {
      throw new Error('AI returned invalid format');
    }

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to generate intake note' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
