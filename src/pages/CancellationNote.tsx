import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, ArrowLeft, FileSignature, Lock } from 'lucide-react';
import { SignatureDialog } from '@/components/intake/SignatureDialog';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNoteLockStatus } from '@/hooks/useNoteLockStatus';
import { UnlockRequestDialog } from '@/components/compliance/UnlockRequestDialog';
import { format } from 'date-fns';

export default function CancellationNote() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('appointmentId');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [clinicianName, setClinicianName] = useState('');
  const [availableClients, setAvailableClients] = useState<any[]>([]);
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [noteId] = useState<string | null>(null); // Will be set after creation
  
  const { isLocked, lockDetails, loading: lockLoading } = useNoteLockStatus(noteId, 'cancellation_note');

  const [formData, setFormData] = useState({
    clientId: '',
    appointmentId: appointmentId || '',
    cancellationDate: new Date().toISOString().split('T')[0],
    appointmentDate: '',
    appointmentTime: '',
    cancelledBy: 'Client' as 'Client' | 'Clinician' | 'Practice',
    noticeGiven: 'More than 24 hours' as 'More than 24 hours' | 'Less than 24 hours' | 'Same Day' | 'No Show',
    cancellationReason: 'Client Request',
    reasonDetails: '',
    feeAssessed: false,
    feeAmount: '',
    feeWaived: false,
    waiverReason: '',
    clinicalConcerns: false,
    concernDetails: '',
    followUpNeeded: false,
    followUpPlan: '',
    rescheduled: false,
    newAppointmentDate: '',
    clientContacted: false,
    contactMethod: '',
    contactDate: '',
    contactOutcome: '',
    status: 'Draft'
  });

  useEffect(() => {
    loadClients();
    loadClinicianName();
    if (appointmentId) {
      loadAppointmentDetails();
    }
  }, [appointmentId]);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, medical_record_number')
        .eq('status', 'Active')
        .order('last_name');

      if (error) throw error;
      setAvailableClients(data || []);
    } catch (error) {
      // Silently handle - non-critical
    }
  };

  const loadClinicianName = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      if (data) {
        setClinicianName(`${data.first_name} ${data.last_name}`);
      }
    } catch (error) {
      // Silently handle - non-critical
    }
  };

  const loadAppointmentDetails = async () => {
    if (!appointmentId) return;

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData(prev => ({
          ...prev,
          clientId: data.client_id,
          appointmentDate: data.appointment_date,
          appointmentTime: data.start_time,
        }));
      }
    } catch (error) {
      console.error('Error loading appointment:', error);
    }
  };

  const saveNote = async () => {
    if (!formData.clientId) {
      toast({
        title: 'Required Field Missing',
        description: 'Please select a client',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const noteData: any = {
        client_id: formData.clientId,
        clinician_id: user?.id,
        appointment_id: formData.appointmentId || null,
        cancellation_date: formData.cancellationDate,
        appointment_date: formData.appointmentDate,
        appointment_time: formData.appointmentTime,
        cancelled_by: formData.cancelledBy,
        notice_given: formData.noticeGiven,
        cancellation_reason: formData.cancellationReason,
        reason_details: formData.reasonDetails,
        fee_assessed: formData.feeAssessed,
        fee_amount: formData.feeAmount ? parseFloat(formData.feeAmount) : null,
        fee_waived: formData.feeWaived,
        waiver_reason: formData.waiverReason,
        clinical_concerns: formData.clinicalConcerns,
        concern_details: formData.concernDetails,
        follow_up_needed: formData.followUpNeeded,
        follow_up_plan: formData.followUpPlan,
        rescheduled: formData.rescheduled,
        new_appointment_date: formData.newAppointmentDate || null,
        client_contacted: formData.clientContacted,
        contact_method: formData.contactMethod,
        contact_date: formData.contactDate || null,
        contact_outcome: formData.contactOutcome,
        status: formData.status,
        created_by: user?.id,
      };

      const { error } = await supabase
        .from('cancellation_notes')
        .insert(noteData);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Cancellation note saved successfully',
      });

      navigate('/notes');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save cancellation note',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSign = async () => {
    await saveNote();
    setSignatureDialogOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/notes')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Cancellation Note</h1>
              <p className="text-muted-foreground">Document appointment cancellation</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setSignatureDialogOpen(true)} disabled={saving || loading} variant="outline">
              <FileSignature className="h-4 w-4 mr-2" />
              Sign Note
            </Button>
            <Button onClick={saveNote} disabled={saving || loading}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client *</Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, clientId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.last_name}, {client.first_name} ({client.medical_record_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Cancellation Date *</Label>
                <Input
                  type="date"
                  value={formData.cancellationDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, cancellationDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Original Appointment Date *</Label>
                <Input
                  type="date"
                  value={formData.appointmentDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, appointmentDate: e.target.value }))}
                />
              </div>

              <div>
                <Label>Original Appointment Time *</Label>
                <Input
                  type="time"
                  value={formData.appointmentTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, appointmentTime: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cancelled By *</Label>
                <Select
                  value={formData.cancelledBy}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, cancelledBy: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Client">Client</SelectItem>
                    <SelectItem value="Clinician">Clinician</SelectItem>
                    <SelectItem value="Practice">Practice</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Notice Given *</Label>
                <Select
                  value={formData.noticeGiven}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, noticeGiven: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="More than 24 hours">More than 24 hours</SelectItem>
                    <SelectItem value="Less than 24 hours">Less than 24 hours</SelectItem>
                    <SelectItem value="Same Day">Same Day</SelectItem>
                    <SelectItem value="No Show">No Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Cancellation Reason *</Label>
              <Select
                value={formData.cancellationReason}
                onValueChange={(value) => setFormData(prev => ({ ...prev, cancellationReason: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Client Request">Client Request</SelectItem>
                  <SelectItem value="Illness">Illness</SelectItem>
                  <SelectItem value="Emergency">Emergency</SelectItem>
                  <SelectItem value="Transportation">Transportation</SelectItem>
                  <SelectItem value="Financial">Financial</SelectItem>
                  <SelectItem value="Scheduling Conflict">Scheduling Conflict</SelectItem>
                  <SelectItem value="Provider Cancellation">Provider Cancellation</SelectItem>
                  <SelectItem value="Weather">Weather</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Reason Details</Label>
              <Textarea
                value={formData.reasonDetails}
                onChange={(e) => setFormData(prev => ({ ...prev, reasonDetails: e.target.value }))}
                placeholder="Additional details about the cancellation..."
                rows={3}
              />
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">Fees</h3>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fee-assessed"
                  checked={formData.feeAssessed}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, feeAssessed: checked as boolean }))}
                />
                <Label htmlFor="fee-assessed">Fee Assessed</Label>
              </div>

              {formData.feeAssessed && (
                <>
                  <div>
                    <Label>Fee Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.feeAmount}
                      onChange={(e) => setFormData(prev => ({ ...prev, feeAmount: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="fee-waived"
                      checked={formData.feeWaived}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, feeWaived: checked as boolean }))}
                    />
                    <Label htmlFor="fee-waived">Fee Waived</Label>
                  </div>

                  {formData.feeWaived && (
                    <div>
                      <Label>Waiver Reason</Label>
                      <Textarea
                        value={formData.waiverReason}
                        onChange={(e) => setFormData(prev => ({ ...prev, waiverReason: e.target.value }))}
                        rows={2}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">Clinical Concerns</h3>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="clinical-concerns"
                  checked={formData.clinicalConcerns}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, clinicalConcerns: checked as boolean }))}
                />
                <Label htmlFor="clinical-concerns">Clinical Concerns</Label>
              </div>

              {formData.clinicalConcerns && (
                <div>
                  <Label>Concern Details</Label>
                  <Textarea
                    value={formData.concernDetails}
                    onChange={(e) => setFormData(prev => ({ ...prev, concernDetails: e.target.value }))}
                    placeholder="Details about clinical concerns..."
                    rows={3}
                  />
                </div>
              )}
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">Follow-Up</h3>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="follow-up-needed"
                  checked={formData.followUpNeeded}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, followUpNeeded: checked as boolean }))}
                />
                <Label htmlFor="follow-up-needed">Follow-Up Needed</Label>
              </div>

              {formData.followUpNeeded && (
                <>
                  <div>
                    <Label>Follow-Up Plan</Label>
                    <Textarea
                      value={formData.followUpPlan}
                      onChange={(e) => setFormData(prev => ({ ...prev, followUpPlan: e.target.value }))}
                      placeholder="Plan for follow-up..."
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rescheduled"
                      checked={formData.rescheduled}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, rescheduled: checked as boolean }))}
                    />
                    <Label htmlFor="rescheduled">Rescheduled</Label>
                  </div>

                  {formData.rescheduled && (
                    <div>
                      <Label>New Appointment Date</Label>
                      <Input
                        type="date"
                        value={formData.newAppointmentDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, newAppointmentDate: e.target.value }))}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">Client Contact</h3>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="client-contacted"
                  checked={formData.clientContacted}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, clientContacted: checked as boolean }))}
                />
                <Label htmlFor="client-contacted">Client Contacted</Label>
              </div>

              {formData.clientContacted && (
                <>
                  <div>
                    <Label>Contact Method</Label>
                    <Input
                      type="text"
                      value={formData.contactMethod}
                      onChange={(e) => setFormData(prev => ({ ...prev, contactMethod: e.target.value }))}
                      placeholder="How was the client contacted?"
                    />
                  </div>

                  <div>
                    <Label>Contact Date</Label>
                    <Input
                      type="date"
                      value={formData.contactDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, contactDate: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label>Contact Outcome</Label>
                    <Textarea
                      value={formData.contactOutcome}
                      onChange={(e) => setFormData(prev => ({ ...prev, contactOutcome: e.target.value }))}
                      placeholder="What was the outcome of contacting the client?"
                      rows={3}
                    />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <SignatureDialog
          open={signatureDialogOpen}
          onOpenChange={setSignatureDialogOpen}
          onSign={handleSign}
          clinicianName={clinicianName}
          noteType="Cancellation Note"
        />
      </div>
    </DashboardLayout>
  );
}
