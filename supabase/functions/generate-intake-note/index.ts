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
    const { clientId, existingData } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

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
${existingData?.chiefComplaint ? `- Chief Complaint: ${existingData.chiefComplaint}` : ''}
${existingData?.historyOfPresentingProblem ? `- History: ${existingData.historyOfPresentingProblem}` : ''}
`;

    const systemPrompt = `You are an expert clinical psychologist helping to draft a comprehensive intake assessment. Generate detailed, professional clinical content based on the provided information.

Your response should be structured and comprehensive, covering key areas of an intake assessment. Use clinical language appropriate for mental health documentation.`;

    const userPrompt = existingData?.chiefComplaint || existingData?.historyOfPresentingProblem
      ? `Based on the following client information and initial data, generate suggestions for completing the intake assessment:\n\n${clientContext}\n\nProvide clinical suggestions for:\n1. Mental Status Exam findings\n2. Safety assessment considerations\n3. Relevant history to explore\n4. Potential diagnostic considerations\n5. Initial treatment recommendations`
      : `Generate a template structure for a comprehensive intake assessment for this client:\n\n${clientContext}`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

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
          { role: 'user', content: userPrompt }
        ],
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
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to your workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const suggestions = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-intake-note:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
