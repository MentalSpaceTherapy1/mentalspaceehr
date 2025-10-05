import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, FileCheck, FileX, User, Calendar, FileText, AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";
import { RequestRevisionsDialog } from "./RequestRevisionsDialog";
import { RevisionHistoryViewer } from "./RevisionHistoryViewer";
import { useReviewTimeTracking } from "@/hooks/useReviewTimeTracking";

interface CosignNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cosignatureId: string;
  noteId: string;
  noteType: string;
  clientName: string;
  clinicianName: string;
  createdDate: string;
  onSuccess?: () => void;
}

export function CosignNoteDialog({
  open,
  onOpenChange,
  cosignatureId,
  noteId,
  noteType,
  clientName,
  clinicianName,
  createdDate,
  onSuccess
}: CosignNoteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [noteContent, setNoteContent] = useState<any>(null);
  const [cosignatureData, setCosignatureData] = useState<any>(null);
  const [loadingNote, setLoadingNote] = useState(true);
  const [supervisorComments, setSupervisorComments] = useState('');
  const [signature, setSignature] = useState('');
  const [showRevisionsDialog, setShowRevisionsDialog] = useState(false);
  
  // Incident-to billing
  const [isIncidentTo, setIsIncidentTo] = useState(false);
  const [supervisorAttestation, setSupervisorAttestation] = useState(
    "I attest that I was present during the provision of these services and provided direct supervision to the clinician. The services were rendered under my direct supervision in accordance with Medicare incident-to billing requirements."
  );
  
  // Time tracking
  const { startTracking, stopTracking, isTracking, elapsedMinutes } = useReviewTimeTracking(cosignatureId);

  useEffect(() => {
    if (open && noteId) {
      loadNoteContent();
      // Start tracking time when dialog opens
      startTracking();
    }
    
    // Stop tracking when dialog closes
    return () => {
      if (isTracking) {
        stopTracking();
      }
    };
  }, [open, noteId]);

  const loadNoteContent = async () => {
    try {
      setLoadingNote(true);
      
      // Load note content
      const { data, error } = await supabase
        .from('clinical_notes')
        .select('*')
        .eq('id', noteId)
        .single();

      if (error) throw error;
      setNoteContent(data);

      // Load cosignature data for revision history
      const { data: cosigData, error: cosigError } = await supabase
        .from('note_cosignatures')
        .select('*')
        .eq('id', cosignatureId)
        .single();

      if (cosigError) throw cosigError;
      setCosignatureData(cosigData);
    } catch (error: any) {
      console.error('Error loading note:', error);
      toast.error("Failed to load note content");
    } finally {
      setLoadingNote(false);
    }
  };

  const handleSign = async () => {
    if (!signature.trim()) {
      toast.error("Please provide your signature");
      return;
    }

    if (isIncidentTo && !supervisorAttestation.trim()) {
      toast.error("Please provide attestation for incident-to billing");
      return;
    }

    setLoading(true);
    try {
      // Stop time tracking and get total review time
      const reviewTime = await stopTracking();

      const { error } = await supabase
        .from('note_cosignatures')
        .update({
          supervisor_signature: signature,
          supervisor_signed_date: new Date().toISOString(),
          supervisor_comments: supervisorComments || null,
          status: 'Approved',
          time_spent_reviewing: reviewTime,
          is_incident_to: isIncidentTo,
          supervisor_attestation: isIncidentTo ? supervisorAttestation : null,
        })
        .eq('id', cosignatureId);

      if (error) throw error;

      // Call workflow to trigger notifications and update clinical note
      await supabase.functions.invoke('cosignature-workflow', {
        body: {
          action: 'cosign',
          cosignatureId,
          noteId,
          userId: (await supabase.auth.getUser()).data.user?.id,
          data: {
            comments: supervisorComments,
            timeSpent: reviewTime,
            isIncidentTo,
            attestation: isIncidentTo ? supervisorAttestation : null
          }
        }
      });

      toast.success("Note co-signed successfully");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error signing note:', error);
      toast.error(error.message || "Failed to sign note");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!supervisorComments.trim()) {
      toast.error("Please provide comments explaining the rejection");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('note_cosignatures')
        .update({
          supervisor_comments: supervisorComments,
          status: 'Rejected'
        })
        .eq('id', cosignatureId);

      if (error) throw error;

      toast.success("Note rejected with feedback");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error rejecting note:', error);
      toast.error(error.message || "Failed to reject note");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Co-Sign Clinical Note
              </DialogTitle>
              <DialogDescription>
                Review and co-sign this clinical note
              </DialogDescription>
            </div>
            {isTracking && (
              <Badge variant="outline" className="flex items-center gap-2">
                <Clock className="h-3 w-3 animate-pulse" />
                Reviewing: {elapsedMinutes}m
              </Badge>
            )}
          </div>
        </DialogHeader>

        {loadingNote ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Note Metadata */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Client
                </p>
                <p className="font-medium">{clientName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Clinician
                </p>
                <p className="font-medium">{clinicianName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Note Type
                </p>
                <Badge variant="outline">{noteType}</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date Created
                </p>
                <p className="font-medium">{format(new Date(createdDate), 'MMM dd, yyyy')}</p>
              </div>
            </div>

            <Separator />

            {/* Note Content */}
            <div className="space-y-4">
              <h4 className="font-semibold">Note Content</h4>
              {noteContent?.content && (
                <div className="space-y-3 p-4 border rounded-lg bg-background">
                  {Object.entries(noteContent.content).map(([section, content]: [string, any]) => (
                    <div key={section} className="space-y-2">
                      <p className="font-medium text-sm capitalize">{section.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              
              {noteContent?.diagnoses && noteContent.diagnoses.length > 0 && (
                <div className="space-y-2">
                  <p className="font-medium text-sm">Diagnoses</p>
                  <div className="flex flex-wrap gap-2">
                    {noteContent.diagnoses.map((dx: string, idx: number) => (
                      <Badge key={idx} variant="secondary">{dx}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {noteContent?.risk_flags && noteContent.risk_flags.length > 0 && (
                <div className="space-y-2">
                  <p className="font-medium text-sm text-destructive">Risk Flags</p>
                  <div className="flex flex-wrap gap-2">
                    {noteContent.risk_flags.map((flag: any, idx: number) => (
                      <Badge key={idx} variant="destructive">
                        {flag.type || flag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Revision History */}
            {cosignatureData?.revision_history && cosignatureData.revision_history.length > 0 && (
              <>
                <RevisionHistoryViewer revisionHistory={cosignatureData.revision_history} />
                <Separator />
              </>
            )}

            {/* Supervisor Feedback */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="comments">Supervisor Comments</Label>
                <Textarea
                  id="comments"
                  placeholder="Optional: Add comments or feedback for the clinician"
                  rows={4}
                  value={supervisorComments}
                  onChange={(e) => setSupervisorComments(e.target.value)}
                />
              </div>

              {/* Incident-to Billing */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="incident-to"
                    checked={isIncidentTo}
                    onCheckedChange={(checked) => setIsIncidentTo(checked as boolean)}
                  />
                  <Label htmlFor="incident-to" className="font-semibold cursor-pointer">
                    This is Incident-to billing
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Check this box if services were provided under Medicare incident-to billing rules
                </p>

                {isIncidentTo && (
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="attestation">Supervisor Attestation *</Label>
                    <Textarea
                      id="attestation"
                      rows={4}
                      value={supervisorAttestation}
                      onChange={(e) => setSupervisorAttestation(e.target.value)}
                      className="bg-background"
                    />
                    <p className="text-xs text-muted-foreground">
                      Confirm you provided direct supervision during service provision
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signature">Supervisor Signature *</Label>
                <input
                  id="signature"
                  type="text"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Type your full name to sign"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  By signing, you confirm you have reviewed this note and it meets clinical standards
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRevisionsDialog(true)}
                disabled={loading}
                className="border-amber-600 text-amber-600 hover:bg-amber-50"
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Request Revisions
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleReject}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <FileX className="mr-2 h-4 w-4" />
                Reject Note
              </Button>
              <Button
                type="button"
                onClick={handleSign}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <FileCheck className="mr-2 h-4 w-4" />
                Sign & Approve
              </Button>
            </div>
          </div>
        )}

        {/* Request Revisions Dialog */}
        <RequestRevisionsDialog
          open={showRevisionsDialog}
          onOpenChange={setShowRevisionsDialog}
          cosignatureId={cosignatureId}
          noteId={noteId}
          clinicianName={clinicianName}
          onSuccess={() => {
            onOpenChange(false);
            onSuccess?.();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}