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
import { Save, ArrowLeft, FileSignature } from 'lucide-react';
import { SignatureDialog } from '@/components/intake/SignatureDialog';
import { useAuth } from '@/hooks/useAuth';

export default function ConsultationNote() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [saving, setSaving] = useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [clinicianName, setClinicianName] = useState('');
  const [availableClients, setAvailableClients] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    clientId: '',
    consultationDate: new Date().toISOString().split('T')[0],
    consultationType: 'Case Consultation',
    consultingName: '',
    consultingRole: '',
    consultingSpecialty: '',
    consultingOrganization: '',
    consultationReason: '',
    clinicalQuestion: '',
    informationProvided: '',
    informationReceived: '',
    recommendations: '',
    changesToTreatment: false,
    treatmentChanges: '',
    clientConsent: false,
    followUpConsultation: false,
    followUpPlan: '',
    billable: false,
    billingCode: '',
    status: 'Draft'
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
        consultation_date: formData.consultationDate,
        consultation_type: formData.consultationType,
        consulting_with: {
          name: formData.consultingName,
          role: formData.consultingRole,
          specialty: formData.consultingSpecialty,
          organization: formData.consultingOrganization
        },
        consultation_reason: formData.consultationReason,
        clinical_question: formData.clinicalQuestion,
        information_provided: formData.informationProvided,
        information_received: formData.informationReceived,
        recommendations: formData.recommendations,
        changes_to_treatment: formData.changesToTreatment,
        treatment_changes: formData.treatmentChanges,
        client_consent: formData.clientConsent,
        follow_up_consultation: formData.followUpConsultation,
        follow_up_plan: formData.followUpPlan,
        billable: formData.billable,
        billing_code: formData.billingCode,
        status: formData.status,
        created_by: user?.id,
      };

      const { error } = await supabase
        .from('consultation_notes')
        .insert(noteData);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Consultation note saved successfully',
      });

      navigate('/notes');
    } catch (error) {
      console.error('Error saving note:', error);
      toast({
        title: 'Error',
        description: 'Failed to save consultation note',
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
              <h1 className="text-3xl font-bold">Consultation Note</h1>
              <p className="text-muted-foreground">Document professional consultation</p>
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
                <Label>Consultation Date *</Label>
                <Input
                  type="date"
                  value={formData.consultationDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, consultationDate: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Consultation Type *</Label>
              <Select
                value={formData.consultationType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, consultationType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Case Consultation">Case Consultation</SelectItem>
                  <SelectItem value="Medication Consultation">Medication Consultation</SelectItem>
                  <SelectItem value="Diagnostic Consultation">Diagnostic Consultation</SelectItem>
                  <SelectItem value="Treatment Planning">Treatment Planning</SelectItem>
                  <SelectItem value="Collateral Consultation">Collateral Consultation</SelectItem>
                  <SelectItem value="Supervision">Supervision</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">Consulting With</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={formData.consultingName}
                    onChange={(e) => setFormData(prev => ({ ...prev, consultingName: e.target.value }))}
                    placeholder="Consultant name"
                  />
                </div>

                <div>
                  <Label>Role *</Label>
                  <Input
                    value={formData.consultingRole}
                    onChange={(e) => setFormData(prev => ({ ...prev, consultingRole: e.target.value }))}
                    placeholder="e.g., Psychiatrist, Supervisor"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Specialty</Label>
                  <Input
                    value={formData.consultingSpecialty}
                    onChange={(e) => setFormData(prev => ({ ...prev, consultingSpecialty: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <Label>Organization</Label>
                  <Input
                    value={formData.consultingOrganization}
                    onChange={(e) => setFormData(prev => ({ ...prev, consultingOrganization: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Consultation Reason *</Label>
              <Textarea
                value={formData.consultationReason}
                onChange={(e) => setFormData(prev => ({ ...prev, consultationReason: e.target.value }))}
                placeholder="Why was this consultation requested?"
                rows={3}
              />
            </div>

            <div>
              <Label>Clinical Question *</Label>
              <Textarea
                value={formData.clinicalQuestion}
                onChange={(e) => setFormData(prev => ({ ...prev, clinicalQuestion: e.target.value }))}
                placeholder="What specific question(s) were addressed?"
                rows={3}
              />
            </div>

            <div>
              <Label>Information Provided</Label>
              <Textarea
                value={formData.informationProvided}
                onChange={(e) => setFormData(prev => ({ ...prev, informationProvided: e.target.value }))}
                placeholder="What information did you provide to the consultant?"
                rows={4}
              />
            </div>

            <div>
              <Label>Information Received</Label>
              <Textarea
                value={formData.informationReceived}
                onChange={(e) => setFormData(prev => ({ ...prev, informationReceived: e.target.value }))}
                placeholder="What information did you receive from the consultant?"
                rows={4}
              />
            </div>

            <div>
              <Label>Recommendations</Label>
              <Textarea
                value={formData.recommendations}
                onChange={(e) => setFormData(prev => ({ ...prev, recommendations: e.target.value }))}
                placeholder="What recommendations were made?"
                rows={4}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="changes-to-treatment"
                  checked={formData.changesToTreatment}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, changesToTreatment: checked as boolean }))}
                />
                <Label htmlFor="changes-to-treatment">Changes to Treatment Plan</Label>
              </div>

              {formData.changesToTreatment && (
                <div>
                  <Label>Treatment Changes</Label>
                  <Textarea
                    value={formData.treatmentChanges}
                    onChange={(e) => setFormData(prev => ({ ...prev, treatmentChanges: e.target.value }))}
                    placeholder="Describe the changes to be made to the treatment plan"
                    rows={3}
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="client-consent"
                  checked={formData.clientConsent}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, clientConsent: checked as boolean }))}
                />
                <Label htmlFor="client-consent">Client Consent Obtained</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="follow-up-consultation"
                  checked={formData.followUpConsultation}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, followUpConsultation: checked as boolean }))}
                />
                <Label htmlFor="follow-up-consultation">Follow-up Consultation Needed</Label>
              </div>

              {formData.followUpConsultation && (
                <div>
                  <Label>Follow-up Plan</Label>
                  <Textarea
                    value={formData.followUpPlan}
                    onChange={(e) => setFormData(prev => ({ ...prev, followUpPlan: e.target.value }))}
                    rows={3}
                  />
                </div>
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
          noteType="Consultation Note"
        />
      </div>
    </DashboardLayout>
  );
}
