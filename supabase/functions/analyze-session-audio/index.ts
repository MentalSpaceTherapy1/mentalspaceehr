import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioText, sessionContext, analysisType } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (analysisType === "sentiment") {
      systemPrompt = "You are a clinical sentiment analyzer. Analyze the emotional tone and provide a sentiment score.";
      userPrompt = `Analyze the sentiment of this session excerpt: "${audioText}"
      
      Context: ${sessionContext || "Telehealth therapy session"}
      
      Respond with a JSON object containing:
      - score: number from -1 (very negative) to 1 (very positive)
      - label: "positive", "neutral", or "negative"
      - confidence: number from 0 to 1
      - reasoning: brief explanation`;
    } else if (analysisType === "transcription") {
      systemPrompt = "You are a medical transcription assistant. Clean and format the transcription.";
      userPrompt = `Clean and format this transcription: "${audioText}"`;
    } else if (analysisType === "insight") {
      systemPrompt = "You are a clinical AI assistant helping therapists during sessions. Provide actionable insights.";
      userPrompt = `Based on this session excerpt: "${audioText}"
      
      Provide a clinical insight as JSON:
      - type: "suggestion", "observation", or "alert"
      - title: brief title
      - content: detailed observation or suggestion
      - confidence: number from 0 to 1`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;

    // Try to parse as JSON first, otherwise return as text
    let result;
    try {
      result = JSON.parse(aiResponse);
    } catch {
      result = { text: aiResponse };
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-session-audio:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
