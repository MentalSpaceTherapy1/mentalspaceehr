import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NoteCosignature } from "@/hooks/useNoteCosignatures";
import { useNavigate } from "react-router-dom";

interface NoteRevisionPanelProps {
  cosignature: NoteCosignature;
  onResubmit?: () => void;
}

export function NoteRevisionPanel({ cosignature, onResubmit }: NoteRevisionPanelProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const latestRevision = cosignature.revision_history && cosignature.revision_history.length > 0
    ? cosignature.revision_history[cosignature.revision_history.length - 1]
    : null;

  const handleResubmitForCosign = async () => {
    try {
      setLoading(true);

      // Update revision history to mark as complete
      const revisionHistory = Array.isArray(cosignature.revision_history)
        ? cosignature.revision_history
        : [];
      const updatedHistory = [...revisionHistory];
      if (updatedHistory.length > 0) {
        updatedHistory[updatedHistory.length - 1].revisionCompleteDate = new Date().toISOString();
      }

      // Update cosignature status
      const { error } = await supabase
        .from('note_cosignatures')
        .update({
          status: 'Pending Review',
          revision_history: updatedHistory as any,
          revisions_requested: false,
          submitted_for_cosign_date: new Date().toISOString(),
        })
        .eq('id', cosignature.id);

      if (error) throw error;

      // Lock the clinical note again
      const { error: noteError } = await supabase
        .from('clinical_notes')
        .update({
          locked: true,
          locked_date: new Date().toISOString(),
          locked_by: cosignature.clinician_id,
        })
        .eq('id', cosignature.note_id);

      if (noteError) throw noteError;

      toast({
        title: "Note resubmitted",
        description: "Your revised note has been submitted for supervisor review.",
      });

      onResubmit?.();
    } catch (error) {
      console.error('Error resubmitting note:', error);
      toast({
        title: "Error",
        description: "Failed to resubmit note. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditNote = () => {
    // Navigate to the appropriate note editor based on note type
    if (cosignature.note_type === 'progress_note') {
      navigate(`/progress-note/${cosignature.note_id}`);
    } else if (cosignature.note_type === 'clinical_note') {
      navigate(`/note-editor/${cosignature.note_id}`);
    }
  };

  if (!latestRevision || cosignature.status !== 'Revisions Requested') {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Revisions Requested
            </CardTitle>
            <CardDescription>
              Your supervisor has requested changes to this note
            </CardDescription>
          </div>
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
            Action Required
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-1">Supervisor:</p>
          <p className="text-sm text-muted-foreground">
            {cosignature.clinician?.first_name} {cosignature.clinician?.last_name}
          </p>
        </div>

        <div>
          <p className="text-sm font-medium mb-1">Requested on:</p>
          <p className="text-sm text-muted-foreground">
            {format(new Date(latestRevision.revisionDate), "PPp")}
          </p>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Revision Details:</p>
          <Alert>
            <AlertDescription className="text-sm whitespace-pre-wrap">
              {latestRevision.revisionReason}
            </AlertDescription>
          </Alert>
        </div>

        <div className="pt-2">
          <p className="text-sm text-muted-foreground italic">
            Please review the feedback above and make the necessary changes to your note before resubmitting.
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleEditNote}
          className="flex-1"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Edit Note
        </Button>
        <Button
          onClick={handleResubmitForCosign}
          disabled={loading}
          className="flex-1"
        >
          {loading ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4 animate-spin" />
              Resubmitting...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Resubmit for Cosign
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
