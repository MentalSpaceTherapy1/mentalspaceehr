import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, ArrowLeft, FileSignature, Brain, Sparkles } from 'lucide-react';
import { SignatureDialog } from '@/components/intake/SignatureDialog';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAISectionGeneration } from '@/hooks/useAISectionGeneration';
import { AISuggestionBox } from '@/components/intake/AISuggestionBox';

export default function ClinicalNote() {
  const { clientId, noteId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [saving, setSaving] = useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [clinicianName, setClinicianName] = useState('');
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    noteId: noteId || null,
    clientId: clientId || '',
    dateOfService: new Date().toISOString().split('T')[0],
    noteType: 'Progress Update',
    chiefComplaint: '',
    clinicalObservations: '',
    interventions: '',
    clientResponse: '',
    plan: '',
    followUp: '',
    status: 'Draft',
  });

  // AI assistance hooks
  const observationsAI = useAISectionGeneration({
    sectionType: 'clinical_observations',
    clientId: formData.clientId,
    context: formData.chiefComplaint + ' ' + formData.clinicalObservations,
    existingData: null,
  });

  const interventionsAI = useAISectionGeneration({
    sectionType: 'interventions',
    clientId: formData.clientId,
    context: formData.chiefComplaint + ' ' + formData.clinicalObservations,
    existingData: null,
  });

  const planAI = useAISectionGeneration({
    sectionType: 'plan',
    clientId: formData.clientId,
    context: formData.clinicalObservations + ' ' + formData.interventions,
    existingData: null,
  });

  useEffect(() => {
    if (clientId) {
      loadClient();
    }
    loadClinicianName();
    if (noteId) {
      loadExistingNote();
    }
  }, [clientId, noteId]);

  const loadClient = async () => {
    if (!clientId) return;
    
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, medical_record_number')
        .eq('id', clientId)
        .single();

      if (error) throw error;
      setClient(data);
    } catch (error) {
      console.error('Error loading client:', error);
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

  const loadExistingNote = async () => {
    if (!noteId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clinical_notes')
        .select('*')
        .eq('id', noteId)
        .single();

      if (error) throw error;

      if (data && data.content) {
        const content = data.content as any;
        setFormData({
          noteId: data.id,
          clientId: data.client_id,
          dateOfService: data.date_of_service,
          noteType: content.noteType || 'Progress Update',
          chiefComplaint: content.chiefComplaint || '',
          clinicalObservations: content.clinicalObservations || '',
          interventions: content.interventions || '',
          clientResponse: content.clientResponse || '',
          plan: content.plan || '',
          followUp: content.followUp || '',
          status: 'Draft',
        });
      }
    } catch (error) {
      console.error('Error loading note:', error);
      toast({
        title: 'Error',
        description: 'Failed to load clinical note',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveNote = async (shouldSign: boolean = false) => {
    if (!formData.clientId) {
      toast({
        title: 'Required Field Missing',
        description: 'Client is required',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.chiefComplaint || !formData.clinicalObservations) {
      toast({
        title: 'Required Fields Missing',
        description: 'Chief complaint and clinical observations are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const noteContent = {
        noteType: formData.noteType,
        chiefComplaint: formData.chiefComplaint,
        clinicalObservations: formData.clinicalObservations,
        interventions: formData.interventions,
        clientResponse: formData.clientResponse,
        plan: formData.plan,
        followUp: formData.followUp,
      };

      const noteData: any = {
        client_id: formData.clientId,
        clinician_id: user?.id,
        date_of_service: formData.dateOfService,
        note_type: 'clinical_note',
        content: noteContent,
        locked: shouldSign,
      };

      if (formData.noteId) {
        // Update existing note
        const { error } = await supabase
          .from('clinical_notes')
          .update(noteData)
          .eq('id', formData.noteId);

        if (error) throw error;
      } else {
        // Create new note
        const { data, error } = await supabase
          .from('clinical_notes')
          .insert(noteData)
          .select()
          .single();

        if (error) throw error;
        
        setFormData(prev => ({ ...prev, noteId: data.id }));
      }

      toast({
        title: 'Success',
        description: shouldSign ? 'Clinical note ready for signature' : 'Clinical note saved successfully',
      });

      if (shouldSign) {
        setSignatureDialogOpen(true);
      } else {
        navigate('/notes');
      }
    } catch (error) {
      console.error('Error saving note:', error);
      toast({
        title: 'Error',
        description: 'Failed to save clinical note',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSign = async () => {
    if (!formData.noteId) return;

    try {
      const { error } = await supabase
        .from('clinical_notes')
        .update({
          locked: true,
          signed_by: user?.id,
          signed_date: new Date().toISOString(),
        })
        .eq('id', formData.noteId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Clinical note signed successfully',
      });

      setSignatureDialogOpen(false);
      navigate('/notes');
    } catch (error) {
      console.error('Error signing note:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign clinical note',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">Loading...</div>
      </DashboardLayout>
    );
  }

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
              <h1 className="text-3xl font-bold">Clinical Note</h1>
              {client && (
                <p className="text-muted-foreground">
                  {client.first_name} {client.last_name} ({client.medical_record_number})
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => saveNote(false)} disabled={saving} variant="outline">
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button onClick={() => saveNote(true)} disabled={saving}>
              <FileSignature className="h-4 w-4 mr-2" />
              Save & Sign
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date of Service *</Label>
                <Input
                  type="date"
                  value={formData.dateOfService}
                  onChange={(e) => setFormData(prev => ({ ...prev, dateOfService: e.target.value }))}
                />
              </div>
              <div>
                <Label>Note Type *</Label>
                <Select
                  value={formData.noteType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, noteType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Progress Update">Progress Update</SelectItem>
                    <SelectItem value="Clinical Observation">Clinical Observation</SelectItem>
                    <SelectItem value="Treatment Adjustment">Treatment Adjustment</SelectItem>
                    <SelectItem value="Medication Review">Medication Review</SelectItem>
                    <SelectItem value="Safety Check">Safety Check</SelectItem>
                    <SelectItem value="Follow-up">Follow-up</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chief Complaint / Reason for Note</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.chiefComplaint}
              onChange={(e) => setFormData(prev => ({ ...prev, chiefComplaint: e.target.value }))}
              placeholder="Briefly describe the reason for this clinical note..."
              rows={3}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Clinical Observations</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={observationsAI.generate}
                disabled={observationsAI.isGenerating || !formData.clientId}
              >
                {observationsAI.isGenerating ? (
                  <>
                    <Brain className="h-4 w-4 mr-2 animate-pulse" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Assist
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={formData.clinicalObservations}
              onChange={(e) => setFormData(prev => ({ ...prev, clinicalObservations: e.target.value }))}
              placeholder="Document your clinical observations, including client's presentation, behavior, mood, and any significant findings..."
              rows={6}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Interventions Provided</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={interventionsAI.generate}
                disabled={interventionsAI.isGenerating || !formData.clientId}
              >
                {interventionsAI.isGenerating ? (
                  <>
                    <Brain className="h-4 w-4 mr-2 animate-pulse" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Assist
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={formData.interventions}
              onChange={(e) => setFormData(prev => ({ ...prev, interventions: e.target.value }))}
              placeholder="Describe any interventions, techniques, or therapeutic approaches used..."
              rows={5}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client Response</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.clientResponse}
              onChange={(e) => setFormData(prev => ({ ...prev, clientResponse: e.target.value }))}
              placeholder="Document the client's response to interventions and their overall engagement..."
              rows={4}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Plan & Next Steps</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={planAI.generate}
                disabled={planAI.isGenerating || !formData.clientId}
              >
                {planAI.isGenerating ? (
                  <>
                    <Brain className="h-4 w-4 mr-2 animate-pulse" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Assist
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={formData.plan}
              onChange={(e) => setFormData(prev => ({ ...prev, plan: e.target.value }))}
              placeholder="Outline the treatment plan and any changes to current approach..."
              rows={5}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Follow-Up</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.followUp}
              onChange={(e) => setFormData(prev => ({ ...prev, followUp: e.target.value }))}
              placeholder="Specify any follow-up actions, monitoring needs, or future appointment plans..."
              rows={3}
            />
          </CardContent>
        </Card>

        <Alert>
          <AlertDescription>
            All fields marked with * are required. Save as draft to continue later, or save and sign to complete the note.
          </AlertDescription>
        </Alert>
      </div>

      <SignatureDialog
        open={signatureDialogOpen}
        onOpenChange={setSignatureDialogOpen}
        onSign={handleSign}
        clinicianName={clinicianName}
        noteType="Clinical Note"
      />
    </DashboardLayout>
  );
}
