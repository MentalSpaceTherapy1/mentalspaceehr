import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, ArrowLeft, FileSignature, AlertTriangle, CheckCircle2, Brain, Sparkles, Check, X } from 'lucide-react';
import { SignatureDialog } from '@/components/intake/SignatureDialog';
import { SupervisorCosignDialog } from '@/components/intake/SupervisorCosignDialog';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DiagnosesSection } from '@/components/treatment-plan/DiagnosesSection';
import { ProblemsSection } from '@/components/treatment-plan/ProblemsSection';
import { GoalsSection } from '@/components/treatment-plan/GoalsSection';
import { TreatmentModalitiesSection } from '@/components/treatment-plan/TreatmentModalitiesSection';
import { StrengthsBarriersSection } from '@/components/treatment-plan/StrengthsBarriersSection';
import { DischargeSection } from '@/components/treatment-plan/DischargeSection';
import { MedicationPlanSection } from '@/components/treatment-plan/MedicationPlanSection';
import { PsychoeducationSection } from '@/components/treatment-plan/PsychoeducationSection';
import { ProgressReviewSection } from '@/components/treatment-plan/ProgressReviewSection';
import { Checkbox } from '@/components/ui/checkbox';
import { icd10MentalHealthCodes } from '@/lib/icd10Codes';

export interface TreatmentPlanData {
  planId?: string;
  clientId: string;
  clinicianId: string;
  
  planDate: string;
  effectiveDate: string;
  reviewDate: string;
  nextReviewDate?: string;
  
  diagnoses: Array<{
    icdCode: string;
    diagnosis: string;
    specifiers?: string;
    severity: 'Mild' | 'Moderate' | 'Severe';
    type: 'Principal' | 'Secondary';
  }>;
  
  problems: Array<{
    problemId: string;
    problemStatement: string;
    problemType: 'Clinical' | 'Psychosocial' | 'Environmental';
    severity: 'Mild' | 'Moderate' | 'Severe';
    dateIdentified: string;
    status: 'Active' | 'Resolved' | 'In Progress';
  }>;
  
  goals: Array<{
    goalId: string;
    relatedProblemId: string;
    goalStatement: string;
    goalType: 'Short-term' | 'Long-term';
    targetDate: string;
    objectives: Array<{
      objectiveId: string;
      objectiveStatement: string;
      targetDate: string;
      measurementMethod: string;
      frequency: string;
      status: 'Not Started' | 'In Progress' | 'Achieved' | 'Modified' | 'Discontinued';
      currentProgress: number;
      interventions: Array<{
        interventionId: string;
        interventionDescription: string;
        interventionType: string;
        frequency: string;
        responsibleParty: string;
      }>;
    }>;
    goalStatus: 'Not Started' | 'In Progress' | 'Achieved' | 'Modified' | 'Discontinued';
    goalProgress: number;
    dateAchieved?: string;
  }>;
  
  treatmentModalities: {
    primaryModality: 'Individual Therapy' | 'Couples Therapy' | 'Family Therapy' | 'Group Therapy' | 'Combined';
    frequency: string;
    duration: number;
    therapeuticApproaches: string[];
    adjunctServices: Array<{
      service: string;
      provider?: string;
      frequency?: string;
    }>;
  };
  
  psychoeducationTopics: string[];
  
  medicationPlan: {
    medicationsRequired: boolean;
    prescribingProvider?: string;
    medications: Array<{
      medicationName: string;
      dosage: string;
      frequency: string;
      indication: string;
    }>;
    monitoringPlan: string;
  };
  
  dischargeCriteria: string[];
  anticipatedDischargeDate?: string;
  
  barriersIdentified: boolean;
  barriers?: string[];
  planToAddressBarriers?: string;
  
  clientStrengths: string[];
  supportSystems: string[];
  communityResources: string[];
  
  progressSummary?: string;
  
  status: 'Active' | 'Under Review' | 'Updated' | 'Completed' | 'Inactive';
  
  signedDate?: string;
  signedBy?: string;
  digitalSignature?: string;
  clientAgreement: boolean;
  clientSignatureDate?: string;
  clientSignature?: string;
  
  requiresSupervisorCosign: boolean;
  supervisorCosigned: boolean;
  supervisorCosignDate?: string;
  supervisorId?: string;
  supervisorSignature?: string;
  supervisorComments?: string;
  
  versionNumber: number;
  previousVersionId?: string;
  lastModified?: string;
  lastModifiedBy?: string;
}

export default function TreatmentPlan() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('planId');
  const clientIdParam = searchParams.get('clientId');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableClients, setAvailableClients] = useState<any[]>([]);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [supervisorCosignDialogOpen, setSupervisorCosignDialogOpen] = useState(false);
  const [clinicianName, setClinicianName] = useState('');
  const [supervisorName, setSupervisorName] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const startTimeRef = useRef<number>(Date.now());

  const [formData, setFormData] = useState<TreatmentPlanData>({
    clientId: clientIdParam || '',
    clinicianId: user?.id || '',
    planDate: new Date().toISOString().split('T')[0],
    effectiveDate: new Date().toISOString().split('T')[0],
    reviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days from now
    diagnoses: [],
    problems: [],
    goals: [],
    treatmentModalities: {
      primaryModality: 'Individual Therapy',
      frequency: 'Weekly',
      duration: 50,
      therapeuticApproaches: [],
      adjunctServices: [],
    },
    psychoeducationTopics: [],
    medicationPlan: {
      medicationsRequired: false,
      medications: [],
      monitoringPlan: '',
    },
    dischargeCriteria: [],
    barriersIdentified: false,
    clientStrengths: [],
    supportSystems: [],
    communityResources: [],
    status: 'Active',
    clientAgreement: false,
    requiresSupervisorCosign: false,
    supervisorCosigned: false,
    versionNumber: 1,
  });

  useEffect(() => {
    loadClients();
    loadClinicianName();
    if (planId) {
      loadExistingPlan();
    } else if (clientIdParam) {
      loadClientIntakeData();
    }
  }, [planId, clientIdParam]);

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

  const loadClientIntakeData = async () => {
    if (!clientIdParam) return;

    try {
      // Load intake assessment
      const { data: intakeData, error: intakeError } = await supabase
        .from('clinical_notes')
        .select('*')
        .eq('client_id', clientIdParam)
        .eq('note_type', 'intake_assessment')
        .eq('locked', true)
        .order('date_of_service', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (intakeError) throw intakeError;

      // Load client demographics
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientIdParam)
        .single();

      if (clientError) throw clientError;

      // Pre-populate diagnoses from intake assessment
      if (intakeData?.diagnoses && intakeData.diagnoses.length > 0) {
        const diagnoses = intakeData.diagnoses.map((icdCode: string, index: number) => {
          // Look up the diagnosis description from ICD-10 codes
          const icd10Code = icd10MentalHealthCodes.find(code => code.code === icdCode);
          
          return {
            icdCode,
            diagnosis: icd10Code?.description || icdCode, // Use description if found, otherwise use the code
            severity: 'Moderate' as 'Mild' | 'Moderate' | 'Severe',
            type: (index === 0 ? 'Principal' : 'Secondary') as 'Principal' | 'Secondary',
          };
        });

        setFormData(prev => ({ ...prev, diagnoses }));
        
        toast({
          title: 'Diagnoses Loaded',
          description: `${diagnoses.length} diagnosis(es) imported from intake assessment`,
        });
      }

      // Pre-populate some client strengths/resources based on demographics
      const strengths: string[] = [];
      const supports: string[] = [];

      if (clientData) {
        if (clientData.primary_care_provider) {
          supports.push(`Primary Care Provider: ${clientData.primary_care_provider}`);
        }
        if (clientData.referring_provider) {
          supports.push(`Referring Provider: ${clientData.referring_provider}`);
        }
      }

      if (strengths.length > 0 || supports.length > 0) {
        setFormData(prev => ({
          ...prev,
          clientStrengths: [...prev.clientStrengths, ...strengths],
          supportSystems: [...prev.supportSystems, ...supports],
        }));
      }
    } catch (error) {
      console.error('Error loading intake data:', error);
    }
  };

  const loadExistingPlan = async () => {
    if (!planId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('treatment_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          planId: data.id,
          clientId: data.client_id,
          clinicianId: data.clinician_id,
          planDate: data.plan_date,
          effectiveDate: data.effective_date,
          reviewDate: data.review_date,
          nextReviewDate: data.next_review_date,
          diagnoses: (data.diagnoses || []) as any,
          problems: (data.problems || []) as any,
          goals: (data.goals || []) as any,
          treatmentModalities: (data.treatment_modalities || {
            primaryModality: 'Individual Therapy',
            frequency: 'Weekly',
            duration: 50,
            therapeuticApproaches: [],
            adjunctServices: [],
          }) as any,
          psychoeducationTopics: data.psychoeducation_topics || [],
          medicationPlan: (data.medication_plan || {
            medicationsRequired: false,
            medications: [],
            monitoringPlan: '',
          }) as any,
          dischargeCriteria: data.discharge_criteria || [],
          anticipatedDischargeDate: data.anticipated_discharge_date,
          barriersIdentified: Boolean(data.barriers_identified),
          barriers: data.barriers || [],
          planToAddressBarriers: data.plan_to_address_barriers,
          clientStrengths: data.client_strengths || [],
          supportSystems: data.support_systems || [],
          communityResources: data.community_resources || [],
          progressSummary: data.progress_summary,
          status: data.status as any,
          signedDate: data.signed_date,
          signedBy: data.signed_by,
          clientAgreement: Boolean(data.client_agreement),
          clientSignatureDate: data.client_signature_date,
          clientSignature: data.client_signature,
          digitalSignature: data.digital_signature,
          requiresSupervisorCosign: Boolean(data.requires_supervisor_cosign),
          supervisorCosigned: Boolean(data.supervisor_cosigned),
          supervisorCosignDate: data.supervisor_cosign_date,
          supervisorId: data.supervisor_id,
          supervisorSignature: data.supervisor_signature,
          supervisorComments: data.supervisor_comments || '',
          versionNumber: data.version_number || 1,
          previousVersionId: data.previous_version_id,
          lastModified: data.last_modified,
          lastModifiedBy: data.last_modified_by,
        });
      }
    } catch (error) {
      console.error('Error loading treatment plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to load treatment plan',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const savePlan = async () => {
    if (!formData.clientId) {
      toast({
        title: 'Required Field Missing',
        description: 'Please select a client',
        variant: 'destructive',
      });
      return;
    }

    if (formData.diagnoses.length === 0) {
      toast({
        title: 'Required Field Missing',
        description: 'Please add at least one diagnosis',
        variant: 'destructive',
      });
      return;
    }

    if (formData.goals.length === 0) {
      toast({
        title: 'Required Field Missing',
        description: 'Please add at least one treatment goal',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const planData: any = {
        client_id: formData.clientId,
        clinician_id: user?.id,
        plan_date: formData.planDate,
        effective_date: formData.effectiveDate,
        review_date: formData.reviewDate,
        next_review_date: formData.nextReviewDate,
        diagnoses: formData.diagnoses,
        problems: formData.problems,
        goals: formData.goals,
        treatment_modalities: formData.treatmentModalities,
        psychoeducation_topics: formData.psychoeducationTopics,
        medication_plan: formData.medicationPlan,
        discharge_criteria: formData.dischargeCriteria,
        anticipated_discharge_date: formData.anticipatedDischargeDate,
        barriers_identified: formData.barriersIdentified,
        barriers: formData.barriers,
        plan_to_address_barriers: formData.planToAddressBarriers,
        client_strengths: formData.clientStrengths,
        support_systems: formData.supportSystems,
        community_resources: formData.communityResources,
        progress_summary: formData.progressSummary,
        status: formData.status,
        client_agreement: formData.clientAgreement,
        requires_supervisor_cosign: formData.requiresSupervisorCosign,
        last_modified_by: user?.id,
      };

      if (planId) {
        planData.version_number = (formData as any).version_number ? (formData as any).version_number + 1 : 2;
        
        const { error } = await supabase
          .from('treatment_plans')
          .update(planData)
          .eq('id', planId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('treatment_plans')
          .insert(planData);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Treatment plan saved successfully',
      });

      navigate(`/clients/${formData.clientId}/chart`);
    } catch (error) {
      console.error('Error saving treatment plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to save treatment plan',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSign = async () => {
    try {
      setSaving(true);

      if (!planId) {
        toast({
          title: 'Error',
          description: 'Please save the treatment plan before signing',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('treatment_plans')
        .update({
          signed_date: new Date().toISOString(),
          signed_by: user?.id,
          digital_signature: clinicianName,
          status: 'Active',
        })
        .eq('id', planId);

      if (error) throw error;

      toast({
        title: 'Treatment Plan Signed',
        description: 'Treatment plan has been signed and activated',
      });

      setFormData(prev => ({ 
        ...prev, 
        status: 'Active',
        signedDate: new Date().toISOString(),
        signedBy: user?.id,
        digitalSignature: clinicianName,
      }));

      if (formData.requiresSupervisorCosign && !formData.supervisorCosigned) {
        toast({
          title: 'Supervisor Co-sign Required',
          description: 'This plan requires supervisor co-signature',
        });
      } else {
        navigate(`/clients/${formData.clientId}/chart`);
      }
    } catch (error) {
      console.error('Error signing treatment plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign treatment plan',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
      setSignatureDialogOpen(false);
    }
  };

  const handleSupervisorCosign = async (comments: string) => {
    try {
      setSaving(true);

      if (!planId) {
        toast({
          title: 'Error',
          description: 'Please save the treatment plan before co-signing',
          variant: 'destructive',
        });
        return;
      }

      // Load supervisor name
      const { data: supervisorData } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user?.id)
        .single();

      const supervisorFullName = supervisorData 
        ? `${supervisorData.first_name} ${supervisorData.last_name}` 
        : '';

      const { error } = await supabase
        .from('treatment_plans')
        .update({
          supervisor_cosigned: true,
          supervisor_cosign_date: new Date().toISOString(),
          supervisor_id: user?.id,
          supervisor_signature: supervisorFullName,
          supervisor_comments: comments,
        })
        .eq('id', planId);

      if (error) throw error;

      toast({
        title: 'Treatment Plan Co-signed',
        description: 'Supervisor co-signature has been added successfully',
      });

      setFormData(prev => ({ 
        ...prev, 
        supervisorCosigned: true,
        supervisorCosignDate: new Date().toISOString(),
        supervisorId: user?.id,
        supervisorSignature: supervisorFullName,
        supervisorComments: comments,
      }));
      
      navigate(`/clients/${formData.clientId}/chart`);
    } catch (error) {
      console.error('Error co-signing treatment plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to co-sign treatment plan',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
      setSupervisorCosignDialogOpen(false);
    }
  };

  const generateWithAI = async () => {
    if (!aiInput.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please provide client information or clinical notes for AI to process',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.clientId) {
      toast({
        title: 'Client Required',
        description: 'Please select a client first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setGeneratingAI(true);

      const { data, error } = await supabase.functions.invoke('generate-treatment-plan', {
        body: {
          freeTextInput: aiInput,
          clientId: formData.clientId,
          currentDiagnoses: formData.diagnoses,
        },
      });

      if (error) throw error;

      if (data?.treatmentPlan) {
        setAiSuggestion(data.treatmentPlan);

        toast({
          title: 'Treatment Plan Generated',
          description: 'AI has generated treatment plan suggestions. Please review and accept or reject.',
        });

        setAiInput('');
      }
    } catch (error: any) {
      console.error('Error generating treatment plan:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate treatment plan with AI',
        variant: 'destructive',
      });
    } finally {
      setGeneratingAI(false);
    }
  };

  const acceptAiSuggestion = () => {
    if (!aiSuggestion) return;

    setFormData(prev => ({
      ...prev,
      problems: aiSuggestion.problems || prev.problems,
      goals: aiSuggestion.goals || prev.goals,
      treatmentModalities: {
        ...prev.treatmentModalities,
        ...(aiSuggestion.treatmentModalities || {}),
      },
      psychoeducationTopics: aiSuggestion.psychoeducationTopics || prev.psychoeducationTopics,
      medicationPlan: aiSuggestion.medicationPlan || prev.medicationPlan,
      dischargeCriteria: aiSuggestion.dischargeCriteria || prev.dischargeCriteria,
      clientStrengths: aiSuggestion.clientStrengths || prev.clientStrengths,
    }));

    setAiSuggestion(null);

    toast({
      title: 'Suggestion Accepted',
      description: 'AI-generated content has been added to the treatment plan',
    });
  };

  const rejectAiSuggestion = () => {
    setAiSuggestion(null);
    toast({
      title: 'Suggestion Rejected',
      description: 'AI-generated content was discarded',
    });
  };

  const isSigned = Boolean(formData.signedDate && formData.signedBy);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Treatment Plan</h1>
              <p className="text-muted-foreground">
                Establish measurable goals and track treatment progress
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {isSigned && formData.requiresSupervisorCosign && !formData.supervisorCosigned && (
              <Button 
                onClick={() => {
                  // Load supervisor name
                  supabase
                    .from('profiles')
                    .select('first_name, last_name')
                    .eq('id', user?.id)
                    .single()
                    .then(({ data }) => {
                      if (data) {
                        setSupervisorName(`${data.first_name} ${data.last_name}`);
                      }
                      setSupervisorCosignDialogOpen(true);
                    });
                }}
                disabled={saving || loading}
                variant="default"
              >
                <FileSignature className="h-4 w-4 mr-2" />
                Supervisor Co-sign
              </Button>
            )}
            {!isSigned && (
              <Button 
                onClick={() => setSignatureDialogOpen(true)} 
                disabled={saving || loading}
                variant="outline"
              >
                <FileSignature className="h-4 w-4 mr-2" />
                Sign Plan
              </Button>
            )}
            <Button onClick={savePlan} disabled={saving || loading || isSigned}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Plan'}
            </Button>
          </div>
        </div>

        {isSigned && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <div>
                  <strong>Signed & Active:</strong> This treatment plan has been signed. 
                  {formData.requiresSupervisorCosign && !formData.supervisorCosigned && (
                    <span className="text-warning ml-2">Awaiting supervisor co-signature.</span>
                  )}
                  {formData.supervisorCosigned && (
                    <span className="text-green-600 ml-2">Supervisor co-signed.</span>
                  )}
                </div>
                <Badge variant="outline">Version {formData.versionNumber}</Badge>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {formData.requiresSupervisorCosign && !formData.supervisorCosigned && isSigned && (
          <Alert variant="default">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This treatment plan requires supervisor co-signature before it is fully active.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Plan Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client *</Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, clientId: value }));
                    if (!planId) {
                      loadClientIntakeData();
                    }
                  }}
                  disabled={isSigned}
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
                <Label>Status</Label>
                <div className="flex gap-2 items-center">
                  <Badge variant={formData.status === 'Active' ? 'default' : 'secondary'}>
                    {formData.status}
                  </Badge>
                  <Badge variant="outline">
                    Version {formData.versionNumber}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="requires-supervisor"
                checked={formData.requiresSupervisorCosign}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, requiresSupervisorCosign: checked as boolean }))
                }
                disabled={isSigned}
              />
              <Label htmlFor="requires-supervisor" className="cursor-pointer">
                This plan requires supervisor co-signature
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="client-agreement"
                checked={formData.clientAgreement}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ 
                    ...prev, 
                    clientAgreement: checked as boolean,
                    clientSignatureDate: checked ? new Date().toISOString() : undefined
                  }))
                }
                disabled={isSigned}
              />
              <Label htmlFor="client-agreement" className="cursor-pointer">
                Client has reviewed and agreed to this treatment plan
              </Label>
            </div>

            {formData.clientAgreement && formData.clientSignatureDate && (
              <p className="text-xs text-muted-foreground">
                Client agreed on {format(new Date(formData.clientSignatureDate), 'MMM d, yyyy h:mm a')}
              </p>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Plan Date *</Label>
                <Input
                  type="date"
                  value={formData.planDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, planDate: e.target.value }))}
                  disabled={isSigned}
                />
              </div>

              <div>
                <Label>Effective Date *</Label>
                <Input
                  type="date"
                  value={formData.effectiveDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, effectiveDate: e.target.value }))}
                  disabled={isSigned}
                />
              </div>

              <div>
                <Label>Review Date *</Label>
                <Input
                  type="date"
                  value={formData.reviewDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, reviewDate: e.target.value }))}
                  disabled={isSigned}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI-Assisted Generation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Client Information & Clinical Notes</Label>
              <Textarea
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Describe the client's presenting concerns, current functioning, treatment needs, and any relevant background information. The AI will help generate treatment goals, objectives, and interventions..."
                rows={6}
                disabled={generatingAI || !formData.clientId}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Provide detailed clinical information to help generate appropriate treatment goals and objectives.
              </p>
            </div>

            <Button
              onClick={generateWithAI}
              disabled={generatingAI || !aiInput.trim() || !formData.clientId}
              className="w-full"
            >
              {generatingAI ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                  Generating Treatment Plan...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Generate Treatment Plan with AI
                </>
              )}
            </Button>

            {!formData.clientId && (
              <p className="text-sm text-warning">Please select a client first</p>
            )}
          </CardContent>
        </Card>

        {aiSuggestion && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI-Generated Treatment Plan Suggestions
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={acceptAiSuggestion}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Accept All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={rejectAiSuggestion}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Review the AI-generated suggestions below and accept to add them to your treatment plan.
              </p>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="diagnoses" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="diagnoses">Diagnoses & Problems</TabsTrigger>
            <TabsTrigger value="goals">Goals & Objectives</TabsTrigger>
            <TabsTrigger value="treatment">Treatment Approach</TabsTrigger>
            <TabsTrigger value="strengths">Strengths & Discharge</TabsTrigger>
            <TabsTrigger value="review">Progress & Review</TabsTrigger>
          </TabsList>

          <TabsContent value="diagnoses" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <DiagnosesSection
                  data={formData}
                  onChange={setFormData}
                  disabled={isSigned}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <ProblemsSection
                  data={formData}
                  onChange={setFormData}
                  disabled={isSigned}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="goals" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <GoalsSection
                  data={formData}
                  onChange={setFormData}
                  disabled={isSigned}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="treatment" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <TreatmentModalitiesSection
                  data={formData}
                  onChange={setFormData}
                  disabled={isSigned}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <PsychoeducationSection
                  data={formData}
                  onChange={setFormData}
                  disabled={isSigned}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <MedicationPlanSection
                  data={formData}
                  onChange={setFormData}
                  disabled={isSigned}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="strengths" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <StrengthsBarriersSection
                  data={formData}
                  onChange={setFormData}
                  disabled={isSigned}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <DischargeSection
                  data={formData}
                  onChange={setFormData}
                  disabled={isSigned}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="review" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <ProgressReviewSection
                  data={formData}
                  onChange={setFormData}
                  disabled={isSigned}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <SignatureDialog
          open={signatureDialogOpen}
          onOpenChange={setSignatureDialogOpen}
          onSign={handleSign}
          clinicianName={clinicianName}
          noteType="Treatment Plan"
        />

        <SupervisorCosignDialog
          open={supervisorCosignDialogOpen}
          onOpenChange={setSupervisorCosignDialogOpen}
          onCosign={handleSupervisorCosign}
          supervisorName={supervisorName}
        />
      </div>
    </DashboardLayout>
  );
}
