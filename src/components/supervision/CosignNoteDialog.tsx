import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, FileCheck, FileX, User, Calendar, FileText, AlertTriangle, Clock, ClipboardCheck } from "lucide-react";
import { format } from "date-fns";
import { RequestRevisionsDialog } from "./RequestRevisionsDialog";
import { RevisionHistoryViewer } from "./RevisionHistoryViewer";
import { useReviewTimeTracking } from "@/hooks/useReviewTimeTracking";
import { IncidentToBillingDialog, IncidentToBillingData } from "./IncidentToBillingDialog";

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
  const [showIncidentToDialog, setShowIncidentToDialog] = useState(false);
  
  // Incident-to billing data
  const [incidentToBillingData, setIncidentToBillingData] = useState<IncidentToBillingData>({
    isIncidentTo: false,
    requirementsMet: {
      initialServiceByProvider: false,
      establishedPlanOfCare: false,
      providerAvailableForSupervision: false,
      clientEstablished: false,
      superviseeQualified: false,
    },
    providerAttestation: {
      wasAvailableForSupervision: false,
      locationOfProvider: "",
      establishedTreatmentPlan: false,
      serviceProvidedPerPlan: false,
      attested: false,
    },
    attestationText: ""
  });
  
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

    if (incidentToBillingData.isIncidentTo && !incidentToBillingData.attestationText.trim()) {
      toast.error("Please provide attestation for incident-to billing");
      return;
    }

    setLoading(true);
    try {
      // Stop time tracking and get total review time
      const reviewTime = await stopTracking();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Update cosignature
      const { error } = await supabase
        .from('note_cosignatures')
        .update({
          supervisor_signature: signature,
          supervisor_signed_date: new Date().toISOString(),
          supervisor_comments: supervisorComments || null,
          status: 'Approved',
          time_spent_reviewing: reviewTime,
          is_incident_to: incidentToBillingData.isIncidentTo,
          supervisor_attestation: incidentToBillingData.isIncidentTo ? incidentToBillingData.attestationText : null,
        })
        .eq('id', cosignatureId);

      if (error) throw error;

      // If incident-to billing, create the billing record
      if (incidentToBillingData.isIncidentTo && cosignatureData) {
        const { data: insertedBilling, error: billingError } = await supabase
          .from('incident_to_billing')
          .insert({
            note_id: noteId,
            client_id: noteContent.client_id,
            session_id: noteContent.session_id,
            supervising_provider_id: user?.id,
            rendering_provider_id: cosignatureData.supervisee_id,
            requirements_met: incidentToBillingData.requirementsMet,
            provider_attestation: {
              ...incidentToBillingData.providerAttestation,
              attestationDate: new Date().toISOString(),
              attestationSignature: signature
            },
            billed_under_provider_id: user?.id,
            documentation_complete: true,
          })
          .select()
          .single();

        if (billingError) {
          console.error('Error creating incident-to billing record:', billingError);
          toast.error("Note cosigned but incident-to billing record failed");
        } else if (insertedBilling) {
          // Log audit trail
          await supabase
            .from('incident_to_audit_log')
            .insert({
              incident_to_billing_id: insertedBilling.id,
              note_id: noteId,
              action_type: 'created',
              performed_by: user?.id,
              notes: 'Incident-to billing record created with note cosignature',
            });

          // Run compliance check
          await supabase.functions.invoke('verify-incident-to-compliance', {
            body: { incidentToBillingId: insertedBilling.id }
          });
        }
      }

      // Call workflow to trigger notifications and update clinical note
      await supabase.functions.invoke('cosignature-workflow', {
        body: {
          action: 'cosign',
          cosignatureId,
          noteId,
          userId: user?.id,
          data: {
            comments: supervisorComments,
            timeSpent: reviewTime,
            isIncidentTo: incidentToBillingData.isIncidentTo,
            attestation: incidentToBillingData.isIncidentTo ? incidentToBillingData.attestationText : null
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
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Incident-to Billing</p>
                    <p className="text-sm text-muted-foreground">
                      Configure if this service qualifies for Medicare incident-to billing
                    </p>
                  </div>
                  {incidentToBillingData.isIncidentTo && (
                    <Badge variant="default" className="bg-green-600">
                      <ClipboardCheck className="mr-1 h-3 w-3" />
                      Configured
                    </Badge>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowIncidentToDialog(true)}
                >
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  {incidentToBillingData.isIncidentTo 
                    ? "Review Incident-to Requirements" 
                    : "Configure Incident-to Billing"}
                </Button>

                {incidentToBillingData.isIncidentTo && (
                  <div className="text-xs text-muted-foreground space-y-1 pt-2">
                    <p>✓ All requirements verified</p>
                    <p>✓ Provider attestation completed</p>
                    <p>✓ Location: {incidentToBillingData.providerAttestation.locationOfProvider}</p>
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

        {/* Incident-to Billing Dialog */}
        <IncidentToBillingDialog
          open={showIncidentToDialog}
          onOpenChange={setShowIncidentToDialog}
          onConfirm={(data) => setIncidentToBillingData(data)}
          initialData={incidentToBillingData}
        />
      </DialogContent>
    </Dialog>
  );
}