import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Clock, CheckCircle, XCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface UnlockRequest {
  id: string;
  compliance_status_id: string;
  note_id: string;
  note_type: string;
  requester_id: string;
  request_reason: string;
  status: string;
  request_date?: string;
  created_at?: string;
  expires_at?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  decision_reason?: string | null;
  unlock_duration_hours?: number | null;
  requester?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  compliance_status?: {
    client_id: string;
    session_date: string;
    days_overdue: number | null;
    clients?: {
      first_name: string;
      last_name: string;
      medical_record_number: string;
    };
  };
}

export const UnlockRequestManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<UnlockRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<UnlockRequest | null>(null);
  const [unlockHours, setUnlockHours] = useState<number>(72);
  const [decisionReason, setDecisionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadUnlockRequests();
  }, [user?.id]);

  const loadUnlockRequests = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('unlock_requests')
        .select(`
          *,
          requester:profiles(
            first_name,
            last_name,
            email
          ),
          compliance_status:note_compliance_status(
            client_id,
            session_date,
            days_overdue,
            clients!inner(
              first_name,
              last_name,
              medical_record_number
            )
          )
        `)
        .order('request_date', { ascending: false });

      if (error) throw error;

      const requestsWithDetails = (data || []).map(item => ({
        ...item,
        requester: Array.isArray(item.requester) ? item.requester[0] : item.requester,
        compliance_status: {
          ...(Array.isArray(item.compliance_status) ? item.compliance_status[0] : item.compliance_status),
          clients: Array.isArray(item.compliance_status?.clients) 
            ? item.compliance_status.clients[0] 
            : item.compliance_status?.clients
        }
      }));

      setRequests(requestsWithDetails);
    } catch (error) {
      console.error('Error loading unlock requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load unlock requests',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReviewRequest = (request: UnlockRequest) => {
    setSelectedRequest(request);
    setUnlockHours(72); // Default 72 hours (3 days)
    setDecisionReason('');
    setReviewDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest || !decisionReason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a reason for approving this request',
        variant: 'destructive'
      });
      return;
    }

    try {
      setProcessing(true);

      const unlockExpiresAt = new Date();
      unlockExpiresAt.setHours(unlockExpiresAt.getHours() + unlockHours);

      // Update unlock request
      const { error: requestError } = await supabase
        .from('unlock_requests')
        .update({
          status: 'Approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          decision_reason: decisionReason,
          unlock_duration_hours: unlockHours
        })
        .eq('id', selectedRequest.id);

      if (requestError) throw requestError;

      // Update compliance status
      const { error: statusError } = await supabase
        .from('note_compliance_status')
        .update({
          is_locked: false,
          unlock_approved: true,
          unlock_approved_by: user?.id,
          unlock_approved_date: new Date().toISOString(),
          unlock_expires_at: unlockExpiresAt.toISOString(),
          unlock_approval_reason: decisionReason
        })
        .eq('id', selectedRequest.compliance_status_id);

      if (statusError) throw statusError;

      toast({
        title: 'Request Approved',
        description: `Note unlocked for ${unlockHours} hours`
      });

      setReviewDialogOpen(false);
      loadUnlockRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve unlock request',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeny = async () => {
    if (!selectedRequest || !decisionReason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a reason for denying this request',
        variant: 'destructive'
      });
      return;
    }

    try {
      setProcessing(true);

      // Update unlock request
      const { error: requestError } = await supabase
        .from('unlock_requests')
        .update({
          status: 'Denied',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          decision_reason: decisionReason
        })
        .eq('id', selectedRequest.id);

      if (requestError) throw requestError;

      // Update compliance status to clear unlock request flags
      const { error: statusError } = await supabase
        .from('note_compliance_status')
        .update({
          unlock_requested: false
        })
        .eq('id', selectedRequest.compliance_status_id);

      if (statusError) throw statusError;

      toast({
        title: 'Request Denied',
        description: 'The unlock request has been denied'
      });

      setReviewDialogOpen(false);
      loadUnlockRequests();
    } catch (error) {
      console.error('Error denying request:', error);
      toast({
        title: 'Error',
        description: 'Failed to deny unlock request',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'Approved':
        return <Badge className="bg-success text-success-foreground"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'Denied':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Denied</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getNoteTypeLabel = (noteType: string) => {
    const labels: Record<string, string> = {
      'progress_note': 'Progress Note',
      'intake_assessment': 'Intake Assessment',
      'contact_note': 'Contact Note',
      'consultation_note': 'Consultation Note',
      'cancellation_note': 'Cancellation Note',
      'miscellaneous_note': 'Miscellaneous Note'
    };
    return labels[noteType] || noteType;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Unlock Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading unlock requests...</p>
        </CardContent>
      </Card>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'Pending');

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Unlock Requests
            </span>
            {pendingRequests.length > 0 && (
              <Badge variant="destructive">{pendingRequests.length} Pending</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {requests.length === 0 ? (
            <Alert>
              <AlertDescription>
                No unlock requests at this time.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <FileText className="h-4 w-4" />
                        <span className="font-medium text-sm">
                          {request.compliance_status?.clients?.last_name}, {request.compliance_status?.clients?.first_name}
                        </span>
                        {getStatusBadge(request.status)}
                        <Badge variant="outline" className="text-xs">
                          {getNoteTypeLabel(request.note_type)}
                        </Badge>
                      </div>

                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>
                          <strong>Requested by:</strong> {request.requester?.last_name}, {request.requester?.first_name}
                        </p>
                        <p>
                          <strong>Session Date:</strong> {format(new Date(request.compliance_status?.session_date || ''), 'MMM d, yyyy')}
                        </p>
                        <p>
                          <strong>Days Overdue:</strong> {request.compliance_status?.days_overdue || 0} days
                        </p>
                        <p>
                          <strong>Requested:</strong> {format(new Date(request.request_date || request.created_at || ''), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>

                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-xs font-medium mb-1">Request Reason:</p>
                        <p className="text-xs">{request.request_reason}</p>
                      </div>

                      {(request.decision_reason || request.review_notes) && (
                        <div className="bg-muted/50 rounded p-2">
                          <p className="text-xs font-medium mb-1">Decision Reason:</p>
                          <p className="text-xs">{request.decision_reason || request.review_notes}</p>
                          {request.unlock_duration_hours && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Unlock Duration: {request.unlock_duration_hours} hours
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {request.status === 'Pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleReviewRequest(request)}
                      >
                        Review
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Review Unlock Request</DialogTitle>
            <DialogDescription>
              Decide whether to approve or deny this unlock request. If approved, specify how long the note should remain unlocked.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded p-3 space-y-2">
                <p className="text-sm">
                  <strong>Client:</strong> {selectedRequest.compliance_status?.clients?.last_name}, {selectedRequest.compliance_status?.clients?.first_name}
                </p>
                <p className="text-sm">
                  <strong>Note Type:</strong> {getNoteTypeLabel(selectedRequest.note_type)}
                </p>
                <p className="text-sm">
                  <strong>Days Overdue:</strong> {selectedRequest.compliance_status?.days_overdue || 0} days
                </p>
                <p className="text-sm">
                  <strong>Requested by:</strong> {selectedRequest.requester?.last_name}, {selectedRequest.requester?.first_name}
                </p>
              </div>

              <div className="bg-muted/50 rounded p-3">
                <p className="text-sm font-medium mb-1">Request Reason:</p>
                <p className="text-sm">{selectedRequest.request_reason}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unlockHours">Unlock Duration (hours)</Label>
                <Input
                  id="unlockHours"
                  type="number"
                  min="1"
                  max="168"
                  value={unlockHours}
                  onChange={(e) => setUnlockHours(parseInt(e.target.value) || 72)}
                  disabled={processing}
                />
                <p className="text-xs text-muted-foreground">
                  Default: 72 hours (3 days). Maximum: 168 hours (7 days)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="decisionReason">Decision Reason *</Label>
                <Textarea
                  id="decisionReason"
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder="Provide your reasoning for approving or denying this request..."
                  rows={4}
                  disabled={processing}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setReviewDialogOpen(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeny}
              disabled={processing || !decisionReason.trim()}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Deny
            </Button>
            <Button
              onClick={handleApprove}
              disabled={processing || !decisionReason.trim()}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
