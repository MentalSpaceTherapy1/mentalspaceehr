import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download, User, Bot } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TranscriptEntry {
  speaker: string;
  text: string;
  timestamp: string;
  confidence?: number;
}

interface TranscriptViewerProps {
  sessionId: string;
}

export const TranscriptViewer = ({ sessionId }: TranscriptViewerProps) => {
  const { toast } = useToast();
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTranscript();
  }, [sessionId]);

  const loadTranscript = async () => {
    try {
      const { data, error } = await supabase
        .from('session_transcripts')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (error) throw error;

      if (data?.speaker_labels) {
        // Parse speaker_labels JSON into TranscriptEntry format
        const labels = typeof data.speaker_labels === 'string' 
          ? JSON.parse(data.speaker_labels) 
          : data.speaker_labels;
        
        // Convert to TranscriptEntry format
        const entries: TranscriptEntry[] = Array.isArray(labels) 
          ? labels 
          : Object.entries(labels || {}).map(([timestamp, label]: any) => ({
              speaker: label.speaker || 'Unknown',
              text: label.text || '',
              timestamp: timestamp,
              confidence: label.confidence
            }));
        
        setTranscript(entries);
      } else if (data?.transcript_text) {
        // Fallback: split text into entries
        const sentences = data.transcript_text.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
        const entries: TranscriptEntry[] = sentences.map((text: string, index: number) => ({
          speaker: index % 2 === 0 ? 'Clinician' : 'Client',
          text: text.trim(),
          timestamp: `00:${Math.floor(index * 10 / 60).toString().padStart(2, '0')}:${(index * 10 % 60).toString().padStart(2, '0')}`,
          confidence: 0.85
        }));
        setTranscript(entries);
      }
    } catch (error) {
      console.error('Error loading transcript:', error);
      toast({
        title: 'Error',
        description: 'Failed to load transcript',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const content = transcript
      .map((entry) => `[${entry.timestamp}] ${entry.speaker}: ${entry.text}`)
      .join('\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${sessionId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: 'Transcript exported successfully',
    });
  };

  const filteredTranscript = transcript.filter((entry) =>
    entry.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.speaker.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Session Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading transcript...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Session Transcript</CardTitle>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          {filteredTranscript.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No transcript entries found
            </p>
          ) : (
            <div className="space-y-4">
              {filteredTranscript.map((entry, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg ${
                    entry.speaker === 'Clinician'
                      ? 'bg-primary/5 border border-primary/10'
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {entry.speaker === 'Clinician' ? (
                      <User className="h-4 w-4 text-primary" />
                    ) : (
                      <Bot className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Badge variant={entry.speaker === 'Clinician' ? 'default' : 'secondary'}>
                      {entry.speaker}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {entry.timestamp}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{entry.text}</p>
                  {entry.confidence && (
                    <div className="mt-2">
                      <span className="text-xs text-muted-foreground">
                        Confidence: {Math.round(entry.confidence * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
