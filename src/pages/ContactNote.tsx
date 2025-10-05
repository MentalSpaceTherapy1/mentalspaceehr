import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Save, ArrowLeft, FileSignature, Plus, X, Lock } from 'lucide-react';
import { SignatureDialog } from '@/components/intake/SignatureDialog';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNoteLockStatus } from '@/hooks/useNoteLockStatus';
import { UnlockRequestDialog } from '@/components/compliance/UnlockRequestDialog';
import { format } from 'date-fns';

export default function ContactNote() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [saving, setSaving] = useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [clinicianName, setClinicianName] = useState('');
  const [availableClients, setAvailableClients] = useState<any[]>([]);
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [noteId] = useState<string | null>(null); // Will be set after creation
  
  const { isLocked, lockDetails, loading: lockLoading } = useNoteLockStatus(noteId, 'contact_note');

  const [formData, setFormData] = useState({
    clientId: '',
    contactDate: new Date().toISOString().split('T')[0],
    contactTime: new Date().toTimeString().slice(0, 5),
    contactDuration: '',
    contactType: 'Phone Call',
    contactInitiatedBy: 'Client',
    contactPurpose: 'Appointment Scheduling',
    contactDetails: '',
    clinicalSignificance: false,
    riskIssues: false,
    riskDetails: '',
    interventionProvided: '',
    followUpNeeded: false,
    followUpPlan: '',
    followUpDate: '',
    collateralContact: false,
    collateralName: '',
    collateralRelationship: '',
    releaseOnFile: false,
    billable: false,
    billingCode: '',
    status: 'Draft',
    participants: [] as { name: string; role: string }[],
    location: '',
    outcome: '',
    relatedDocumentation: ''
  });

  useEffect(() => {
    loadClients();
    loadClinicianName();
  }, []);

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
      console.error('Error loading clients:', error);
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
      console.error('Error fetching clinician name:', error);
    }
  };

  const addParticipant = () => {
    setFormData(prev => ({
      ...prev,
      participants: [...prev.participants, { name: '', role: '' }]
    }));
  };

  const updateParticipant = (index: number, field: 'name' | 'role', value: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.map((p, i) => 
        i === index ? { ...p, [field]: value } : p
      )
    }));
  };

  const removeParticipant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter((_, i) => i !== index)
    }));
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
        contact_date: formData.contactDate,
        contact_time: formData.contactTime,
        contact_duration: formData.contactDuration ? parseInt(formData.contactDuration) : null,
        contact_type: formData.contactType,
        contact_initiated_by: formData.contactInitiatedBy,
        contact_purpose: formData.contactPurpose,
        contact_details: formData.contactDetails,
        clinical_significance: formData.clinicalSignificance,
        risk_issues: formData.riskIssues,
        risk_details: formData.riskDetails,
        intervention_provided: formData.interventionProvided,
        follow_up_needed: formData.followUpNeeded,
        follow_up_plan: formData.followUpPlan,
        follow_up_date: formData.followUpDate || null,
        collateral_contact: {
          wasCollateral: formData.collateralContact,
          contactName: formData.collateralName,
          contactRelationship: formData.collateralRelationship,
          releaseOnFile: formData.releaseOnFile
        },
        billable: formData.billable,
        billing_code: formData.billingCode,
        status: formData.status,
        created_by: user?.id,
        participants: formData.participants.filter(p => p.name && p.role),
        location: formData.location || null,
        outcome: formData.outcome || null,
        related_documentation: formData.relatedDocumentation || null,
      };

      const { error } = await supabase
        .from('contact_notes')
        .insert(noteData);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Contact note saved successfully',
      });

      navigate('/notes');
    } catch (error) {
      console.error('Error saving note:', error);
      toast({
        title: 'Error',
        description: 'Failed to save contact note',
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
              <h1 className="text-3xl font-bold">Contact Note</h1>
              <p className="text-muted-foreground">Document client contact or communication</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setSignatureDialogOpen(true)} disabled={saving} variant="outline">
              <FileSignature className="h-4 w-4 mr-2" />
              Sign Note
            </Button>
            <Button onClick={saveNote} disabled={saving}>
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
                <Label>Contact Date *</Label>
                <Input
                  type="date"
                  value={formData.contactDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Contact Time *</Label>
                <Input
                  type="time"
                  value={formData.contactTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactTime: e.target.value }))}
                />
              </div>

              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formData.contactDuration}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactDuration: e.target.value }))}
                  placeholder="0"
                />
              </div>

              <div>
                <Label>Contact Type *</Label>
                <Select
                  value={formData.contactType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, contactType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Phone Call">Phone Call</SelectItem>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="Text Message">Text Message</SelectItem>
                    <SelectItem value="Secure Message">Secure Message</SelectItem>
                    <SelectItem value="Collateral Contact">Collateral Contact</SelectItem>
                    <SelectItem value="Coordination of Care">Coordination of Care</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Initiated By *</Label>
                <Select
                  value={formData.contactInitiatedBy}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, contactInitiatedBy: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Client">Client</SelectItem>
                    <SelectItem value="Clinician">Clinician</SelectItem>
                    <SelectItem value="Family Member">Family Member</SelectItem>
                    <SelectItem value="Other Provider">Other Provider</SelectItem>
                    <SelectItem value="School">School</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Contact Purpose *</Label>
                <Select
                  value={formData.contactPurpose}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, contactPurpose: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Appointment Scheduling">Appointment Scheduling</SelectItem>
                    <SelectItem value="Medication Question">Medication Question</SelectItem>
                    <SelectItem value="Crisis Call">Crisis Call</SelectItem>
                    <SelectItem value="Progress Check">Progress Check</SelectItem>
                    <SelectItem value="Coordination with Other Provider">Coordination with Other Provider</SelectItem>
                    <SelectItem value="Administrative">Administrative</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Location</Label>
                <Select
                  value={formData.location}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Office">Office</SelectItem>
                    <SelectItem value="Phone">Phone</SelectItem>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="Virtual">Virtual/Video</SelectItem>
                    <SelectItem value="Home Visit">Home Visit</SelectItem>
                    <SelectItem value="Community">Community Setting</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Participants</Label>
              <div className="space-y-2 mt-2">
                {formData.participants.map((participant, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Name"
                      value={participant.name}
                      onChange={(e) => updateParticipant(index, 'name', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Role/Relationship"
                      value={participant.role}
                      onChange={(e) => updateParticipant(index, 'role', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeParticipant(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addParticipant}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Participant
                </Button>
              </div>
            </div>

            <div>
              <Label>Contact Details *</Label>
              <Textarea
                value={formData.contactDetails}
                onChange={(e) => setFormData(prev => ({ ...prev, contactDetails: e.target.value }))}
                placeholder="Describe what was discussed during the contact..."
                rows={5}
              />
            </div>

            <div>
              <Label>Outcome/Results</Label>
              <Textarea
                value={formData.outcome}
                onChange={(e) => setFormData(prev => ({ ...prev, outcome: e.target.value }))}
                placeholder="Document the outcome or results of this contact..."
                rows={4}
              />
            </div>

            <div>
              <Label>Related Documentation</Label>
              <Input
                value={formData.relatedDocumentation}
                onChange={(e) => setFormData(prev => ({ ...prev, relatedDocumentation: e.target.value }))}
                placeholder="Reference other notes, forms, or documentation"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="clinical-significance"
                  checked={formData.clinicalSignificance}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, clinicalSignificance: checked as boolean }))}
                />
                <Label htmlFor="clinical-significance">Clinically Significant</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="risk-issues"
                  checked={formData.riskIssues}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, riskIssues: checked as boolean }))}
                />
                <Label htmlFor="risk-issues">Risk Issues Identified</Label>
              </div>

              {formData.riskIssues && (
                <div>
                  <Label>Risk Details</Label>
                  <Textarea
                    value={formData.riskDetails}
                    onChange={(e) => setFormData(prev => ({ ...prev, riskDetails: e.target.value }))}
                    rows={3}
                  />
                </div>
              )}

              {formData.clinicalSignificance && (
                <div>
                  <Label>Intervention Provided</Label>
                  <Textarea
                    value={formData.interventionProvided}
                    onChange={(e) => setFormData(prev => ({ ...prev, interventionProvided: e.target.value }))}
                    rows={3}
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="follow-up-needed"
                  checked={formData.followUpNeeded}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, followUpNeeded: checked as boolean }))}
                />
                <Label htmlFor="follow-up-needed">Follow-up Needed</Label>
              </div>

              {formData.followUpNeeded && (
                <>
                  <div>
                    <Label>Follow-up Date</Label>
                    <Input
                      type="date"
                      value={formData.followUpDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, followUpDate: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label>Follow-up Plan</Label>
                    <Textarea
                      value={formData.followUpPlan}
                      onChange={(e) => setFormData(prev => ({ ...prev, followUpPlan: e.target.value }))}
                      rows={3}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="billable"
                  checked={formData.billable}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, billable: checked as boolean }))}
                />
                <Label htmlFor="billable">Billable Service</Label>
              </div>

              {formData.billable && (
                <div>
                  <Label>Billing Code</Label>
                  <Input
                    value={formData.billingCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, billingCode: e.target.value }))}
                    placeholder="CPT code"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <SignatureDialog
          open={signatureDialogOpen}
          onOpenChange={setSignatureDialogOpen}
          onSign={handleSign}
          clinicianName={clinicianName}
          noteType="Contact Note"
        />
      </div>
    </DashboardLayout>
  );
}
