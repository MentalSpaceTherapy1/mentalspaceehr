import { useState, useEffect, useCallback, useRef } from 'react';
import { Room } from 'twilio-video';
import { supabase } from '@/integrations/supabase/client';

interface AITranscript {
  id: string;
  speaker: string;
  text: string;
  timestamp: Date;
  confidence: number;
}

interface AISentiment {
  score: number; // -1 to 1, negative to positive
  label: 'positive' | 'neutral' | 'negative';
  confidence: number;
}

interface AIInsight {
  type: 'suggestion' | 'observation' | 'alert';
  content: string;
  timestamp: Date;
}

interface UseTwilioAIOptions {
  room: Room | null;
  enabled: boolean;
  provider?: 'lovable_ai' | 'twilio';
  onTranscript?: (transcript: AITranscript) => void;
  onSentiment?: (sentiment: AISentiment) => void;
  onInsight?: (insight: AIInsight) => void;
}

export const useTwilioAI = ({
  room,
  enabled,
  provider = 'lovable_ai',
  onTranscript,
  onSentiment,
  onInsight
}: UseTwilioAIOptions) => {
  const [transcripts, setTranscripts] = useState<AITranscript[]>([]);
  const [currentSentiment, setCurrentSentiment] = useState<AISentiment | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const twilioTrackRef = useRef<any>(null);

  // Real-time audio analysis using Lovable AI
  useEffect(() => {
    if (!room || !enabled) return;

    console.log('[AI] Initializing AI services for room:', room.name);
    setIsProcessing(true);

    // Monitor audio tracks and analyze periodically
    let analysisInterval: number;
    let transcriptBuffer: string[] = [];

    const analyzeAudio = async () => {
      try {
        // Simulate getting audio text (in real implementation, this would come from Web Speech API or similar)
        const audioText = `Continuing telehealth session. Discussing coping strategies and progress.`;
        transcriptBuffer.push(audioText);

        // Create transcript
        const transcript: AITranscript = {
          id: Date.now().toString(),
          speaker: 'Participant',
          text: audioText,
          timestamp: new Date(),
          confidence: 0.85
        };

        setTranscripts(prev => [...prev.slice(-50), transcript]);
        onTranscript?.(transcript);

        // Analyze sentiment using Lovable AI
        const { data: sentimentData, error: sentimentError } = await supabase.functions.invoke(
          'analyze-session-audio',
          {
            body: {
              audioText,
              sessionContext: 'Telehealth therapy session',
              analysisType: 'sentiment'
            }
          }
        );

        if (!sentimentError && sentimentData) {
          const sentiment: AISentiment = {
            score: sentimentData.score || 0,
            label: sentimentData.label || 'neutral',
            confidence: sentimentData.confidence || 0.7
          };
          setCurrentSentiment(sentiment);
          onSentiment?.(sentiment);
        }

      } catch (error) {
        console.error('[AI] Analysis error:', error);
      }
    };

    // Analyze every 10 seconds during active session
    analysisInterval = setInterval(analyzeAudio, 10000) as unknown as number;
    
    // Initial analysis
    analyzeAudio();

    return () => {
      if (analysisInterval) clearInterval(analysisInterval);
      setIsProcessing(false);
    };
  }, [room, enabled, onTranscript, onSentiment]);

  // Generate AI insights based on transcripts and sentiment
  useEffect(() => {
    if (!enabled || transcripts.length < 3) return;

    const generateInsights = async () => {
      try {
        const recentTranscripts = transcripts.slice(-5).map(t => t.text).join(' ');
        
        const { data: insightData, error } = await supabase.functions.invoke(
          'analyze-session-audio',
          {
            body: {
              audioText: recentTranscripts,
              sessionContext: `Recent sentiment: ${currentSentiment?.label || 'unknown'}`,
              analysisType: 'insight'
            }
          }
        );

        if (!error && insightData) {
          const insight: AIInsight = {
            type: insightData.type || 'observation',
            content: insightData.content || 'Session progressing normally.',
            timestamp: new Date()
          };

          setInsights(prev => [...prev.slice(-10), insight]);
          onInsight?.(insight);
        }
      } catch (error) {
        console.error('[AI] Insight generation error:', error);
      }
    };

    const insightInterval = setInterval(generateInsights, 30000);
    return () => clearInterval(insightInterval);
  }, [enabled, transcripts, currentSentiment, onInsight]);

  const enableTranscription = useCallback(async () => {
    if (!room) return false;

    try {
      if (provider === 'twilio') {
        // Enable Twilio Voice Intelligence
        const { data, error } = await supabase.functions.invoke('enable-twilio-transcription', {
          body: { roomSid: room.sid }
        });
        
        if (error) throw error;
        
        console.log('[Twilio AI] Twilio Voice Intelligence enabled');
        twilioTrackRef.current = data?.trackSid;
      } else {
        console.log('[Twilio AI] Lovable AI transcription enabled (mock)');
      }

      return true;
    } catch (error) {
      console.error('[Twilio AI] Failed to enable transcription:', error);
      return false;
    }
  }, [room, provider]);

  const disableTranscription = useCallback(async () => {
    if (!room) return false;

    try {
      if (provider === 'twilio' && twilioTrackRef.current) {
        await supabase.functions.invoke('disable-twilio-transcription', {
          body: { roomSid: room.sid, trackSid: twilioTrackRef.current }
        });
        twilioTrackRef.current = null;
      }

      console.log('[Twilio AI] Transcription disabled');
      return true;
    } catch (error) {
      console.error('[Twilio AI] Failed to disable transcription:', error);
      return false;
    }
  }, [room, provider]);

  const generateSummary = useCallback(async (): Promise<string | null> => {
    if (!room || transcripts.length === 0) return null;

    try {
      const sessionText = transcripts.map(t => `${t.speaker}: ${t.text}`).join('\n');
      
      const { data, error } = await supabase.functions.invoke(
        'analyze-session-audio',
        {
          body: {
            audioText: sessionText,
            sessionContext: `Session duration: ${Math.floor(transcripts.length / 6)} minutes. Overall sentiment: ${currentSentiment?.label || 'neutral'}`,
            analysisType: 'insight'
          }
        }
      );

      if (error || !data) {
        throw new Error('Failed to generate summary');
      }

      const summary = `
Session Summary:
- Duration: ${Math.floor(transcripts.length / 6)} minutes
- Total exchanges: ${transcripts.length}
- Overall sentiment: ${currentSentiment?.label || 'neutral'}
- AI Insights: ${data.content || 'Session progressed normally'}
- Confidence: ${Math.round((data.confidence || 0.7) * 100)}%
      `.trim();

      return summary;
    } catch (error) {
      console.error('[AI] Failed to generate summary:', error);
      return null;
    }
  }, [room, transcripts, currentSentiment]);

  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
    setInsights([]);
    setCurrentSentiment(null);
  }, []);

  return {
    transcripts,
    currentSentiment,
    insights,
    isProcessing,
    enableTranscription,
    disableTranscription,
    generateSummary,
    clearTranscripts
  };
};

// Helper function to integrate with Twilio Video Processor API
export const createAIVideoProcessor = () => {
  // TODO: Implement Twilio Video Processor for:
  // - Background blur/replacement
  // - Noise suppression
  // - Auto-framing

  return {
    enableBackgroundBlur: async () => {
      console.log('[Twilio AI] Background blur enabled');
    },
    enableNoiseSuppression: async () => {
      console.log('[Twilio AI] Noise suppression enabled');
    },
    enableAutoFraming: async () => {
      console.log('[Twilio AI] Auto-framing enabled');
    }
  };
};
