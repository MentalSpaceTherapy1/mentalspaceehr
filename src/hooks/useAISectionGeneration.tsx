import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseAISectionGenerationProps {
  sectionType: string;
  clientId?: string;
  context: string;
  existingData?: any;
}

export function useAISectionGeneration({
  sectionType,
  clientId,
  context,
  existingData
}: UseAISectionGenerationProps) {
  const [suggestion, setSuggestion] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const generate = async () => {
    if (!clientId) {
      toast({
        title: 'Error',
        description: 'No client selected',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsGenerating(true);
      
      const { data, error } = await supabase.functions.invoke('generate-section-content', {
        body: {
          sectionType,
          context,
          clientId,
          existingData
        }
      });

      if (error) throw error;

      if (data?.content) {
        setSuggestion(data.content);
        toast({
          title: 'AI Suggestion Generated',
          description: 'Review and edit the suggestion, then accept or reject it.',
        });
      }
    } catch (error: any) {
      console.error('Error generating AI content:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate AI suggestion',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const accept = (onAcceptCallback: (content: any) => void) => {
    if (suggestion) {
      onAcceptCallback(suggestion);
      setSuggestion(null);
      setIsEditing(false);
    }
  };

  const reject = () => {
    setSuggestion(null);
    setIsEditing(false);
  };

  const updateSuggestion = (newContent: any) => {
    setSuggestion(newContent);
  };

  return {
    suggestion,
    isGenerating,
    isEditing,
    setIsEditing,
    generate,
    accept,
    reject,
    updateSuggestion
  };
}
