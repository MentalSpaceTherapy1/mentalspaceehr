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
import { Save, ArrowLeft, FileSignature, Sparkles, Check, X, Edit } from 'lucide-react';
import { SignatureDialog } from '@/components/intake/SignatureDialog';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ConsultationNote() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [saving, setSaving] = useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [clinicianName, setClinicianName] = useState('');
  const [availableClients, setAvailableClients] = useState<any[]>([]);
  const [generatingRecommendations, setGeneratingRecommendations] = useState(false);
  const [generatingChanges, setGeneratingChanges] = useState(false);
  const [generatingFollowUp, setGeneratingFollowUp] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const [suggestionType, setSuggestionType] = useState<'recommendations' | 'changes' | 'followup' | null>(null);
  const [isEditingSuggestion, setIsEditingSuggestion] = useState(false);

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

  const generateAIContent = async (type: 'recommendations' | 'changes' | 'followup') => {
    if (!formData.clientId) {
      toast({
        title: 'Error',
        description: 'Please select a client first',
        variant: 'destructive',
      });
      return;
    }

    const setGenerating = 
      type === 'recommendations' ? setGeneratingRecommendations :
      type === 'changes' ? setGeneratingChanges : setGeneratingFollowUp;

    try {
      setGenerating(true);
      setSuggestionType(type);

      const context = `
Consultation Type: ${formData.consultationType}
Consulting With: ${formData.consultingName} (${formData.consultingRole})
Consultation Reason: ${formData.consultationReason}
Clinical Question: ${formData.clinicalQuestion}
Information Provided: ${formData.informationProvided}
Information Received: ${formData.informationReceived}
${type === 'recommendations' ? `Current Recommendations: ${formData.recommendations}` : ''}
${type === 'changes' ? `Current Treatment Changes: ${formData.treatmentChanges}` : ''}
${type === 'followup' ? `Current Follow-up Plan: ${formData.followUpPlan}` : ''}
      `.trim();

      const { data, error } = await supabase.functions.invoke('generate-section-content', {
        body: {
          sectionType: `consultation_${type}`,
          context,
          clientId: formData.clientId,
        }
      });

      if (error) throw error;

      if (data?.content) {
        setAiSuggestion(data.content);
        toast({
          title: 'AI Suggestion Generated',
          description: 'Review and edit the suggestion, then accept or reject it.',
        });
      }
    } catch (error: any) {
      console.error('Error generating AI content:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate AI suggestion',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  const acceptSuggestion = () => {
    if (aiSuggestion && suggestionType) {
      if (suggestionType === 'recommendations') {
        setFormData(prev => ({ ...prev, recommendations: aiSuggestion }));
      } else if (suggestionType === 'changes') {
        setFormData(prev => ({ ...prev, treatmentChanges: aiSuggestion }));
      } else if (suggestionType === 'followup') {
        setFormData(prev => ({ ...prev, followUpPlan: aiSuggestion }));
      }
      setAiSuggestion(null);
      setSuggestionType(null);
      setIsEditingSuggestion(false);
      toast({
        title: 'Suggestion Applied',
        description: 'AI suggestion has been applied to the note',
      });
    }
  };

  const rejectSuggestion = () => {
    setAiSuggestion(null);
    setSuggestionType(null);
    setIsEditingSuggestion(false);
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
              <div className="flex items-center justify-between mb-2">
                <Label>Recommendations</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => generateAIContent('recommendations')}
                  disabled={generatingRecommendations || !formData.clientId}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {generatingRecommendations ? 'Generating...' : 'Generate AI Suggestions'}
                </Button>
              </div>

              {aiSuggestion && suggestionType === 'recommendations' && (
                <Alert className="mb-4">
                  <AlertDescription>
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium">AI Suggestion:</span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setIsEditingSuggestion(!isEditingSuggestion)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={acceptSuggestion}>
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={rejectSuggestion}>
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                      {isEditingSuggestion ? (
                        <Textarea
                          value={aiSuggestion}
                          onChange={(e) => setAiSuggestion(e.target.value)}
                          rows={4}
                          className="text-sm"
                        />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{aiSuggestion}</p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

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
                  <div className="flex items-center justify-between mb-2">
                    <Label>Treatment Changes</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => generateAIContent('changes')}
                      disabled={generatingChanges || !formData.clientId}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {generatingChanges ? 'Generating...' : 'Generate AI Suggestions'}
                    </Button>
                  </div>

                  {aiSuggestion && suggestionType === 'changes' && (
                    <Alert className="mb-4">
                      <AlertDescription>
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium">AI Suggestion:</span>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setIsEditingSuggestion(!isEditingSuggestion)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={acceptSuggestion}>
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={rejectSuggestion}>
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </div>
                          {isEditingSuggestion ? (
                            <Textarea
                              value={aiSuggestion}
                              onChange={(e) => setAiSuggestion(e.target.value)}
                              rows={3}
                              className="text-sm"
                            />
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{aiSuggestion}</p>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

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
                  <div className="flex items-center justify-between mb-2">
                    <Label>Follow-up Plan</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => generateAIContent('followup')}
                      disabled={generatingFollowUp || !formData.clientId}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {generatingFollowUp ? 'Generating...' : 'Generate AI Suggestions'}
                    </Button>
                  </div>

                  {aiSuggestion && suggestionType === 'followup' && (
                    <Alert className="mb-4">
                      <AlertDescription>
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium">AI Suggestion:</span>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setIsEditingSuggestion(!isEditingSuggestion)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={acceptSuggestion}>
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={rejectSuggestion}>
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </div>
                          {isEditingSuggestion ? (
                            <Textarea
                              value={aiSuggestion}
                              onChange={(e) => setAiSuggestion(e.target.value)}
                              rows={3}
                              className="text-sm"
                            />
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{aiSuggestion}</p>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

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
