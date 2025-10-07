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
import { Save, ArrowLeft, FileSignature, Brain, Sparkles, AlertTriangle } from 'lucide-react';
import { SignatureDialog } from '@/components/intake/SignatureDialog';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAISectionGeneration } from '@/hooks/useAISectionGeneration';
import { AISuggestionBox } from '@/components/intake/AISuggestionBox';

export default function TerminationNote() {
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
    terminationDate: new Date().toISOString().split('T')[0],
    lastSessionDate: '',
    totalSessionsCompleted: '',
    terminationType: 'Successful Completion',
    terminationReason: '',
    presentingProblems: '',
    treatmentSummary: '',
    progressAchieved: '',
    goalsStatus: '',
    currentFunctioning: '',
    finalAssessment: '',
    finalDiagnoses: [] as any[],
    medicationsAtTermination: '',
    recommendations: '',
    referralsProvided: '',
    dischargePlan: '',
    followUpInstructions: '',
    relapsePrevention: '',
    crisisPlan: '',
    prognosis: 'Good',
    clientStrengths: '',
    barriersAddressed: '',
    outstandingIssues: '',
    billingNotes: '',
    status: 'Draft',
  });

  // AI assistance hooks
  const treatmentSummaryAI = useAISectionGeneration({
    sectionType: 'termination_summary',
    clientId: formData.clientId,
    context: formData.presentingProblems + ' ' + formData.progressAchieved,
    existingData: null,
  });

  const recommendationsAI = useAISectionGeneration({
    sectionType: 'termination_recommendations',
    clientId: formData.clientId,
    context: formData.finalAssessment + ' ' + formData.currentFunctioning,
    existingData: null,
  });

  useEffect(() => {
    if (clientId) {
      loadClient();
      loadClientHistory();
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

  const loadClientHistory = async () => {
    if (!clientId) return;

    try {
      // Get total completed sessions
      const { count, error: countError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('status', 'Completed');

      if (countError) throw countError;

      // Get last session date
      const { data: lastSession, error: sessionError } = await supabase
        .from('appointments')
        .select('appointment_date')
        .eq('client_id', clientId)
        .eq('status', 'Completed')
        .order('appointment_date', { ascending: false })
        .limit(1)
        .single();

      if (!sessionError && lastSession) {
        setFormData(prev => ({
          ...prev,
          lastSessionDate: lastSession.appointment_date,
          totalSessionsCompleted: String(count || 0),
        }));
      }

      // Get most recent intake for presenting problems
      const { data: intake, error: intakeError } = await supabase
        .from('clinical_notes')
        .select('content, diagnoses')
        .eq('client_id', clientId)
        .eq('note_type', 'intake_assessment')
        .order('date_of_service', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!intakeError && intake) {
        const content = intake.content as any;
        const diagnoses = intake.diagnoses as any;
        setFormData(prev => ({
          ...prev,
          presentingProblems: content?.presentingProblem || '',
          finalDiagnoses: Array.isArray(diagnoses) ? diagnoses : [],
        }));
      }
    } catch (error) {
      console.error('Error loading client history:', error);
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
        .from('termination_notes')
        .select('*')
        .eq('id', noteId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          noteId: data.id,
          clientId: data.client_id,
          terminationDate: data.termination_date,
          lastSessionDate: data.last_session_date || '',
          totalSessionsCompleted: String(data.total_sessions_completed || ''),
          terminationType: data.termination_type,
          terminationReason: data.termination_reason,
          presentingProblems: data.presenting_problems || '',
          treatmentSummary: data.treatment_summary || '',
          progressAchieved: data.progress_achieved || '',
          goalsStatus: data.goals_status || '',
          currentFunctioning: data.current_functioning || '',
          finalAssessment: data.final_assessment || '',
          finalDiagnoses: Array.isArray(data.final_diagnoses) ? data.final_diagnoses : [],
          medicationsAtTermination: data.medications_at_termination || '',
          recommendations: data.recommendations || '',
          referralsProvided: data.referrals_provided || '',
          dischargePlan: data.discharge_plan || '',
          followUpInstructions: data.follow_up_instructions || '',
          relapsePrevention: data.relapse_prevention_plan || '',
          crisisPlan: data.crisis_plan || '',
          prognosis: data.prognosis || 'Good',
          clientStrengths: data.client_strengths || '',
          barriersAddressed: data.barriers_addressed || '',
          outstandingIssues: data.outstanding_issues || '',
          billingNotes: data.billing_notes || '',
          status: data.status || 'Draft',
        });
      }
    } catch (error) {
      console.error('Error loading note:', error);
      toast({
        title: 'Error',
        description: 'Failed to load termination note',
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

    if (!formData.terminationReason || !formData.treatmentSummary || !formData.dischargePlan) {
      toast({
        title: 'Required Fields Missing',
        description: 'Termination reason, treatment summary, and discharge plan are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const noteData: any = {
        client_id: formData.clientId,
        clinician_id: user?.id,
        termination_date: formData.terminationDate,
        last_session_date: formData.lastSessionDate || null,
        total_sessions_completed: formData.totalSessionsCompleted ? parseInt(formData.totalSessionsCompleted) : null,
        termination_type: formData.terminationType,
        termination_reason: formData.terminationReason,
        presenting_problems: formData.presentingProblems,
        treatment_summary: formData.treatmentSummary,
        progress_achieved: formData.progressAchieved,
        goals_status: formData.goalsStatus,
        current_functioning: formData.currentFunctioning,
        final_assessment: formData.finalAssessment,
        final_diagnoses: formData.finalDiagnoses,
        medications_at_termination: formData.medicationsAtTermination,
        recommendations: formData.recommendations,
        referrals_provided: formData.referralsProvided,
        discharge_plan: formData.dischargePlan,
        follow_up_instructions: formData.followUpInstructions,
        relapse_prevention_plan: formData.relapsePrevention,
        crisis_plan: formData.crisisPlan,
        prognosis: formData.prognosis,
        client_strengths: formData.clientStrengths,
        barriers_addressed: formData.barriersAddressed,
        outstanding_issues: formData.outstandingIssues,
        billing_notes: formData.billingNotes,
        status: shouldSign ? 'Pending Signature' : 'Draft',
      };

      if (formData.noteId) {
        // Update existing note
        const { error } = await supabase
          .from('termination_notes')
          .update(noteData)
          .eq('id', formData.noteId);

        if (error) throw error;
      } else {
        // Create new note
        const { data, error } = await supabase
          .from('termination_notes')
          .insert(noteData)
          .select()
          .single();

        if (error) throw error;
        
        setFormData(prev => ({ ...prev, noteId: data.id }));
      }

      toast({
        title: 'Success',
        description: shouldSign ? 'Termination note ready for signature' : 'Termination note saved successfully',
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
        description: 'Failed to save termination note',
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
        .from('termination_notes')
        .update({
          status: 'Signed',
          signed_by: user?.id,
          signed_date: new Date().toISOString(),
          locked: true,
          locked_date: new Date().toISOString(),
          locked_by: user?.id,
        })
        .eq('id', formData.noteId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Termination note signed and locked successfully',
      });

      setSignatureDialogOpen(false);
      navigate('/notes');
    } catch (error) {
      console.error('Error signing note:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign termination note',
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
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">Termination Note</h1>
                <Badge variant="destructive">Final Documentation</Badge>
              </div>
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

        <Alert variant="default">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Important</AlertTitle>
          <AlertDescription>
            This termination note documents the completion of treatment services. Once signed, this note will be locked and cannot be edited. Please ensure all information is accurate and complete before signing.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Termination Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Termination Date *</Label>
                <Input
                  type="date"
                  value={formData.terminationDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, terminationDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>Last Session Date</Label>
                <Input
                  type="date"
                  value={formData.lastSessionDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastSessionDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>Total Sessions Completed</Label>
                <Input
                  type="number"
                  value={formData.totalSessionsCompleted}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalSessionsCompleted: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Termination Type *</Label>
                <Select
                  value={formData.terminationType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, terminationType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Successful Completion">Successful Completion</SelectItem>
                    <SelectItem value="Mutual Agreement">Mutual Agreement</SelectItem>
                    <SelectItem value="Client Request">Client Request</SelectItem>
                    <SelectItem value="Clinician Recommendation">Clinician Recommendation</SelectItem>
                    <SelectItem value="Administrative">Administrative</SelectItem>
                    <SelectItem value="No Show/Non-compliance">No Show/Non-compliance</SelectItem>
                    <SelectItem value="Transfer of Care">Transfer of Care</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prognosis</Label>
                <Select
                  value={formData.prognosis}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, prognosis: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Excellent">Excellent</SelectItem>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Fair">Fair</SelectItem>
                    <SelectItem value="Guarded">Guarded</SelectItem>
                    <SelectItem value="Poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Reason for Termination *</Label>
              <Textarea
                value={formData.terminationReason}
                onChange={(e) => setFormData(prev => ({ ...prev, terminationReason: e.target.value }))}
                placeholder="Provide detailed explanation of why treatment is being terminated..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Presenting Problems</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.presentingProblems}
              onChange={(e) => setFormData(prev => ({ ...prev, presentingProblems: e.target.value }))}
              placeholder="Summarize the initial presenting problems and concerns that brought the client to treatment..."
              rows={4}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Treatment Summary *</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={formData.treatmentSummary}
              onChange={(e) => setFormData(prev => ({ ...prev, treatmentSummary: e.target.value }))}
              placeholder="Provide comprehensive summary of treatment course, including interventions used, therapeutic approaches, and overall treatment trajectory..."
              rows={6}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Progress Achieved</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.progressAchieved}
                onChange={(e) => setFormData(prev => ({ ...prev, progressAchieved: e.target.value }))}
                placeholder="Document specific progress made during treatment..."
                rows={5}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Treatment Goals Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.goalsStatus}
                onChange={(e) => setFormData(prev => ({ ...prev, goalsStatus: e.target.value }))}
                placeholder="Review status of each treatment goal (achieved, partially achieved, not achieved)..."
                rows={5}
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Current Functioning</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.currentFunctioning}
              onChange={(e) => setFormData(prev => ({ ...prev, currentFunctioning: e.target.value }))}
              placeholder="Describe client's current level of functioning across domains (work/school, relationships, self-care, social)..."
              rows={5}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Final Clinical Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.finalAssessment}
              onChange={(e) => setFormData(prev => ({ ...prev, finalAssessment: e.target.value }))}
              placeholder="Provide final clinical impression and assessment of client's mental health status at termination..."
              rows={5}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Client Strengths</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.clientStrengths}
                onChange={(e) => setFormData(prev => ({ ...prev, clientStrengths: e.target.value }))}
                placeholder="Identify and document client's strengths and resources..."
                rows={4}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Barriers Addressed</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.barriersAddressed}
                onChange={(e) => setFormData(prev => ({ ...prev, barriersAddressed: e.target.value }))}
                placeholder="Document barriers to treatment and how they were addressed..."
                rows={4}
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Outstanding Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.outstandingIssues}
              onChange={(e) => setFormData(prev => ({ ...prev, outstandingIssues: e.target.value }))}
              placeholder="Document any remaining concerns or issues that may require future attention..."
              rows={4}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Medications at Termination</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.medicationsAtTermination}
              onChange={(e) => setFormData(prev => ({ ...prev, medicationsAtTermination: e.target.value }))}
              placeholder="List current medications, dosages, and prescribing physicians..."
              rows={4}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recommendations *</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={formData.recommendations}
              onChange={(e) => setFormData(prev => ({ ...prev, recommendations: e.target.value }))}
              placeholder="Provide recommendations for ongoing care, support, or monitoring..."
              rows={5}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Referrals Provided</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.referralsProvided}
              onChange={(e) => setFormData(prev => ({ ...prev, referralsProvided: e.target.value }))}
              placeholder="List any referrals made, including provider names and contact information..."
              rows={4}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Discharge Plan *</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.dischargePlan}
              onChange={(e) => setFormData(prev => ({ ...prev, dischargePlan: e.target.value }))}
              placeholder="Detail the comprehensive discharge plan including follow-up care, support systems, and resources..."
              rows={6}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Follow-Up Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.followUpInstructions}
              onChange={(e) => setFormData(prev => ({ ...prev, followUpInstructions: e.target.value }))}
              placeholder="Provide specific follow-up instructions for the client..."
              rows={4}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Relapse Prevention Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.relapsePrevention}
              onChange={(e) => setFormData(prev => ({ ...prev, relapsePrevention: e.target.value }))}
              placeholder="Outline warning signs and strategies for preventing relapse..."
              rows={5}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Crisis Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.crisisPlan}
              onChange={(e) => setFormData(prev => ({ ...prev, crisisPlan: e.target.value }))}
              placeholder="Document crisis resources and emergency contact information for the client..."
              rows={4}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.billingNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, billingNotes: e.target.value }))}
              placeholder="Document any billing-related information or outstanding balances..."
              rows={3}
            />
          </CardContent>
        </Card>

        <Alert>
          <AlertDescription>
            All fields marked with * are required. This is a critical document that finalizes treatment. Review carefully before signing.
          </AlertDescription>
        </Alert>
      </div>

      <SignatureDialog
        open={signatureDialogOpen}
        onOpenChange={setSignatureDialogOpen}
        onSign={handleSign}
        clinicianName={clinicianName}
        noteType="Termination Note"
      />
    </DashboardLayout>
  );
}
