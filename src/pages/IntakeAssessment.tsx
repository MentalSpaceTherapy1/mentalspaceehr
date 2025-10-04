import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, ArrowLeft, AlertTriangle, FileSignature, Clock, Sparkles, User, Loader2, Brain } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  const [availableClients, setAvailableClients] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [freeTextInput, setFreeTextInput] = useState('');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
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
    loadAvailableClients();
    loadUserProfileAndRoles();
    if (noteId) {
      loadExistingNote();
    }
    
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

  // Load client data whenever the clientId changes
  useEffect(() => {
    if (clientId) {
      loadClientData();
      loadClientAppointments();
    } else {
      setClientData(null);
      setAppointments([]);
      setSelectedAppointmentId('');
    }
  }, [clientId]);

  const loadAvailableClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, medical_record_number, date_of_birth')
        .eq('status', 'Active')
        .order('last_name', { ascending: true });

      if (error) throw error;
      setAvailableClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast({
        title: 'Error',
        description: 'Failed to load client list',
        variant: 'destructive'
      });
    }
  };

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

  const loadClientAppointments = async () => {
    if (!clientId) return;
    
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('client_id', clientId)
        .in('status', ['Scheduled', 'Completed', 'Checked In'])
        .order('appointment_date', { ascending: false })
        .order('start_time', { ascending: false });
      
      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load appointments',
        variant: 'destructive'
      });
    }
  };

  const loadAppointmentDetails = async (appointmentId: string) => {
    if (!appointmentId) return;
    
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        // Auto-populate session information from appointment
        setFormData(prev => ({
          ...prev,
          sessionDate: data.appointment_date,
          sessionStartTime: data.start_time,
          sessionEndTime: data.end_time,
          sessionLocation: data.service_location,
          cptCode: data.cpt_code || ''
        }));
      }
    } catch (error) {
      console.error('Error loading appointment details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load appointment details',
        variant: 'destructive'
      });
    }
  };

  const loadUserProfileAndRoles = async () => {
    try {
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profileError) throw profileError;

      // Get supervisor info separately if supervisor_id exists
      let supervisorData = null;
      if (profile?.supervisor_id) {
        const { data: supervisor, error: supervisorError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .eq('id', profile.supervisor_id)
          .single();
        
        if (!supervisorError) {
          supervisorData = supervisor;
        }
      }

      // Attach supervisor to profile
      const profileWithSupervisor = {
        ...profile,
        supervisor: supervisorData
      };

      setUserProfile(profileWithSupervisor);

      if (profileError) throw profileError;
      setUserProfile(profile);

      // Get user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id);

      if (rolesError) throw rolesError;
      
      const userRoleList = roles?.map(r => r.role) || [];
      setUserRoles(userRoleList);

      // Automatically set supervisor co-sign requirement for associate_trainee
      const requiresSupervisor = userRoleList.includes('associate_trainee');
      
      if (requiresSupervisor && profile?.supervisor_id) {
        setMetadata(prev => ({
          ...prev,
          requiresSupervisorCosign: true,
          supervisorId: profile.supervisor_id
        }));
      }

      // Load all supervisors for display purposes
      const { data: supervisorsList, error: supervisorsError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          profiles!user_roles_user_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('role', 'supervisor');

      if (supervisorsError) throw supervisorsError;
      setSupervisors(supervisorsList || []);
    } catch (error) {
      console.error('Error loading user profile and roles:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user profile information',
        variant: 'destructive'
      });
    }
  };

  const handleClientSelect = (selectedClientId: string) => {
    setFormData(prev => ({ ...prev, clientId: selectedClientId }));
    navigate(`/intake-assessment?clientId=${selectedClientId}`, { replace: true });
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

        // Load appointment ID if exists
        if (data.appointment_id) {
          setSelectedAppointmentId(data.appointment_id);
        }

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

    if (!freeTextInput.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please provide text for AI to generate the intake assessment',
        variant: 'destructive'
      });
      return;
    }

    try {
      setGeneratingAI(true);
      const { data, error } = await supabase.functions.invoke('generate-intake-note', {
        body: { 
          clientId,
          freeTextInput: freeTextInput.trim(),
          existingData: formData
        }
      });

      if (error) throw error;

      if (data?.content) {
        // Populate form fields with AI-generated content
        setFormData(prev => ({
          ...prev,
          ...data.content
        }));
        
        // Mark as AI assisted
        setMetadata(prev => ({ ...prev, wasAIAssisted: true }));
        
        toast({
          title: 'Assessment Generated',
          description: 'AI has generated the intake assessment content. Please review and edit as needed.',
        });
      }
    } catch (error: any) {
      console.error('Error generating AI content:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate AI assessment',
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

  const buildFullContext = () => {
    return JSON.stringify({
      chiefComplaint: formData.chiefComplaint,
      historyOfPresentingProblem: formData.historyOfPresentingProblem,
      currentSymptoms: formData.currentSymptoms,
      mentalStatusExam: formData.mentalStatusExam,
      safetyAssessment: formData.safetyAssessment,
      histories: {
        developmental: formData.developmentalHistory,
        family: formData.familyHistory,
        medical: formData.medicalHistory,
        substance: formData.substanceUseHistory,
        social: formData.socialHistory
      },
      clinicianImpression: formData.clinicianImpression
    });
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

    if (!selectedAppointmentId) {
      toast({
        title: 'Appointment Required',
        description: 'An intake assessment must be linked to a scheduled appointment',
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
        appointment_id: selectedAppointmentId,
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

  // Validation function to check if form is complete
  const validateForm = () => {
    const errors: string[] = [];

    if (!clientId) errors.push('Client must be selected');
    if (!selectedAppointmentId) errors.push('Appointment must be selected');
    if (!formData.sessionDate) errors.push('Session date is required');
    if (!formData.sessionStartTime) errors.push('Session start time is required');
    if (!formData.sessionEndTime) errors.push('Session end time is required');
    if (!formData.chiefComplaint?.trim()) errors.push('Chief complaint is required');
    if (!formData.historyOfPresentingProblem?.trim()) errors.push('History of presenting problem is required');
    if (!formData.clinicianImpression?.trim()) errors.push('Clinician impression is required');

    // Check if at least one diagnosis is provided
    if (!formData.diagnosticFormulation?.diagnoses || formData.diagnosticFormulation.diagnoses.length === 0) {
      errors.push('At least one diagnosis is required');
    }

    // Check if treatment recommendations exist (check for actual fields)
    const hasRecommendations = formData.treatmentRecommendations?.recommendedFrequency || 
                               formData.treatmentRecommendations?.recommendedModality ||
                               formData.treatmentRecommendations?.therapeuticApproach?.length > 0;
    
    const hasGoals = formData.initialGoals && formData.initialGoals.length > 0;
    
    if (!hasRecommendations && !hasGoals) {
      errors.push('Treatment recommendations or goals are required');
    }

    return errors;
  };

  const isFormComplete = () => {
    return validateForm().length === 0;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Compact header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/notes')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Intake Assessment
              </h1>
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
          </div>
        </div>

        {/* Appointment Selection - Required for Intake */}
        {clientId && !selectedAppointmentId && (
          <Alert className="border-l-4 border-l-warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Appointment Required:</strong> An intake assessment must be linked to a scheduled appointment. Please select an appointment below.
            </AlertDescription>
          </Alert>
        )}

        {clientId && (
          <Card className="border-l-4 border-l-accent shadow-lg">
            <CardHeader className="bg-gradient-subtle">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Clock className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <CardTitle>Appointment Selection</CardTitle>
                  <CardDescription>Select the appointment this intake assessment is for</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label htmlFor="appointment-select" className="text-sm font-medium">Appointment *</Label>
                <Select 
                  value={selectedAppointmentId} 
                  onValueChange={(value) => {
                    setSelectedAppointmentId(value);
                    loadAppointmentDetails(value);
                  }}
                  disabled={metadata.signedDate !== null}
                >
                  <SelectTrigger id="appointment-select" className="h-12">
                    <SelectValue placeholder="Select an appointment..." />
                  </SelectTrigger>
                  <SelectContent>
                    {appointments.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No appointments found for this client
                      </div>
                    ) : (
                      appointments.map((apt) => (
                        <SelectItem key={apt.id} value={apt.id}>
                          {new Date(apt.appointment_date).toLocaleDateString()} at {apt.start_time} - {apt.appointment_type} ({apt.status})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI-Assisted Generation */}
        {!metadata.signedDate && clientId && selectedAppointmentId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI-Assisted Generation
              </CardTitle>
              <CardDescription>
                Describe the session/assessment in your own words, and AI will structure it into an intake assessment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="free-text">Session Summary or Clinical Information</Label>
                <Textarea
                  id="free-text"
                  value={freeTextInput}
                  onChange={(e) => setFreeTextInput(e.target.value)}
                  rows={6}
                  placeholder="Example: New client presenting for initial evaluation. Reports 3-month history of depressed mood, anhedonia, difficulty sleeping. Previous therapy 5 years ago was helpful. Currently employed, supportive family. Denies SI/HI. Appears motivated for treatment..."
                  className="mt-2"
                />
              </div>
              <Button 
                onClick={handleAIGenerate} 
                disabled={generatingAI || !freeTextInput.trim()}
                className="gap-2 bg-gradient-success text-white shadow-colored hover:opacity-90 border-0"
              >
                {generatingAI ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Assessment with AI
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => saveIntakeAssessment('Draft')}
            disabled={saving || metadata.signedDate !== null}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Save Draft
          </Button>
          <Button
            onClick={() => {
              const errors = validateForm();
              if (errors.length > 0) {
                toast({
                  title: 'Form Incomplete',
                  description: (
                    <div className="space-y-1">
                      <p className="font-medium">Please complete the following:</p>
                      <ul className="list-disc list-inside text-sm">
                        {errors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  ),
                  variant: 'destructive'
                });
                return;
              }
              setSignatureDialogOpen(true);
            }}
            disabled={saving || metadata.signedDate !== null || !isFormComplete()}
            className="gap-2 bg-gradient-primary text-white shadow-colored hover:opacity-90 border-0"
          >
            <FileSignature className="h-4 w-4" />
            {metadata.signedDate ? 'Signed' : 'Sign & Lock'}
          </Button>
        </div>

        {/* Client Selection or Demographics */}
        {!clientId ? (
          <Card className="border-2 border-dashed border-primary/30 shadow-lg">
            <CardHeader className="bg-gradient-subtle">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Select Client</CardTitle>
                  <CardDescription>Choose a client to create an intake assessment for</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label htmlFor="client-select" className="text-sm font-medium">Client *</Label>
                <Select onValueChange={handleClientSelect} value={formData.clientId}>
                  <SelectTrigger id="client-select" className="h-12">
                    <SelectValue placeholder="Select a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.last_name}, {client.first_name} - MRN: {client.medical_record_number} (DOB: {new Date(client.date_of_birth).toLocaleDateString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ) : clientData ? (
          <Card className="border-l-4 border-l-primary shadow-lg overflow-hidden">
            <div className="absolute inset-0 bg-gradient-subtle opacity-5 pointer-events-none"></div>
            <CardHeader className="relative">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-primary text-white shadow-colored">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl">Client Information</CardTitle>
                  <CardDescription>Demographics and contact details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</Label>
                  <p className="font-semibold text-lg">{clientData.first_name} {clientData.last_name}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">MRN</Label>
                  <p className="font-semibold">{clientData.medical_record_number}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date of Birth</Label>
                  <p className="font-semibold">{new Date(clientData.date_of_birth).toLocaleDateString()}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Age</Label>
                  <p className="font-semibold">
                    {new Date().getFullYear() - new Date(clientData.date_of_birth).getFullYear()} years
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Gender</Label>
                  <p className="font-semibold">{clientData.gender || 'Not specified'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</Label>
                  <p className="font-semibold">{clientData.primary_phone}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</Label>
                  <p className="font-semibold">{clientData.email || 'Not provided'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</Label>
                  <Badge variant={clientData.status === 'Active' ? 'default' : 'secondary'} className="w-fit">
                    {clientData.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Alert className="border-l-4 border-l-warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Loading client information...
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

        {/* Supervisor Cosign Section - Automatic for associate/trainee roles */}
        {(metadata.requiresSupervisorCosign || metadata.supervisorCosigned) && (
          <Card className="border-l-4 border-l-secondary shadow-lg">
            <CardHeader className="bg-gradient-subtle">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <FileSignature className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <CardTitle>Supervisor Review & Co-Sign</CardTitle>
                  <CardDescription>
                    {metadata.supervisorCosigned 
                      ? 'This note has been reviewed and co-signed' 
                      : userRoles.includes('associate_trainee')
                        ? 'Required for associate/trainee clinicians'
                        : 'Required for incident-to-billing'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!metadata.supervisorCosigned && (
                <div className="space-y-3">
                  {userProfile?.supervisor ? (
                    <div className="p-4 rounded-lg bg-muted/50 border-2 border-primary/20">
                      <div className="flex items-start justify-between">
                        <div>
                          <Label className="text-sm font-medium">Assigned Supervisor</Label>
                          <p className="text-base font-semibold mt-1">
                            {userProfile.supervisor.first_name} {userProfile.supervisor.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {userProfile.supervisor.email}
                          </p>
                        </div>
                        <Badge variant="secondary" className="gap-1">
                          Auto-Assigned
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <Alert className="border-destructive bg-destructive/5">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <AlertDescription>
                        <strong>No Supervisor Assigned:</strong> Please contact your administrator to assign a supervisor to your account before signing intake assessments.
                      </AlertDescription>
                    </Alert>
                  )}

                  {metadata.signedDate && metadata.supervisorId && (
                    <>
                      <Alert className="border-accent bg-accent/5">
                        <AlertTriangle className="h-4 w-4 text-accent" />
                        <AlertDescription>
                          <strong>Action Required:</strong> This note must be co-signed by the supervisor before it can be used for billing purposes.
                        </AlertDescription>
                      </Alert>

                      <Button
                        className="w-full gap-2 bg-gradient-secondary text-white shadow-md hover:opacity-90 border-0"
                        onClick={() => setSupervisorDialogOpen(true)}
                      >
                        <FileSignature className="h-4 w-4" />
                        Supervisor Co-Sign Now
                      </Button>
                    </>
                  )}
                </div>
              )}

              {metadata.supervisorCosigned && (
                <div className="space-y-3 p-4 rounded-lg bg-success/5 border border-success/20">
                  <div className="flex items-center gap-2">
                    <Badge className="gap-1 bg-success text-white border-0">
                      <FileSignature className="h-3 w-3" />
                      Co-Signed
                    </Badge>
                    {metadata.supervisorCosignDate && (
                      <span className="text-sm text-muted-foreground">
                        on {new Date(metadata.supervisorCosignDate).toLocaleDateString()} at {new Date(metadata.supervisorCosignDate).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  {metadata.supervisorComments && (
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Supervisor Comments:</Label>
                      <p className="text-sm p-3 rounded-md bg-background border">{metadata.supervisorComments}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="shadow-elegant overflow-hidden">
          <CardContent className="pt-6">
            <Tabs defaultValue="session" className="space-y-6">
              <TabsList className="grid grid-cols-4 lg:grid-cols-8 w-full h-auto p-1 bg-gradient-subtle">
                <TabsTrigger value="session" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-md">
                  Session
                </TabsTrigger>
                <TabsTrigger value="presenting" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-md">
                  Presenting
                </TabsTrigger>
                <TabsTrigger value="symptoms" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-md">
                  Symptoms
                </TabsTrigger>
                <TabsTrigger value="mse" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-md">
                  MSE
                </TabsTrigger>
                <TabsTrigger value="safety" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-md">
                  Safety
                </TabsTrigger>
                <TabsTrigger value="history" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-md">
                  History
                </TabsTrigger>
                <TabsTrigger value="diagnosis" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-md">
                  Diagnosis
                </TabsTrigger>
                <TabsTrigger value="treatment" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-md">
                  Treatment
                </TabsTrigger>
              </TabsList>

              <TabsContent value="session" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Session Information & Billing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SessionInformationSection
                      data={formData}
                      onChange={(data) => updateFormData('session', data)}
                      cptCode={formData.cptCode}
                      onCptCodeChange={(e) => {
                        setFormData(prev => ({ ...prev, cptCode: e.target.value }));
                        setHasUnsavedChanges(true);
                      }}
                      disabled={metadata.signedDate !== null}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="presenting" className="space-y-4">
                <PresentingProblemSection
                  data={formData}
                  onChange={(data) => updateFormData('presenting', data)}
                  clientId={formData.clientId}
                  fullContext={buildFullContext()}
                />
              </TabsContent>

              <TabsContent value="symptoms" className="space-y-4">
                <CurrentSymptomsSection
                  data={formData.currentSymptoms}
                  onChange={(data) => updateFormData('currentSymptoms', data)}
                  clientId={formData.clientId}
                  fullContext={buildFullContext()}
                />
              </TabsContent>

              <TabsContent value="mse" className="space-y-4">
                <MentalStatusExamSection
                  data={formData.mentalStatusExam}
                  onChange={(data) => updateFormData('mentalStatusExam', data)}
                  clientId={formData.clientId}
                  fullContext={buildFullContext()}
                />
              </TabsContent>

              <TabsContent value="safety" className="space-y-4">
                <SafetyAssessmentSection
                  data={formData.safetyAssessment}
                  onChange={(data) => updateFormData('safetyAssessment', data)}
                  clientId={formData.clientId}
                  fullContext={buildFullContext()}
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
                  intakeData={formData}
                  clientId={formData.clientId}
                />
              </TabsContent>

              <TabsContent value="treatment" className="space-y-4">
                <TreatmentRecommendationsSection
                  data={formData.treatmentRecommendations}
                  initialGoals={formData.initialGoals}
                  onRecommendationsChange={(data) => updateFormData('treatmentRecommendations', data)}
                  onGoalsChange={(data) => updateFormData('initialGoals', data)}
                  clientId={formData.clientId}
                  fullContext={buildFullContext()}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer with time tracking and completion status */}
        <Card className="bg-gradient-subtle shadow-lg">
          <CardContent className="py-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-medium">Documentation Time: {documentationTime} minutes</span>
                </div>
                {metadata.signedDate && (
                  <div className="flex items-center gap-2">
                    <FileSignature className="h-4 w-4 text-success" />
                    <span className="font-medium text-success">
                      Signed: {new Date(metadata.signedDate).toLocaleString()}
                    </span>
                  </div>
                )}
                {!isFormComplete() && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="inline-flex">
                        <Badge variant="destructive" className="gap-1 cursor-pointer hover:opacity-80 transition-opacity">
                          <AlertTriangle className="h-3 w-3" />
                          Incomplete ({validateForm().length} items)
                        </Badge>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="start">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          Required Items
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          The following items must be completed before signing:
                        </p>
                        <ul className="space-y-1.5 text-sm">
                          {validateForm().map((error, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-destructive mt-0.5">•</span>
                              <span>{error}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
                {isFormComplete() && !metadata.signedDate && (
                  <Badge variant="default" className="gap-1 bg-success">
                    ✓ Ready to Sign
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
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
