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
import { FileText, Circle, X, Loader2 } from 'lucide-react';
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
  enableAIGenerate?: boolean;
}

interface BillingInfo {
  billAsTelemedicine: boolean;
  modifier: 'GT' | '95' | '';
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
  enableAIGenerate = false,
}: PostSessionDialogProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [billingInfo, setBillingInfo] = useState<BillingInfo>({
    billAsTelemedicine: true,
    modifier: 'GT'
  });

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Convert audio blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );

      toast({
        title: 'AI Processing Started',
        description: 'Transcribing audio and generating clinical note...',
      });

      // Call the new transcribe-and-generate-note function
      const { data: result, error } = await supabase.functions.invoke(
        'transcribe-and-generate-note',
        {
          body: {
            audioBase64: base64Audio,
            clientId,
            clinicianId: user.id,
            appointmentId,
            sessionId,
          },
        }
      );

      if (error) throw error;

      toast({
        title: 'AI Note Generated!',
        description: 'Clinical note has been created from your session recording.',
      });

      // Navigate to the generated note
      navigate(`/notes/${result.noteId}`);
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

  const handleManualNote = async () => {
    await updateBillingInfo();
    navigate(`/notes/new?clientId=${clientId}${appointmentId ? `&appointmentId=${appointmentId}` : ''}`);
    onOpenChange(false);
  };

  const handleSkip = async () => {
    await updateBillingInfo();
    onOpenChange(false);
    navigate('/schedule');
  };

  const updateBillingInfo = async () => {
    if (!appointmentId) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          telehealth_platform: 'integrated',
          billing_status: billingInfo.billAsTelemedicine ? 'Ready to Bill' : 'Not Billed'
        })
        .eq('id', appointmentId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating billing info:', error);
    }
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
              <Circle className="h-4 w-4 text-primary fill-current" />
              <div className="flex-1">
                <p className="text-sm font-medium">Recording Available</p>
                <p className="text-xs text-muted-foreground">
                  Duration: {formatDuration(recordingDuration)}
                </p>
              </div>
            </div>
          )}

          {/* Billing Section */}
          <div className="space-y-3 p-4 border rounded-lg">
            <h4 className="text-sm font-semibold">Billing Information</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={billingInfo.billAsTelemedicine}
                  onChange={(e) => setBillingInfo({ ...billingInfo, billAsTelemedicine: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Bill as telemedicine session</span>
              </label>
              
              {billingInfo.billAsTelemedicine && (
                <div className="ml-6 space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={billingInfo.modifier === 'GT'}
                      onChange={() => setBillingInfo({ ...billingInfo, modifier: 'GT' })}
                      className="text-primary"
                    />
                    <span className="text-sm">Modifier GT (Live video)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={billingInfo.modifier === '95'}
                      onChange={() => setBillingInfo({ ...billingInfo, modifier: '95' })}
                      className="text-primary"
                    />
                    <span className="text-sm">Modifier 95 (Synchronous)</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {hasRecording && enableAIGenerate && (
              <Button
                onClick={handleGenerateFromRecording}
                disabled={isProcessing}
                className="w-full"
                size="lg"
              >
                 {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    AI Processing...
                  </>
                 ) : (
                  <>
                    <Circle className="mr-2 h-4 w-4 fill-current" />
                    AI: Generate Note from Recording
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
