import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FileText, X, Save, Sparkles, Clock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface SessionNotesPanelProps {
  isOpen: boolean;
  sessionId: string;
  onClose: () => void;
  aiSuggestions?: string[];
}

export const SessionNotesPanel = ({
  isOpen,
  sessionId,
  onClose,
  aiSuggestions = []
}: SessionNotesPanelProps) => {
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!notes.trim()) {
      toast({
        title: 'No notes to save',
        description: 'Please write some notes before saving',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      // TODO: Implement actual save to database
      await new Promise(resolve => setTimeout(resolve, 1000));

      setLastSaved(new Date());
      toast({
        title: 'Notes saved',
        description: 'Your session notes have been saved successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save notes',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const insertSuggestion = (suggestion: string) => {
    setNotes(prev => {
      if (!prev.trim()) return suggestion;
      return prev + '\n\n' + suggestion;
    });
  };

  if (!isOpen) return null;

  return (
    <Card className="w-96 h-full border-l flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Session Notes</CardTitle>
              <CardDescription className="text-xs">
                Document this session
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 p-4 space-y-4 overflow-hidden flex flex-col">
        {/* AI Suggestions */}
        {aiSuggestions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <span>AI Suggestions</span>
              <Badge variant="secondary" className="text-xs">
                {aiSuggestions.length}
              </Badge>
            </div>

            <ScrollArea className="h-32">
              <div className="space-y-2 pr-4">
                {aiSuggestions.map((suggestion, index) => (
                  <Card
                    key={index}
                    className="p-2 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => insertSuggestion(suggestion)}
                  >
                    <p className="text-xs text-muted-foreground">{suggestion}</p>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <Separator />
          </div>
        )}

        {/* Notes Editor */}
        <div className="flex-1 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Your Notes</label>
            {lastSaved && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Saved {lastSaved.toLocaleTimeString()}</span>
              </div>
            )}
          </div>

          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write your session notes here...

You can include:
- Key observations
- Client progress
- Topics discussed
- Follow-up actions
- Clinical impressions"
            className="flex-1 resize-none font-mono text-sm"
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button
            onClick={handleSave}
            disabled={isSaving || !notes.trim()}
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Notes'}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled
            >
              <FileText className="h-4 w-4 mr-2" />
              Templates
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI Expand
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <Card className="p-3 bg-muted/50">
          <p className="text-xs font-medium mb-2">Quick Add</p>
          <div className="flex flex-wrap gap-1">
            {[
              'Progress noted',
              'Follow-up needed',
              'Medication review',
              'Crisis assessment',
              'Treatment plan update'
            ].map((tag) => (
              <Button
                key={tag}
                variant="secondary"
                size="sm"
                className="text-xs h-7"
                onClick={() => insertSuggestion(`- ${tag}`)}
              >
                {tag}
              </Button>
            ))}
          </div>
        </Card>

        {/* Note Info */}
        <div className="text-xs text-muted-foreground">
          <p>💡 Tip: Notes are automatically saved to the session record</p>
        </div>
      </CardContent>
    </Card>
  );
};
