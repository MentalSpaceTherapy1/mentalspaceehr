import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Mic, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PostSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  hasRecording: boolean;
  recordingDuration: number;
  audioBlob: Blob | null;
  appointmentId?: string;
  clientId: string;
}

export const PostSessionDialog = ({
  open,
  onOpenChange,
  sessionId,
  hasRecording,
  recordingDuration,
  audioBlob,
  appointmentId,
  clientId,
}: PostSessionDialogProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleGenerateFromRecording = async () => {
    if (!audioBlob) {
      toast({
        title: 'Error',
        description: 'No recording available',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Convert audio blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );

      // Call transcription function
      const { data: transcriptData, error: transcriptError } = await supabase.functions.invoke(
        'transcribe-session',
        {
          body: {
            sessionId,
            audio: base64Audio,
            mimeType: audioBlob.type,
          },
        }
      );

      if (transcriptError) throw transcriptError;

      toast({
        title: 'Transcription Complete',
        description: 'Generating clinical note from transcript...',
      });

      // Navigate to note editor with session context
      navigate(`/notes/new?sessionId=${sessionId}&clientId=${clientId}${appointmentId ? `&appointmentId=${appointmentId}` : ''}`);
      onOpenChange(false);

    } catch (error) {
      console.error('Error processing recording:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process recording',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualNote = () => {
    navigate(`/notes/new?clientId=${clientId}${appointmentId ? `&appointmentId=${appointmentId}` : ''}`);
    onOpenChange(false);
  };

  const handleSkip = () => {
    onOpenChange(false);
    navigate('/schedule');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Session Ended</DialogTitle>
          <DialogDescription>
            Would you like to create a clinical note for this session?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {hasRecording && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Mic className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Recording Available</p>
                <p className="text-xs text-muted-foreground">
                  Duration: {formatDuration(recordingDuration)}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {hasRecording && (
              <Button
                onClick={handleGenerateFromRecording}
                disabled={isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Recording...
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-4 w-4" />
                    Generate Note from Recording
                  </>
                )}
              </Button>
            )}

            <Button
              onClick={handleManualNote}
              variant="outline"
              className="w-full"
              size="lg"
              disabled={isProcessing}
            >
              <FileText className="mr-2 h-4 w-4" />
              Create Manual Note
            </Button>

            <Button
              onClick={handleSkip}
              variant="ghost"
              className="w-full"
              size="lg"
              disabled={isProcessing}
            >
              <X className="mr-2 h-4 w-4" />
              Skip for Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
