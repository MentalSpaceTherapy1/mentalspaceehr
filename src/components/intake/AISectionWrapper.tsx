import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Check, X, Edit, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AISectionWrapperProps {
  sectionType: string;
  clientId?: string;
  context: string;
  existingData?: any;
  onAccept: (content: any) => void;
  renderSuggestion: (content: any, isEditing: boolean, onEdit: (newContent: any) => void) => React.ReactNode;
  children: React.ReactNode;
}

export function AISectionWrapper({
  sectionType,
  clientId,
  context,
  existingData,
  onAccept,
  renderSuggestion,
  children
}: AISectionWrapperProps) {
  const [suggestion, setSuggestion] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
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
          description: 'Review the suggestion, edit if needed, then accept or reject it.',
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

  const handleAccept = () => {
    if (suggestion) {
      onAccept(suggestion);
      setSuggestion(null);
      setIsEditing(false);
      toast({
        title: 'Suggestion Accepted',
        description: 'AI-generated content has been applied to the form.',
      });
    }
  };

  const handleReject = () => {
    setSuggestion(null);
    setIsEditing(false);
    toast({
      title: 'Suggestion Rejected',
      description: 'AI suggestion has been discarded.',
    });
  };

  const handleToggleEdit = () => {
    setIsEditing(!isEditing);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button 
          onClick={handleGenerate} 
          variant="outline" 
          size="sm"
          disabled={isGenerating || !!suggestion}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate with AI
            </>
          )}
        </Button>
      </div>

      {suggestion && (
        <Alert className="border-primary/50 bg-primary/5">
          <div className="w-full">
            <div className="flex items-start justify-between mb-3">
              <div className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI Suggestion
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleToggleEdit}
                  title={isEditing ? "View mode" : "Edit suggestion"}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={handleAccept}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleReject}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
            <AlertDescription>
              {renderSuggestion(suggestion, isEditing, setSuggestion)}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {children}
    </div>
  );
}
