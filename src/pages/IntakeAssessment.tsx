import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, ArrowLeft, AlertTriangle, FileSignature, Clock, Sparkles, User, Loader2 } from 'lucide-react';
import { SessionInformationSection } from '@/components/intake/SessionInformationSection';
import { PresentingProblemSection } from '@/components/intake/PresentingProblemSection';
import { CurrentSymptomsSection } from '@/components/intake/CurrentSymptomsSection';
import { MentalStatusExamSection } from '@/components/intake/MentalStatusExamSection';
import { SafetyAssessmentSection } from '@/components/intake/SafetyAssessmentSection';
import { HistorySection } from '@/components/intake/HistorySection';
import { DiagnosticFormulationSection } from '@/components/intake/DiagnosticFormulationSection';
import { TreatmentRecommendationsSection } from '@/components/intake/TreatmentRecommendationsSection';
import { SignatureDialog } from '@/components/intake/SignatureDialog';
import { SupervisorCosignDialog } from '@/components/intake/SupervisorCosignDialog';
import { useAuth } from '@/hooks/useAuth';

export interface IntakeAssessmentData {
  noteId?: string;
  clientId: string;
  clinicianId: string;
  sessionDate: string;
  sessionStartTime: string;
  sessionEndTime: string;
  sessionLocation: string;
  cptCode?: string;
  chiefComplaint: string;
  historyOfPresentingProblem: string;
  symptomOnset?: string;
  symptomDuration?: string;
  precipitatingFactors?: string;
  exacerbatingFactors?: string[];
  alleviatingFactors?: string[];
  previousTreatmentAttempts?: any;
  currentSymptoms: any;
  mentalStatusExam: any;
  safetyAssessment: any;
  developmentalHistory: any;
  familyHistory: any;
  medicalHistory: any;
  substanceUseHistory: any;
  socialHistory: any;
  culturalConsiderations: any;
  strengthsAndResources: string[];
  diagnosticFormulation: any;
  treatmentRecommendations: any;
  clinicianImpression: string;
  initialGoals: any[];
  status: 'Draft' | 'Pending Signature' | 'Signed' | 'Locked' | 'Amended';
}

export default function IntakeAssessment() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('clientId');
  const noteId = searchParams.get('noteId');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [supervisorDialogOpen, setSupervisorDialogOpen] = useState(false);
  const [documentationTime, setDocumentationTime] = useState(0);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [clientData, setClientData] = useState<any>(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const timeTracker = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  
  const [formData, setFormData] = useState<IntakeAssessmentData>({
    clientId: clientId || '',
    clinicianId: user?.id || '',
    sessionDate: new Date().toISOString().split('T')[0],
    sessionStartTime: '',
    sessionEndTime: '',
    sessionLocation: 'Office',
    chiefComplaint: '',
    historyOfPresentingProblem: '',
    currentSymptoms: {},
    mentalStatusExam: {},
    safetyAssessment: {},
    developmentalHistory: {},
    familyHistory: {},
    medicalHistory: {},
    substanceUseHistory: {},
    socialHistory: {},
    culturalConsiderations: {},
    strengthsAndResources: [],
    diagnosticFormulation: {},
    treatmentRecommendations: {},
    clinicianImpression: '',
    initialGoals: [],
    status: 'Draft'
  });

  const [metadata, setMetadata] = useState({
    signedDate: null as string | null,
    signedBy: null as string | null,
    requiresSupervisorCosign: false,
    supervisorCosigned: false,
    supervisorCosignDate: null as string | null,
    supervisorId: null as string | null,
    supervisorComments: '',
    timeSpentDocumenting: 0,
    wasAIAssisted: false
  });

  useEffect(() => {
    if (clientId) {
      loadClientData();
    }
    if (noteId) {
      loadExistingNote();
    }
    loadSupervisors();
    
    // Start time tracking
    startTimeRef.current = Date.now();
    timeTracker.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000 / 60); // minutes
      setDocumentationTime(elapsed);
    }, 60000); // Update every minute

    // Pause tracking when user leaves page
    const handleVisibilityChange = () => {
      if (document.hidden && timeTracker.current) {
        clearInterval(timeTracker.current);
      } else if (!document.hidden) {
        startTimeRef.current = Date.now();
        timeTracker.current = setInterval(() => {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000 / 60);
          setDocumentationTime(prev => prev + elapsed);
          startTimeRef.current = Date.now();
        }, 60000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timeTracker.current) clearInterval(timeTracker.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [noteId]);

  const loadClientData = async () => {
    if (!clientId) return;
    
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (error) throw error;
      setClientData(data);
    } catch (error) {
      console.error('Error loading client:', error);
      toast({
        title: 'Error',
        description: 'Failed to load client information',
        variant: 'destructive'
      });
    }
  };

  const loadSupervisors = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, profiles!user_roles_user_id_fkey(first_name, last_name)')
        .eq('role', 'supervisor');

      if (error) throw error;
      
      setSupervisors(data || []);
    } catch (error) {
      console.error('Error loading supervisors:', error);
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
      
      if (data) {
        const content = data.content as any;
        setFormData({
          noteId: data.id,
          clientId: data.client_id,
          clinicianId: data.clinician_id,
          sessionDate: data.date_of_service,
          ...content
        });

        // Load metadata
        setMetadata({
          signedDate: content.signedDate || null,
          signedBy: content.signedBy || null,
          requiresSupervisorCosign: content.requiresSupervisorCosign || false,
          supervisorCosigned: content.supervisorCosigned || false,
          supervisorCosignDate: content.supervisorCosignDate || null,
          supervisorId: content.supervisorId || null,
          supervisorComments: content.supervisorComments || '',
          timeSpentDocumenting: content.timeSpentDocumenting || 0,
          wasAIAssisted: content.wasAIAssisted || false
        });

        // Set initial documentation time if exists
        if (content.timeSpentDocumenting) {
          setDocumentationTime(content.timeSpentDocumenting);
        }
      }
    } catch (error) {
      console.error('Error loading note:', error);
      toast({
        title: 'Error',
        description: 'Failed to load intake assessment',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!clientId) {
      toast({
        title: 'Error',
        description: 'No client selected',
        variant: 'destructive'
      });
      return;
    }

    try {
      setGeneratingAI(true);
      const { data, error } = await supabase.functions.invoke('generate-intake-note', {
        body: { 
          clientId,
          existingData: {
            chiefComplaint: formData.chiefComplaint,
            historyOfPresentingProblem: formData.historyOfPresentingProblem
          }
        }
      });

      if (error) throw error;

      if (data?.suggestions) {
        toast({
          title: 'AI Suggestions Generated',
          description: 'Review the AI-generated suggestions and incorporate them as needed.',
        });
        
        // Mark as AI assisted
        setMetadata(prev => ({ ...prev, wasAIAssisted: true }));
        
        // Show suggestions in a dialog or alert
        toast({
          title: 'AI Clinical Suggestions',
          description: data.suggestions.substring(0, 200) + '...',
        });
      }
    } catch (error: any) {
      console.error('Error generating AI content:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate AI suggestions',
        variant: 'destructive'
      });
    } finally {
      setGeneratingAI(false);
    }
  };

  const updateFormData = (section: string, data: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: data
    }));
    setHasUnsavedChanges(true);
  };

  const calculateDuration = () => {
    if (formData.sessionStartTime && formData.sessionEndTime) {
      const start = new Date(`2000-01-01T${formData.sessionStartTime}`);
      const end = new Date(`2000-01-01T${formData.sessionEndTime}`);
      return Math.round((end.getTime() - start.getTime()) / 60000);
    }
    return 0;
  };

  const handleSign = async () => {
    const now = new Date().toISOString();
    setMetadata(prev => ({
      ...prev,
      signedDate: now,
      signedBy: user?.id || null,
      timeSpentDocumenting: documentationTime
    }));
    
    await saveIntakeAssessment('Signed');
    
    toast({
      title: 'Success',
      description: 'Intake assessment signed successfully'
    });
  };

  const handleSupervisorCosign = async (comments: string) => {
    const now = new Date().toISOString();
    setMetadata(prev => ({
      ...prev,
      supervisorCosigned: true,
      supervisorCosignDate: now,
      supervisorComments: comments
    }));
    
    await saveIntakeAssessment('Signed');
    
    toast({
      title: 'Success',
      description: 'Supervisor co-sign completed'
    });
  };

  const saveIntakeAssessment = async (status: 'Draft' | 'Pending Signature' | 'Signed' = 'Draft') => {
    if (!formData.clientId) {
      toast({
        title: 'Error',
        description: 'Please select a client',
        variant: 'destructive'
      });
      return;
    }

    // If signing but requires supervisor cosign and not yet cosigned, don't allow
    if (status === 'Signed' && metadata.requiresSupervisorCosign && !metadata.supervisorCosigned) {
      toast({
        title: 'Error',
        description: 'This note requires supervisor co-signature before it can be signed',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);
      
      const noteData = {
        client_id: formData.clientId,
        clinician_id: user?.id,
        note_type: 'intake_assessment' as any,
        note_format: 'SOAP' as any,
        date_of_service: formData.sessionDate,
        session_duration_minutes: calculateDuration(),
        cpt_codes: formData.cptCode ? [formData.cptCode] : [],
        locked: status === 'Signed',
        content: {
          cptCode: formData.cptCode,
          sessionStartTime: formData.sessionStartTime,
          sessionEndTime: formData.sessionEndTime,
          sessionLocation: formData.sessionLocation,
          chiefComplaint: formData.chiefComplaint,
          historyOfPresentingProblem: formData.historyOfPresentingProblem,
          symptomOnset: formData.symptomOnset,
          symptomDuration: formData.symptomDuration,
          precipitatingFactors: formData.precipitatingFactors,
          exacerbatingFactors: formData.exacerbatingFactors,
          alleviatingFactors: formData.alleviatingFactors,
          previousTreatmentAttempts: formData.previousTreatmentAttempts,
          currentSymptoms: formData.currentSymptoms,
          mentalStatusExam: formData.mentalStatusExam,
          safetyAssessment: formData.safetyAssessment,
          developmentalHistory: formData.developmentalHistory,
          familyHistory: formData.familyHistory,
          medicalHistory: formData.medicalHistory,
          substanceUseHistory: formData.substanceUseHistory,
          socialHistory: formData.socialHistory,
          culturalConsiderations: formData.culturalConsiderations,
          strengthsAndResources: formData.strengthsAndResources,
          diagnosticFormulation: formData.diagnosticFormulation,
          treatmentRecommendations: formData.treatmentRecommendations,
          clinicianImpression: formData.clinicianImpression,
          initialGoals: formData.initialGoals,
          status,
          ...metadata,
          timeSpentDocumenting: documentationTime
        },
        ai_generated: metadata.wasAIAssisted,
        created_by: user?.id
      };

      if (noteId) {
        const { error } = await supabase
          .from('clinical_notes')
          .update(noteData)
          .eq('id', noteId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('clinical_notes')
          .insert([noteData])
          .select()
          .single();

        if (error) throw error;
        
        if (data) {
          navigate(`/intake-assessment?noteId=${data.id}&clientId=${formData.clientId}`, { replace: true });
        }
      }

      toast({
        title: 'Success',
        description: `Intake assessment ${noteId ? 'updated' : 'created'} successfully`
      });
      
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving intake assessment:', error);
      toast({
        title: 'Error',
        description: 'Failed to save intake assessment',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading intake assessment...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/notes')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Intake Assessment</h1>
              <p className="text-muted-foreground mt-1">
                Comprehensive initial evaluation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {metadata.wasAIAssisted && (
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                AI Assisted
              </Badge>
            )}
            {metadata.signedDate && (
              <Badge variant="outline" className="gap-1">
                <FileSignature className="h-3 w-3" />
                Signed
              </Badge>
            )}
            {documentationTime > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                {documentationTime} min
              </Badge>
            )}
            <Button
              variant="outline"
              onClick={handleAIGenerate}
              disabled={generatingAI || !clientId || metadata.signedDate !== null}
            >
              {generatingAI ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Assist
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => saveIntakeAssessment('Draft')}
              disabled={saving || metadata.signedDate !== null}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button
              onClick={() => setSignatureDialogOpen(true)}
              disabled={saving || metadata.signedDate !== null}
            >
              <FileSignature className="h-4 w-4 mr-2" />
              {metadata.signedDate ? 'Signed' : 'Sign'}
            </Button>
          </div>
        </div>

        {/* Client Demographics Header */}
        {clientData && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                <CardTitle>Client Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <p className="font-medium">{clientData.first_name} {clientData.last_name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">MRN</Label>
                  <p className="font-medium">{clientData.medical_record_number}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Date of Birth</Label>
                  <p className="font-medium">{new Date(clientData.date_of_birth).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Age</Label>
                  <p className="font-medium">
                    {new Date().getFullYear() - new Date(clientData.date_of_birth).getFullYear()} years
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Gender</Label>
                  <p className="font-medium">{clientData.gender || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <p className="font-medium">{clientData.primary_phone}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="font-medium">{clientData.email || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge variant={clientData.status === 'Active' ? 'default' : 'secondary'}>
                    {clientData.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!clientData && clientId && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Loading client information...
            </AlertDescription>
          </Alert>
        )}

        {!clientId && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No client selected. Please select a client from the Notes page.
            </AlertDescription>
          </Alert>
        )}

        {metadata.signedDate && (
          <Alert>
            <FileSignature className="h-4 w-4" />
            <AlertDescription>
              This note has been signed and locked. It cannot be edited. You can create an amendment if changes are needed.
            </AlertDescription>
          </Alert>
        )}

        {hasUnsavedChanges && !metadata.signedDate && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You have unsaved changes. Make sure to save before leaving this page.
            </AlertDescription>
          </Alert>
        )}

        {/* Supervisor Cosign Section */}
        {(metadata.requiresSupervisorCosign || metadata.supervisorCosigned) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Supervisor Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Requires Supervisor Co-Sign</Label>
                <Checkbox
                  checked={metadata.requiresSupervisorCosign}
                  onCheckedChange={(checked) => setMetadata(prev => ({
                    ...prev,
                    requiresSupervisorCosign: checked as boolean
                  }))}
                  disabled={metadata.signedDate !== null}
                />
              </div>

              {metadata.requiresSupervisorCosign && !metadata.supervisorCosigned && (
                <div>
                  <Label>Select Supervisor</Label>
                  <Select
                    value={metadata.supervisorId || ''}
                    onValueChange={(value) => setMetadata(prev => ({
                      ...prev,
                      supervisorId: value
                    }))}
                    disabled={metadata.signedDate !== null}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supervisor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {supervisors.map((sup) => (
                        <SelectItem key={sup.user_id} value={sup.user_id}>
                          {sup.profiles?.first_name} {sup.profiles?.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {metadata.supervisorCosigned && (
                <div className="space-y-2">
                  <Badge variant="outline" className="gap-1">
                    <FileSignature className="h-3 w-3" />
                    Co-Signed {metadata.supervisorCosignDate && `on ${new Date(metadata.supervisorCosignDate).toLocaleDateString()}`}
                  </Badge>
                  {metadata.supervisorComments && (
                    <div>
                      <Label className="text-sm font-medium">Supervisor Comments:</Label>
                      <p className="text-sm text-muted-foreground mt-1">{metadata.supervisorComments}</p>
                    </div>
                  )}
                </div>
              )}

              {metadata.requiresSupervisorCosign && !metadata.supervisorCosigned && metadata.supervisorId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSupervisorDialogOpen(true)}
                  disabled={!metadata.signedDate}
                >
                  <FileSignature className="h-4 w-4 mr-2" />
                  Supervisor Co-Sign
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="session" className="space-y-6">
              <TabsList className="grid grid-cols-4 lg:grid-cols-8 w-full">
                <TabsTrigger value="session">Session</TabsTrigger>
                <TabsTrigger value="presenting">Presenting</TabsTrigger>
                <TabsTrigger value="symptoms">Symptoms</TabsTrigger>
                <TabsTrigger value="mse">MSE</TabsTrigger>
                <TabsTrigger value="safety">Safety</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="diagnosis">Diagnosis</TabsTrigger>
                <TabsTrigger value="treatment">Treatment</TabsTrigger>
              </TabsList>

              <TabsContent value="session" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>CPT Code</CardTitle>
                    <CardDescription>Billing code for this intake session</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cptCode">CPT Code</Label>
                        <Input
                          id="cptCode"
                          value={formData.cptCode || ''}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, cptCode: e.target.value }));
                            setHasUnsavedChanges(true);
                          }}
                          placeholder="e.g., 90791 (Psychiatric Diagnostic Evaluation)"
                          disabled={metadata.signedDate !== null}
                        />
                        <p className="text-xs text-muted-foreground">
                          Common codes: 90791 (Intake without medical services), 90792 (Intake with medical services)
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <SessionInformationSection
                  data={formData}
                  onChange={(data) => updateFormData('session', data)}
                />
              </TabsContent>

              <TabsContent value="presenting" className="space-y-4">
                <PresentingProblemSection
                  data={formData}
                  onChange={(data) => updateFormData('presenting', data)}
                />
              </TabsContent>

              <TabsContent value="symptoms" className="space-y-4">
                <CurrentSymptomsSection
                  data={formData.currentSymptoms}
                  onChange={(data) => updateFormData('currentSymptoms', data)}
                />
              </TabsContent>

              <TabsContent value="mse" className="space-y-4">
                <MentalStatusExamSection
                  data={formData.mentalStatusExam}
                  onChange={(data) => updateFormData('mentalStatusExam', data)}
                />
              </TabsContent>

              <TabsContent value="safety" className="space-y-4">
                <SafetyAssessmentSection
                  data={formData.safetyAssessment}
                  onChange={(data) => updateFormData('safetyAssessment', data)}
                />
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                <HistorySection
                  developmental={formData.developmentalHistory}
                  family={formData.familyHistory}
                  medical={formData.medicalHistory}
                  substance={formData.substanceUseHistory}
                  social={formData.socialHistory}
                  cultural={formData.culturalConsiderations}
                  onDevelopmentalChange={(data) => updateFormData('developmentalHistory', data)}
                  onFamilyChange={(data) => updateFormData('familyHistory', data)}
                  onMedicalChange={(data) => updateFormData('medicalHistory', data)}
                  onSubstanceChange={(data) => updateFormData('substanceUseHistory', data)}
                  onSocialChange={(data) => updateFormData('socialHistory', data)}
                  onCulturalChange={(data) => updateFormData('culturalConsiderations', data)}
                />
              </TabsContent>

              <TabsContent value="diagnosis" className="space-y-4">
                <DiagnosticFormulationSection
                  data={formData.diagnosticFormulation}
                  clinicianImpression={formData.clinicianImpression}
                  strengthsAndResources={formData.strengthsAndResources}
                  onDiagnosisChange={(data) => updateFormData('diagnosticFormulation', data)}
                  onImpressionChange={(data) => updateFormData('clinicianImpression', data)}
                  onStrengthsChange={(data) => updateFormData('strengthsAndResources', data)}
                />
              </TabsContent>

              <TabsContent value="treatment" className="space-y-4">
                <TreatmentRecommendationsSection
                  data={formData.treatmentRecommendations}
                  initialGoals={formData.initialGoals}
                  onRecommendationsChange={(data) => updateFormData('treatmentRecommendations', data)}
                  onGoalsChange={(data) => updateFormData('initialGoals', data)}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer with time tracking */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Documentation Time: {documentationTime} minutes</span>
                </div>
                {metadata.signedDate && (
                  <div className="flex items-center gap-2">
                    <FileSignature className="h-4 w-4" />
                    <span>Signed: {new Date(metadata.signedDate).toLocaleString()}</span>
                  </div>
                )}
              </div>
              <div className="text-xs">
                Last saved: {hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <SignatureDialog
        open={signatureDialogOpen}
        onOpenChange={setSignatureDialogOpen}
        onSign={handleSign}
        clinicianName={`${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`}
      />

      <SupervisorCosignDialog
        open={supervisorDialogOpen}
        onOpenChange={setSupervisorDialogOpen}
        onCosign={handleSupervisorCosign}
        supervisorName={supervisors.find(s => s.user_id === metadata.supervisorId)?.profiles?.first_name || 'Supervisor'}
      />
    </DashboardLayout>
  );
}
