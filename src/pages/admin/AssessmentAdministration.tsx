import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import { useClinicalAssessments } from '@/hooks/useClinicalAssessments';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function AssessmentAdministration() {
  const { assessmentId, administrationId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { fetchAssessmentById, fetchAdministrationById, updateAdministration } = useClinicalAssessments();
  
  const [assessment, setAssessment] = useState<any>(null);
  const [administration, setAdministration] = useState<any>(null);
  const [responses, setResponses] = useState<{ [key: number]: number }>({});
  const [clientName, setClientName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!assessmentId || !administrationId) return;

      try {
        const [assessmentData, administrationData] = await Promise.all([
          fetchAssessmentById(assessmentId),
          fetchAdministrationById(administrationId)
        ]);

        if (assessmentData && administrationData) {
          setAssessment(assessmentData);
          setAdministration(administrationData);

          // Load existing responses if any
          if (administrationData.responses && administrationData.responses.length > 0) {
            const existingResponses: { [key: number]: number } = {};
            administrationData.responses.forEach((r: any) => {
              existingResponses[r.item_id] = r.response;
            });
            setResponses(existingResponses);
          }

          // Fetch client name
          const { data: clientData } = await supabase
            .from('clients')
            .select('first_name, last_name')
            .eq('id', administrationData.client_id)
            .single();

          if (clientData) {
            setClientName(`${clientData.first_name} ${clientData.last_name}`);
          }
        }
      } catch (error) {
        console.error('Error loading assessment:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [assessmentId, administrationId]);

  const handleResponseChange = (itemId: number, value: number) => {
    setResponses(prev => ({ ...prev, [itemId]: value }));
  };

  const handleSave = async () => {
    if (!assessment || !administrationId) return;

    const responseArray = Object.entries(responses).map(([itemId, response]) => ({
      item_id: parseInt(itemId),
      response
    }));

    if (responseArray.length !== assessment.total_items) {
      toast({
        title: 'Incomplete assessment',
        description: 'Please answer all questions before saving.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateAdministration(administrationId, responseArray, assessmentId!);
      toast({
        title: 'Success',
        description: 'Assessment saved successfully.',
      });
      navigate('/admin/assessments');
    } catch (error) {
      console.error('Error saving assessment:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!assessment || !administration) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Not Found</CardTitle>
              <CardDescription>The requested assessment could not be loaded.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/admin/assessments')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Assessments
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const responseOptions = assessment.scoring_algorithm.response_options || [];

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{assessment.assessment_name}</h1>
            <p className="text-muted-foreground">Client: {clientName}</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin/assessments')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{assessment.acronym} - {assessment.assessment_name}</CardTitle>
            <CardDescription>{assessment.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {assessment.scoring_algorithm.items.map((item: any, index: number) => (
              <div key={item.id} className="space-y-3 p-4 border rounded-lg">
                <Label className="text-base font-medium">
                  {index + 1}. {item.text}
                </Label>
                <RadioGroup
                  value={responses[item.id]?.toString()}
                  onValueChange={(value) => handleResponseChange(item.id, parseInt(value))}
                >
                  {responseOptions.map((option: any) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value.toString()} id={`item-${item.id}-${option.value}`} />
                      <Label htmlFor={`item-${item.id}-${option.value}`} className="font-normal cursor-pointer">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                onClick={handleSave}
                disabled={isSaving || Object.keys(responses).length !== assessment.total_items}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Assessment
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
