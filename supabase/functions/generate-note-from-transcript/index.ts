import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, clientId, clinicianId, appointmentId, sessionId } = await req.json();

    if (!transcript || !clientId || !clinicianId) {
      throw new Error('Missing required fields');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Generate clinical note from transcript using Lovable AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a clinical documentation assistant. Generate a professional clinical note from the provided session transcript. Include:
- Chief Complaint/Presenting Issue
- Session Summary
- Clinical Observations
- Interventions Used
- Client Progress
- Treatment Plan Updates
- Risk Assessment (if applicable)
Format the note professionally and concisely.`
          },
          {
            role: 'user',
            content: `Generate a clinical note from this telehealth session:\n\n${transcript}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error('Failed to generate clinical note');
    }

    const aiData = await response.json();
    const generatedNote = aiData.choices[0].message.content;

    // Create note in database
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: noteData, error: noteError } = await supabaseClient
      .from('chart_notes')
      .insert({
        client_id: clientId,
        clinician_id: clinicianId,
        appointment_id: appointmentId,
        session_date: new Date().toISOString().split('T')[0],
        note_type: 'Progress Note',
        content: generatedNote,
        status: 'Draft',
        ai_generated: true,
        telehealth_session_id: sessionId,
      })
      .select()
      .single();

    if (noteError) {
      console.error('Note creation error:', noteError);
      throw new Error('Failed to create note');
    }

    return new Response(
      JSON.stringify({ 
        noteId: noteData.id,
        content: generatedNote
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
