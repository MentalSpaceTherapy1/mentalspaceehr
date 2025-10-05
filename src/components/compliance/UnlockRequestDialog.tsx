import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface UnlockRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string;
  noteType: string;
  complianceStatusId: string;
  onRequestSubmitted?: () => void;
}

export const UnlockRequestDialog = ({
  open,
  onOpenChange,
  noteId,
  noteType,
  complianceStatusId,
  onRequestSubmitted
}: UnlockRequestDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a reason for the unlock request',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSubmitting(true);

      // Create unlock request
      const { error: requestError } = await supabase
        .from('unlock_requests')
        .insert({
          compliance_status_id: complianceStatusId,
          note_id: noteId,
          note_type: noteType,
          requester_id: user?.id,
          request_reason: reason,
          status: 'Pending',
        });

      if (requestError) throw requestError;

      // Update compliance status
      const { error: statusError } = await supabase
        .from('note_compliance_status')
        .update({
          unlock_requested: true,
          unlock_request_date: new Date().toISOString(),
          unlock_request_reason: reason,
          unlock_requester_id: user?.id
        })
        .eq('id', complianceStatusId);

      if (statusError) throw statusError;

      toast({
        title: 'Request Submitted',
        description: 'Your unlock request has been submitted to your supervisor for review'
      });

      setReason('');
      onOpenChange(false);
      onRequestSubmitted?.();
    } catch (error) {
      console.error('Error submitting unlock request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit unlock request. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Note Unlock</DialogTitle>
          <DialogDescription>
            This note is locked due to compliance requirements. Please provide a detailed explanation
            for why you need to unlock this note. Your request will be reviewed by a supervisor.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Unlock Request *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this note needs to be unlocked. Include any clinical or administrative justification..."
              rows={6}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              Be specific about what needs to be corrected or added to the note.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !reason.trim()}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
