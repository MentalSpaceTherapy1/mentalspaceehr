import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, ArrowLeft, FileSignature, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SignatureDialog } from '@/components/intake/SignatureDialog';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  clientAgreement: boolean;
  clientSignatureDate?: string;
  
  requiresSupervisorCosign: boolean;
  supervisorCosigned: boolean;
  supervisorCosignDate?: string;
  supervisorId?: string;
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
  const [clinicianName, setClinicianName] = useState('');

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
      const { data, error } = await supabase
        .from('clinical_notes')
        .select('*')
        .eq('client_id', clientIdParam)
        .eq('note_type', 'intake_assessment')
        .eq('locked', true)
        .order('date_of_service', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data?.diagnoses && data.diagnoses.length > 0) {
        const diagnoses = data.diagnoses.map((icdCode: string, index: number) => ({
          icdCode,
          diagnosis: '', // Will need to look up from ICD-10 codes
          severity: 'Moderate' as 'Mild' | 'Moderate' | 'Severe',
          type: (index === 0 ? 'Principal' : 'Secondary') as 'Principal' | 'Secondary',
        }));

        setFormData(prev => ({ ...prev, diagnoses }));
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
          requiresSupervisorCosign: Boolean(data.requires_supervisor_cosign),
          supervisorCosigned: Boolean(data.supervisor_cosigned),
          supervisorCosignDate: data.supervisor_cosign_date,
          supervisorId: data.supervisor_id,
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
          status: 'Active',
        })
        .eq('id', planId);

      if (error) throw error;

      toast({
        title: 'Treatment Plan Signed',
        description: 'Treatment plan has been signed and activated',
      });

      setFormData(prev => ({ ...prev, status: 'Active' }));
      navigate(`/clients/${formData.clientId}/chart`);
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
              <strong>Signed & Active:</strong> This treatment plan has been signed. Create a new version to make changes.
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
                <Badge variant={formData.status === 'Active' ? 'default' : 'secondary'}>
                  {formData.status}
                </Badge>
              </div>
            </div>

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
            <CardTitle>Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              The full treatment plan interface with goals, objectives, and interventions is being developed.
              You can save basic information for now.
            </p>
          </CardContent>
        </Card>

        <SignatureDialog
          open={signatureDialogOpen}
          onOpenChange={setSignatureDialogOpen}
          onSign={handleSign}
          clinicianName={clinicianName}
        />
      </div>
    </DashboardLayout>
  );
}
