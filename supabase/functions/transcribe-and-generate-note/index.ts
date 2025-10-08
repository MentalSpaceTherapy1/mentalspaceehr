import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { audioBase64, clientId, clinicianId, appointmentId, sessionId } = await req.json();
    
    if (!audioBase64 || !clientId || !clinicianId) {
      throw new Error('Missing required parameters');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch AI settings to determine provider
    const { data: aiSettings } = await supabase
      .from('ai_note_settings')
      .select('*')
      .maybeSingle();

    const useOpenAI = aiSettings?.provider === 'openai';
    const apiKey = useOpenAI ? Deno.env.get('OPENAI_API_KEY') : Deno.env.get('LOVABLE_API_KEY');
    const apiUrl = useOpenAI 
      ? 'https://api.openai.com/v1/chat/completions'
      : 'https://ai.gateway.lovable.dev/v1/chat/completions';
    const model = aiSettings?.model || (useOpenAI ? 'gpt-5-2025-08-07' : 'google/gemini-2.5-flash');
    
    // OpenAI API key is always required for Whisper transcription
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY required for transcription');
    }

    if (!apiKey) {
      throw new Error(`${useOpenAI ? 'OPENAI' : 'LOVABLE'}_API_KEY not configured`);
    }

    // Step 1: Transcribe audio using Whisper
    const binaryAudio = processBase64Chunks(audioBase64);
    const audioBlob = new Blob([binaryAudio], { type: 'audio/webm' });
    
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', 'whisper-1');

    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      throw new Error('Transcription failed');
    }

    const transcriptionData = await transcriptionResponse.json();
    const transcript = transcriptionData.text;

    // Step 2: Generate structured clinical note using configured AI provider
    const requestBody: any = {
      model,
      messages: [
        {
          role: 'system',
          content: `You are a clinical documentation assistant. Generate a structured SOAP note from telehealth session transcripts. 
Extract and organize information into these sections:
- Subjective: Client's reported concerns, symptoms, feelings
- Objective: Observable behaviors, mood, affect, appearance
- Assessment: Clinical impressions, diagnosis considerations
- Plan: Treatment recommendations, follow-up, homework

Be professional, concise, and clinically appropriate. If information is missing, note it rather than inventing details.`
        },
        {
          role: 'user',
          content: `Generate a SOAP note from this telehealth session transcript:\n\n${transcript}`
        }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'create_soap_note',
            description: 'Create a structured SOAP note from session transcript',
            parameters: {
              type: 'object',
              properties: {
                subjective: {
                  type: 'string',
                  description: 'Client reported symptoms, concerns, and feelings'
                },
                objective: {
                  type: 'string',
                  description: 'Observable behaviors, mood, affect, appearance'
                },
                assessment: {
                  type: 'string',
                  description: 'Clinical impressions and diagnostic considerations'
                },
                plan: {
                  type: 'string',
                  description: 'Treatment recommendations and next steps'
                },
                interventions: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of interventions used during session'
                }
              },
              required: ['subjective', 'objective', 'assessment', 'plan'],
              additionalProperties: false
            }
          }
        }
      ],
      tool_choice: { type: 'function', function: { name: 'create_soap_note' } }
    };

    // For OpenAI GPT-5+ models, use max_completion_tokens
    if (useOpenAI && (model.includes('gpt-5') || model.includes('o3') || model.includes('o4'))) {
      requestBody.max_completion_tokens = 2000;
    }

    const noteGenerationResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!noteGenerationResponse.ok) {
      const errorText = await noteGenerationResponse.text();
      
      if (noteGenerationResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      } else if (noteGenerationResponse.status === 402) {
        throw new Error('AI service credits depleted. Please contact your administrator.');
      }
      
      throw new Error(`Note generation failed: ${errorText}`);
    }

    const noteData = await noteGenerationResponse.json();

    // Extract the structured note from tool call
    const toolCall = noteData.choices[0].message.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No structured note generated');
    }

    const noteContent = JSON.parse(toolCall.function.arguments);

    // Step 3: Save to database
    const { data: clinicalNote, error: noteError } = await supabase
      .from('clinical_notes')
      .insert({
        client_id: clientId,
        clinician_id: clinicianId,
        appointment_id: appointmentId,
        session_id: sessionId,
        note_type: 'progress_note',
        note_format: 'SOAP',
        content: noteContent,
        ai_generated: true,
        ai_model_used: model,
        date_of_service: new Date().toISOString().split('T')[0],
        created_by: clinicianId
      })
      .select()
      .single();

    if (noteError) {
      throw noteError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        transcript,
        noteId: clinicalNote.id,
        noteContent
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Processing failed',
        details: error 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});