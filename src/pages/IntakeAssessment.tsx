import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, ArrowLeft, AlertTriangle } from 'lucide-react';
import { SessionInformationSection } from '@/components/intake/SessionInformationSection';
import { PresentingProblemSection } from '@/components/intake/PresentingProblemSection';
import { CurrentSymptomsSection } from '@/components/intake/CurrentSymptomsSection';
import { MentalStatusExamSection } from '@/components/intake/MentalStatusExamSection';
import { SafetyAssessmentSection } from '@/components/intake/SafetyAssessmentSection';
import { HistorySection } from '@/components/intake/HistorySection';
import { DiagnosticFormulationSection } from '@/components/intake/DiagnosticFormulationSection';
import { TreatmentRecommendationsSection } from '@/components/intake/TreatmentRecommendationsSection';
import { useAuth } from '@/hooks/useAuth';

export interface IntakeAssessmentData {
  noteId?: string;
  clientId: string;
  clinicianId: string;
  sessionDate: string;
  sessionStartTime: string;
  sessionEndTime: string;
  sessionLocation: string;
  chiefComplaint: string;
  historyOfPresentingProblem: string;
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

  useEffect(() => {
    if (noteId) {
      loadExistingNote();
    }
  }, [noteId]);

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
        setFormData({
          noteId: data.id,
          clientId: data.client_id,
          clinicianId: data.clinician_id,
          sessionDate: data.date_of_service,
          ...data.content as any
        });
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

  const saveIntakeAssessment = async (status: 'Draft' | 'Pending Signature' | 'Signed' = 'Draft') => {
    if (!formData.clientId) {
      toast({
        title: 'Error',
        description: 'Please select a client',
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
        content: {
          sessionStartTime: formData.sessionStartTime,
          sessionEndTime: formData.sessionEndTime,
          sessionLocation: formData.sessionLocation,
          chiefComplaint: formData.chiefComplaint,
          historyOfPresentingProblem: formData.historyOfPresentingProblem,
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
          initialGoals: formData.initialGoals
        },
        ai_generated: false,
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => saveIntakeAssessment('Draft')}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button
              onClick={() => saveIntakeAssessment('Pending Signature')}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save & Sign'}
            </Button>
          </div>
        </div>

        {hasUnsavedChanges && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You have unsaved changes. Make sure to save before leaving this page.
            </AlertDescription>
          </Alert>
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
      </div>
    </DashboardLayout>
  );
}
