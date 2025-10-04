import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AssessmentSectionProps {
  data: any;
  onChange: (data: any) => void;
  disabled?: boolean;
  clientGoals?: any[];
  intakeNote?: any;
}

export function AssessmentSection({ data, onChange, disabled, clientGoals = [], intakeNote }: AssessmentSectionProps) {

  const updateProgressTowardGoals = (field: string, value: any) => {
    onChange({
      ...data,
      assessment: {
        ...data.assessment,
        progressTowardGoals: {
          ...(data.assessment.progressTowardGoals || {}),
          [field]: value,
        },
      },
    });
  };

  const updateAssessment = (field: string, value: any) => {
    onChange({
      ...data,
      assessment: {
        ...data.assessment,
        [field]: value,
      },
    });
  };

  const addGoalProgress = () => {
    const goalProgress = data.assessment.progressTowardGoals?.goalProgress || [];
    updateProgressTowardGoals('goalProgress', [
      ...goalProgress,
      {
        goalId: '',
        goalDescription: '',
        progress: 'Some Progress',
        details: '',
      },
    ]);
  };

  const updateGoalProgress = (index: number, field: string, value: any) => {
    const goalProgress = [...(data.assessment.progressTowardGoals?.goalProgress || [])];
    goalProgress[index] = {
      ...goalProgress[index],
      [field]: value,
    };
    updateProgressTowardGoals('goalProgress', goalProgress);
  };

  const removeGoalProgress = (index: number) => {
    const goalProgress = (data.assessment.progressTowardGoals?.goalProgress || []).filter(
      (_: any, i: number) => i !== index
    );
    updateProgressTowardGoals('goalProgress', goalProgress);
  };

  // Get diagnoses from intake note
  const intakeDiagnoses = intakeNote?.diagnoses || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Progress Toward Goals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Overall Progress</Label>
            <Select
              value={data.assessment.progressTowardGoals?.overallProgress || 'Fair'}
              onValueChange={(value) => updateProgressTowardGoals('overallProgress', value)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Excellent">Excellent</SelectItem>
                <SelectItem value="Good">Good</SelectItem>
                <SelectItem value="Fair">Fair</SelectItem>
                <SelectItem value="Poor">Poor</SelectItem>
                <SelectItem value="No Progress">No Progress</SelectItem>
                <SelectItem value="Regression">Regression</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Individual Goal Progress</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addGoalProgress}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Goal
              </Button>
            </div>

            {data.assessment.progressTowardGoals?.goalProgress?.map((goal: any, index: number) => (
              <Card key={index} className="relative">
                <CardContent className="pt-6 space-y-3">
                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => removeGoalProgress(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}

                  <div>
                    <Label className="text-sm">Goal Description</Label>
                    <Textarea
                      value={goal.goalDescription}
                      onChange={(e) => updateGoalProgress(index, 'goalDescription', e.target.value)}
                      placeholder="Describe the treatment goal..."
                      rows={2}
                      disabled={disabled}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Progress Status</Label>
                      <Select
                        value={goal.progress}
                        onValueChange={(value) => updateGoalProgress(index, 'progress', value)}
                        disabled={disabled}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Achieved">Achieved</SelectItem>
                          <SelectItem value="Significant Progress">Significant Progress</SelectItem>
                          <SelectItem value="Some Progress">Some Progress</SelectItem>
                          <SelectItem value="No Progress">No Progress</SelectItem>
                          <SelectItem value="Regression">Regression</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm">Details</Label>
                      <Textarea
                        value={goal.details}
                        onChange={(e) => updateGoalProgress(index, 'details', e.target.value)}
                        placeholder="Specific evidence of progress..."
                        rows={2}
                        disabled={disabled}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Diagnoses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription className="text-sm">
              Diagnoses are pulled from the client's Intake Assessment and cannot be modified in Progress Notes.
            </AlertDescription>
          </Alert>

          {intakeDiagnoses.length > 0 ? (
            <div className="space-y-2">
              {intakeDiagnoses.map((diagnosisCode: string, index: number) => (
                <div key={index} className="flex items-center gap-4 p-3 border rounded-lg bg-muted/30">
                  <Badge variant="secondary" className="font-mono">
                    {diagnosisCode}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {index === 0 && <Badge variant="outline" className="mr-2">Primary</Badge>}
                    {index > 0 && <Badge variant="outline" className="mr-2">Secondary</Badge>}
                    From Intake Assessment
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertDescription>
                No diagnoses found in Intake Assessment. Please ensure an Intake Assessment with diagnoses is completed for this client.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clinical Impression</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Clinical Impression *</Label>
            <Textarea
              value={data.assessment.clinicalImpression || ''}
              onChange={(e) => updateAssessment('clinicalImpression', e.target.value)}
              placeholder="Synthesize subjective and objective data. Clinical formulation of client's current status..."
              rows={6}
              disabled={disabled}
            />
          </div>

          <div>
            <Label>Medical Necessity *</Label>
            <Textarea
              value={data.assessment.medicalNecessity || ''}
              onChange={(e) => updateAssessment('medicalNecessity', e.target.value)}
              placeholder="Justification for continued treatment. How does this treatment address the client's needs?"
              rows={4}
              disabled={disabled}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="treatment-plan-changes"
              checked={data.assessment.changesToTreatmentPlan || false}
              onCheckedChange={(checked) => updateAssessment('changesToTreatmentPlan', checked)}
              disabled={disabled}
            />
            <Label htmlFor="treatment-plan-changes" className="cursor-pointer">
              Changes to Treatment Plan
            </Label>
          </div>

          {data.assessment.changesToTreatmentPlan && (
            <div>
              <Label>Treatment Plan Change Details *</Label>
              <Textarea
                value={data.assessment.changeDetails || ''}
                onChange={(e) => updateAssessment('changeDetails', e.target.value)}
                placeholder="Describe what changes are being made to the treatment plan and why..."
                rows={4}
                disabled={disabled}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
