import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { freeTextInput, clientId, currentDiagnoses } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const diagnosesText = currentDiagnoses && currentDiagnoses.length > 0
      ? currentDiagnoses.map((d: any) => `${d.icdCode}: ${d.diagnosis} (${d.severity})`).join(', ')
      : 'No diagnoses provided';

    const systemPrompt = `You are an expert clinical psychologist creating evidence-based treatment plans.

Generate a comprehensive treatment plan with the following structure:

1. **Problems**: Identify 2-4 clinical problems based on the information provided
   - Each problem should be specific, measurable, and clinically relevant
   - Include problem type (Clinical/Psychosocial/Environmental)
   - Assign severity (Mild/Moderate/Severe)

2. **Goals**: For each problem, create 1-2 SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound)
   - Short-term goals: achievable within 1-3 months
   - Long-term goals: achievable within 3-6 months

3. **Objectives**: For each goal, create 2-3 measurable objectives
   - Must be specific and measurable
   - Include measurement methods
   - Include frequency of measurement

4. **Interventions**: For each objective, suggest 2-3 evidence-based interventions
   - Specify intervention type (CBT, DBT, MI, etc.)
   - Include frequency
   - Assign responsible party

5. **Treatment Modalities**: Recommend therapeutic approaches and adjunct services

6. **Discharge Criteria**: Define 3-5 specific criteria for successful treatment completion

7. **Client Strengths**: Identify 3-5 client strengths to build upon

Current diagnoses: ${diagnosesText}

Return your response in valid JSON format with this exact structure:
{
  "problems": [
    {
      "problemStatement": "string",
      "problemType": "Clinical" | "Psychosocial" | "Environmental",
      "severity": "Mild" | "Moderate" | "Severe"
    }
  ],
  "goals": [
    {
      "relatedProblemId": "problemId (use index 0, 1, 2...)",
      "goalStatement": "SMART goal statement",
      "goalType": "Short-term" | "Long-term",
      "objectives": [
        {
          "objectiveStatement": "measurable objective",
          "measurementMethod": "how to measure",
          "frequency": "how often measured",
          "interventions": [
            {
              "interventionDescription": "specific intervention",
              "interventionType": "CBT, DBT, etc.",
              "frequency": "Weekly, Biweekly, etc.",
              "responsibleParty": "Clinician, Client, etc."
            }
          ]
        }
      ]
    }
  ],
  "treatmentModalities": {
    "therapeuticApproaches": ["CBT", "DBT", ...],
    "adjunctServices": [
      {
        "service": "service name",
        "frequency": "frequency"
      }
    ]
  },
  "dischargeCriteria": ["criterion 1", "criterion 2", ...],
  "clientStrengths": ["strength 1", "strength 2", ...],
  "psychoeducationTopics": ["topic 1", "topic 2", ...]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: freeTextInput }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_treatment_plan",
              description: "Create a structured treatment plan with problems, goals, objectives, and interventions",
              parameters: {
                type: "object",
                properties: {
                  problems: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        problemStatement: { type: "string" },
                        problemType: { type: "string", enum: ["Clinical", "Psychosocial", "Environmental"] },
                        severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] }
                      },
                      required: ["problemStatement", "problemType", "severity"]
                    }
                  },
                  goals: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        relatedProblemId: { type: "string" },
                        goalStatement: { type: "string" },
                        goalType: { type: "string", enum: ["Short-term", "Long-term"] },
                        objectives: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              objectiveStatement: { type: "string" },
                              measurementMethod: { type: "string" },
                              frequency: { type: "string" },
                              interventions: {
                                type: "array",
                                items: {
                                  type: "object",
                                  properties: {
                                    interventionDescription: { type: "string" },
                                    interventionType: { type: "string" },
                                    frequency: { type: "string" },
                                    responsibleParty: { type: "string" }
                                  },
                                  required: ["interventionDescription", "interventionType", "frequency", "responsibleParty"]
                                }
                              }
                            },
                            required: ["objectiveStatement", "measurementMethod", "frequency", "interventions"]
                          }
                        }
                      },
                      required: ["relatedProblemId", "goalStatement", "goalType", "objectives"]
                    }
                  },
                  treatmentModalities: {
                    type: "object",
                    properties: {
                      therapeuticApproaches: {
                        type: "array",
                        items: { type: "string" }
                      },
                      adjunctServices: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            service: { type: "string" },
                            frequency: { type: "string" }
                          }
                        }
                      }
                    }
                  },
                  dischargeCriteria: {
                    type: "array",
                    items: { type: "string" }
                  },
                  clientStrengths: {
                    type: "array",
                    items: { type: "string" }
                  },
                  psychoeducationTopics: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of psychoeducation topics to cover (e.g., stress management, coping skills, medication education)"
                  },
                  medicationPlan: {
                    type: "object",
                    properties: {
                      medicationsRequired: {
                        type: "boolean",
                        description: "Whether medications are recommended as part of treatment"
                      },
                      prescribingProvider: {
                        type: "string",
                        description: "Name or type of prescribing provider if medications recommended"
                      },
                      medications: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            medicationName: { type: "string" },
                            dosage: { type: "string" },
                            frequency: { type: "string" },
                            indication: { type: "string" }
                          },
                          required: ["medicationName", "indication"]
                        },
                        description: "Recommended medications if applicable"
                      },
                      monitoringPlan: {
                        type: "string",
                        description: "Plan for monitoring medication effectiveness and side effects"
                      }
                    },
                    required: ["medicationsRequired", "medications", "monitoringPlan"]
                  }
                },
                required: ["problems", "goals", "treatmentModalities", "dischargeCriteria", "clientStrengths"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_treatment_plan" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI usage limit reached. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('AI gateway error');
    }

    const data = await response.json();

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const treatmentPlan = JSON.parse(toolCall.function.arguments);

    // Add IDs to problems and goals
    const problemsWithIds = treatmentPlan.problems.map((p: any, index: number) => ({
      ...p,
      problemId: `problem-${index}`,
      dateIdentified: new Date().toISOString().split('T')[0],
      status: 'Active'
    }));

    const goalsWithIds = treatmentPlan.goals.map((g: any, goalIndex: number) => ({
      ...g,
      goalId: `goal-${goalIndex}`,
      relatedProblemId: `problem-${g.relatedProblemId || 0}`,
      targetDate: g.goalType === 'Short-term' 
        ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      goalStatus: 'Not Started',
      goalProgress: 0,
      objectives: g.objectives.map((o: any, objIndex: number) => ({
        ...o,
        objectiveId: `objective-${goalIndex}-${objIndex}`,
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'Not Started',
        currentProgress: 0,
        interventions: o.interventions.map((i: any, intIndex: number) => ({
          ...i,
          interventionId: `intervention-${goalIndex}-${objIndex}-${intIndex}`
        }))
      }))
    }));

    return new Response(
      JSON.stringify({
        treatmentPlan: {
          ...treatmentPlan,
          problems: problemsWithIds,
          goals: goalsWithIds
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: 'Treatment plan generation failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
