import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, ArrowLeft, FileSignature, Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

export interface ProgressNoteData {
  noteId?: string;
  clientId: string;
  clinicianId: string;
  appointmentId: string;
  
  sessionDate: string;
  sessionStartTime: string;
  sessionEndTime: string;
  sessionDuration: number;
  sessionType: string;
  sessionModality: string;
  sessionLocation: string;
  
  participants: Array<{ name: string; relationship: string }>;
  
  subjective: {
    presentingConcerns: string;
    moodReport: string;
    recentEvents: string;
    symptomsReported: string[];
    symptomsImproved: string[];
    symptomsWorsened: string[];
    symptomsUnchanged: string[];
    medicationAdherence: string;
    medicationSideEffects: boolean;
    sideEffectDetails?: string;
    homeworkCompliance: string;
    homeworkReview: string;
    lifeStressors: string;
    copingStrategies: string;
    functionalImpairment: {
      work: string;
      school: string;
      relationships: string;
      selfCare: string;
      social: string;
    };
  };
  
  objective: {
    behavioralObservations: {
      appearance: string;
      mood: string;
      affect: {
        range: string;
        appropriateness: string;
        quality: string;
      };
      behavior: string;
      speech: string;
      thoughtProcess: string;
      attention: string;
      cooperation: string;
      insightJudgment: string;
    };
    riskAssessment: {
      suicidalIdeation: string;
      suicidalDetails?: string;
      homicidalIdeation: string;
      homicidalDetails?: string;
      selfHarm: string;
      substanceUse: string;
      overallRiskLevel: string;
      interventions?: string;
    };
    symptomsObserved: string[];
    progressObserved: string;
  };
  
  assessment: {
    progressTowardGoals: {
      overallProgress: string;
      goalProgress: Array<{
        goalId: string;
        goalDescription: string;
        progress: string;
        details: string;
      }>;
    };
    currentDiagnoses: Array<{
      icdCode: string;
      diagnosis: string;
      status: string;
    }>;
    clinicalImpression: string;
    changesToTreatmentPlan: boolean;
    changeDetails?: string;
    medicalNecessity: string;
  };
  
  plan: {
    interventionsProvided: string[];
    interventionDetails: string;
    therapeuticTechniques: string[];
    homework: {
      assigned: boolean;
      homeworkDetails?: string;
    };
    nextSteps: string;
    medicationChanges: {
      changesMade: boolean;
      changeDetails?: string;
      newPrescriptions?: string[];
      discontinuedMedications?: string[];
      doseAdjustments?: string[];
    };
    referrals: {
      referralMade: boolean;
      referralDetails?: string;
      referralTo?: string;
      referralReason?: string;
    };
    nextAppointment: {
      scheduled: boolean;
      appointmentDate?: string;
      appointmentType?: string;
      frequency?: string;
    };
    additionalPlanning: string;
  };
  
  billing: {
    cptCode: string;
    modifiers?: string[];
    placeOfService: string;
    diagnosisCodes: string[];
    units?: number;
  };
  
  status: 'Draft' | 'Pending Signature' | 'Signed' | 'Locked' | 'Amended';
}

export default function ProgressNote() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const noteId = searchParams.get('noteId');
  const appointmentId = searchParams.get('appointmentId');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [availableClients, setAvailableClients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [clientGoals, setClientGoals] = useState<any[]>([]);
  const startTimeRef = useRef<number>(Date.now());

  const [formData, setFormData] = useState<ProgressNoteData>({
    clientId: '',
    clinicianId: user?.id || '',
    appointmentId: appointmentId || '',
    sessionDate: new Date().toISOString().split('T')[0],
    sessionStartTime: '',
    sessionEndTime: '',
    sessionDuration: 0,
    sessionType: 'Individual Therapy',
    sessionModality: 'In-Person',
    sessionLocation: 'Office',
    participants: [],
    subjective: {
      presentingConcerns: '',
      moodReport: '',
      recentEvents: '',
      symptomsReported: [],
      symptomsImproved: [],
      symptomsWorsened: [],
      symptomsUnchanged: [],
      medicationAdherence: 'N/A',
      medicationSideEffects: false,
      homeworkCompliance: 'N/A',
      homeworkReview: '',
      lifeStressors: '',
      copingStrategies: '',
      functionalImpairment: {
        work: 'None',
        school: 'N/A',
        relationships: 'None',
        selfCare: 'None',
        social: 'None',
      },
    },
    objective: {
      behavioralObservations: {
        appearance: '',
        mood: '',
        affect: {
          range: 'Full',
          appropriateness: 'Appropriate',
          quality: '',
        },
        behavior: '',
        speech: '',
        thoughtProcess: '',
        attention: 'Intact',
        cooperation: 'Cooperative',
        insightJudgment: '',
      },
      riskAssessment: {
        suicidalIdeation: 'Denied',
        homicidalIdeation: 'Denied',
        selfHarm: 'Denied',
        substanceUse: 'Denied',
        overallRiskLevel: 'Low',
      },
      symptomsObserved: [],
      progressObserved: '',
    },
    assessment: {
      progressTowardGoals: {
        overallProgress: 'Good',
        goalProgress: [],
      },
      currentDiagnoses: [],
      clinicalImpression: '',
      changesToTreatmentPlan: false,
      medicalNecessity: '',
    },
    plan: {
      interventionsProvided: [],
      interventionDetails: '',
      therapeuticTechniques: [],
      homework: {
        assigned: false,
      },
      nextSteps: '',
      medicationChanges: {
        changesMade: false,
      },
      referrals: {
        referralMade: false,
      },
      nextAppointment: {
        scheduled: false,
      },
      additionalPlanning: '',
    },
    billing: {
      cptCode: '',
      placeOfService: '11',
      diagnosisCodes: [],
    },
    status: 'Draft',
  });

  useEffect(() => {
    loadClients();
    if (noteId) {
      loadExistingNote();
    } else if (appointmentId) {
      loadAppointmentData();
    }
  }, [noteId, appointmentId]);

  useEffect(() => {
    if (formData.clientId) {
      loadClientAppointments();
      loadClientGoals();
    }
  }, [formData.clientId]);

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
      toast({
        title: 'Error',
        description: 'Failed to load clients',
        variant: 'destructive',
      });
    }
  };

  const loadClientAppointments = async () => {
    if (!formData.clientId) return;

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('client_id', formData.clientId)
        .in('status', ['Scheduled', 'Completed', 'Checked In'])
        .order('appointment_date', { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  };

  const loadClientGoals = async () => {
    if (!formData.clientId) return;

    try {
      // This would load from a treatment_goals table if it exists
      // For now, we'll initialize empty
      setClientGoals([]);
    } catch (error) {
      console.error('Error loading client goals:', error);
    }
  };

  const loadAppointmentData = async () => {
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
          appointmentId: data.id,
          sessionDate: data.appointment_date,
          sessionStartTime: data.start_time,
          sessionEndTime: data.end_time,
          sessionDuration: data.duration || 0,
          sessionType: data.appointment_type,
          sessionModality: data.service_location === 'Telehealth' ? 'Telehealth' : 'In-Person',
          sessionLocation: data.service_location,
          billing: {
            ...prev.billing,
            cptCode: data.cpt_code || '',
            diagnosisCodes: data.icd_codes || [],
          },
        }));
      }
    } catch (error) {
      console.error('Error loading appointment:', error);
      toast({
        title: 'Error',
        description: 'Failed to load appointment data',
        variant: 'destructive',
      });
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
          appointmentId: data.appointment_id || '',
          ...content,
        });
      }
    } catch (error) {
      console.error('Error loading note:', error);
      toast({
        title: 'Error',
        description: 'Failed to load progress note',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveNote = async () => {
    if (!formData.clientId || !formData.appointmentId) {
      toast({
        title: 'Required Fields Missing',
        description: 'Please select both a client and an appointment',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000 / 60);

      const noteData: any = {
        client_id: formData.clientId,
        clinician_id: user?.id,
        appointment_id: formData.appointmentId,
        date_of_service: formData.sessionDate,
        note_type: 'progress_note',
        note_format: 'SOAP',
        content: formData as any,
        session_duration_minutes: formData.sessionDuration,
        cpt_codes: formData.billing.cptCode ? [formData.billing.cptCode] : [],
        diagnoses: formData.billing.diagnosisCodes,
        billing_status: 'not_billed',
        locked: false,
        requires_supervision: false,
      };

      if (noteId) {
        const { error } = await supabase
          .from('clinical_notes')
          .update(noteData)
          .eq('id', noteId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clinical_notes')
          .insert(noteData);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Progress note saved successfully',
      });

      navigate('/notes');
    } catch (error) {
      console.error('Error saving note:', error);
      toast({
        title: 'Error',
        description: 'Failed to save progress note',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
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
              <h1 className="text-3xl font-bold">Progress Note (SOAP)</h1>
              <p className="text-muted-foreground">
                Document therapy session and track client progress
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={saveNote} disabled={saving || loading}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </div>

        {hasUnsavedChanges && (
          <div className="bg-warning/10 border border-warning rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-sm text-warning">You have unsaved changes</span>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Session & Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client *</Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, clientId: value }));
                    setHasUnsavedChanges(true);
                  }}
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
                <Label>Appointment *</Label>
                <Select
                  value={formData.appointmentId}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, appointmentId: value }));
                    const appt = appointments.find(a => a.id === value);
                    if (appt) {
                      setFormData(prev => ({
                        ...prev,
                        sessionDate: appt.appointment_date,
                        sessionStartTime: appt.start_time,
                        sessionEndTime: appt.end_time,
                        sessionDuration: appt.duration || 0,
                      }));
                    }
                    setHasUnsavedChanges(true);
                  }}
                  disabled={!formData.clientId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select appointment" />
                  </SelectTrigger>
                  <SelectContent>
                    {appointments.map((appt) => (
                      <SelectItem key={appt.id} value={appt.id}>
                        {format(new Date(appt.appointment_date), 'MMM d, yyyy')} - {appt.start_time} ({appt.appointment_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Session Type</Label>
                <Select
                  value={formData.sessionType}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, sessionType: value }));
                    setHasUnsavedChanges(true);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Individual Therapy">Individual Therapy</SelectItem>
                    <SelectItem value="Couples Therapy">Couples Therapy</SelectItem>
                    <SelectItem value="Family Therapy">Family Therapy</SelectItem>
                    <SelectItem value="Group Therapy">Group Therapy</SelectItem>
                    <SelectItem value="Medication Management">Medication Management</SelectItem>
                    <SelectItem value="Crisis Intervention">Crisis Intervention</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Session Modality</Label>
                <Select
                  value={formData.sessionModality}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, sessionModality: value }));
                    setHasUnsavedChanges(true);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="In-Person">In-Person</SelectItem>
                    <SelectItem value="Telehealth">Telehealth</SelectItem>
                    <SelectItem value="Phone">Phone</SelectItem>
                    <SelectItem value="Home Visit">Home Visit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Duration (minutes)</Label>
                <Select
                  value={formData.sessionDuration.toString()}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, sessionDuration: parseInt(value) }));
                    setHasUnsavedChanges(true);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="50">50 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="subjective" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="subjective">Subjective</TabsTrigger>
            <TabsTrigger value="objective">Objective</TabsTrigger>
            <TabsTrigger value="assessment">Assessment</TabsTrigger>
            <TabsTrigger value="plan">Plan</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="subjective">
            <Card>
              <CardHeader>
                <CardTitle>Subjective - Client's Report</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Subjective section components will be added in the next step
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="objective">
            <Card>
              <CardHeader>
                <CardTitle>Objective - Clinical Observations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Objective section components will be added in the next step
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assessment">
            <Card>
              <CardHeader>
                <CardTitle>Assessment - Clinical Impression</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Assessment section components will be added in the next step
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plan">
            <Card>
              <CardHeader>
                <CardTitle>Plan - Treatment & Next Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Plan section components will be added in the next step
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing">
            <Card>
              <CardHeader>
                <CardTitle>Billing Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Billing section components will be added in the next step
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
