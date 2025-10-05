import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface RequestRevisionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cosignatureId: string;
  noteId: string;
  clinicianName: string;
  onSuccess?: () => void;
}

export function RequestRevisionsDialog({
  open,
  onOpenChange,
  cosignatureId,
  noteId,
  clinicianName,
  onSuccess,
}: RequestRevisionsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [revisionReason, setRevisionReason] = useState("");

  const handleRequestRevisions = async () => {
    if (!revisionReason.trim()) {
      toast({
        title: "Revision reason required",
        description: "Please provide a reason for requesting revisions.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Get current revision history
      const { data: currentData } = await supabase
        .from('note_cosignatures')
        .select('revision_history')
        .eq('id', cosignatureId)
        .single();

      const revisionHistory = Array.isArray(currentData?.revision_history) 
        ? currentData.revision_history 
        : [];
      
      // Add new revision request to history
      const newRevisionEntry = {
        revisionDate: new Date().toISOString(),
        revisionReason: revisionReason,
        revisionCompleteDate: null,
      };

      const updatedHistory = [...revisionHistory, newRevisionEntry];

      // Update the cosignature record
      const { error: updateError } = await supabase
        .from('note_cosignatures')
        .update({
          status: 'Revisions Requested',
          revisions_requested: true,
          revision_details: revisionReason,
          revision_history: updatedHistory as any,
          reviewed_date: new Date().toISOString(),
        })
        .eq('id', cosignatureId);

      if (updateError) throw updateError;

      // Unlock the clinical note for editing
      const { error: noteError } = await supabase
        .from('clinical_notes')
        .update({
          locked: false,
          locked_date: null,
          locked_by: null,
        })
        .eq('id', noteId);

      if (noteError) throw noteError;

      toast({
        title: "Revisions requested",
        description: `${clinicianName} has been notified to revise the note.`,
      });

      setRevisionReason("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error requesting revisions:', error);
      toast({
        title: "Error",
        description: "Failed to request revisions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Revisions</DialogTitle>
          <DialogDescription>
            Provide detailed feedback for {clinicianName} to revise this note.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="revision-reason">Revision Details *</Label>
            <Textarea
              id="revision-reason"
              placeholder="Describe the changes needed in detail..."
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground">
              Be specific about what needs to be changed or added to the note.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRequestRevisions}
            disabled={loading || !revisionReason.trim()}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Request Revisions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
