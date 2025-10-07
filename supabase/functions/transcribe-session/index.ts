import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { sessionId, audio, mimeType } = await req.json();

    if (!sessionId || !audio) {
      throw new Error('Session ID and audio are required');
    }

    // Convert base64 to binary in chunks to prevent memory issues
    const processBase64Chunks = (base64String: string, chunkSize = 32768) => {
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
    };

    const binaryAudio = processBase64Chunks(audio);

    // Prepare form data for transcription
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: mimeType || 'audio/webm' });
    formData.append('file', blob, 'session-audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');
    formData.append('response_format', 'verbose_json'); // Get timestamps

    // Use Lovable AI if available, otherwise fallback to OpenAI
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
      },
      body: formData,
    });

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      throw new Error('Transcription failed');
    }

    const transcriptionResult = await transcriptionResponse.json();

    // Process transcript with basic speaker diarization
    // In a production system, you'd use a more sophisticated diarization model
    const processTranscriptWithSpeakers = (text: string, segments?: any[]) => {
      const entries = [];
      
      if (segments && segments.length > 0) {
        // Use segments for more accurate timestamps
        let currentSpeaker = 'Clinician';
        
        for (const segment of segments) {
          // Simple heuristic: alternate speakers on significant pauses
          if (segment.no_speech_prob > 0.5) {
            currentSpeaker = currentSpeaker === 'Clinician' ? 'Client' : 'Clinician';
          }
          
          entries.push({
            speaker: currentSpeaker,
            text: segment.text.trim(),
            timestamp: formatTimestamp(segment.start),
            confidence: 1 - segment.no_speech_prob,
          });
        }
      } else {
        // Fallback: split by sentences
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        let speaker = 'Clinician';
        
        sentences.forEach((sentence, index) => {
          // Alternate speakers every few sentences
          if (index > 0 && index % 3 === 0) {
            speaker = speaker === 'Clinician' ? 'Client' : 'Clinician';
          }
          
          entries.push({
            speaker,
            text: sentence.trim(),
            timestamp: `00:${Math.floor(index * 10 / 60).toString().padStart(2, '0')}:${(index * 10 % 60).toString().padStart(2, '0')}`,
            confidence: 0.85,
          });
        });
      }
      
      return entries;
    };

    const formatTimestamp = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `00:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const transcriptEntries = processTranscriptWithSpeakers(
      transcriptionResult.text,
      transcriptionResult.segments
    );

    // Resolve the canonical session ID to the actual UUID
    const { data: sessionData, error: sessionError } = await supabase
      .from('telehealth_sessions')
      .select('id')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (sessionError || !sessionData) {
      throw new Error('Session not found');
    }

    const sessionUuid = sessionData.id;

    // Store transcript in database
    const { error: insertError } = await supabase
      .from('session_transcripts')
      .insert({
        session_id: sessionUuid,
        transcript_text: transcriptionResult.text,
        speaker_labels: transcriptEntries,
        processing_status: 'completed',
      });

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        transcript: transcriptionResult.text,
        entries: transcriptEntries,
        sessionId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Transcription failed',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
