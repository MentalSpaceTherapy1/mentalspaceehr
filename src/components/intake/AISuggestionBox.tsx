import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Check, X, Edit, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AISuggestionBoxProps {
  title: string;
  onGenerate: () => Promise<any>;
  onAccept: (content: any) => void;
  onReject: () => void;
  isGenerating?: boolean;
  children?: React.ReactNode;
}

export function AISuggestionBox({
  title,
  onGenerate,
  onAccept,
  onReject,
  isGenerating = false,
  children
}: AISuggestionBoxProps) {
  const [suggestion, setSuggestion] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const content = await onGenerate();
      setSuggestion(content);
      setEditedContent(content);
      setIsEditing(false);
    } catch (error) {
      console.error('Error generating suggestion:', error);
      setSuggestion(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    onAccept(isEditing ? editedContent : suggestion);
    setSuggestion(null);
    setEditedContent(null);
    setIsEditing(false);
  };

  const handleReject = () => {
    setSuggestion(null);
    setEditedContent(null);
    setIsEditing(false);
    onReject();
  };

  const handleEdit = () => {
    setIsEditing(!isEditing);
  };

  return (
    <div className="space-y-4">
      {!suggestion && (
        <Button 
          onClick={handleGenerate} 
          variant="outline" 
          size="sm"
          disabled={loading || isGenerating}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate AI {title}
            </>
          )}
        </Button>
      )}

      {suggestion && (
        <Alert className="border-primary/50 bg-primary/5">
          <div className="flex items-start justify-between w-full">
            <div className="flex-1">
              <AlertDescription>
                <div className="font-semibold mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI Suggestion
                </div>
                {children || (
                  <div className="text-sm whitespace-pre-wrap">
                    {JSON.stringify(suggestion, null, 2)}
                  </div>
                )}
              </AlertDescription>
            </div>
            <div className="flex gap-2 ml-4">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleEdit}
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
        </Alert>
      )}
    </div>
  );
}
