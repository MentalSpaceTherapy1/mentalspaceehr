import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';

interface AssessmentSectionProps {
  data: any;
  onChange: (data: any) => void;
  disabled?: boolean;
  clientGoals?: any[];
}

export function AssessmentSection({ data, onChange, disabled, clientGoals = [] }: AssessmentSectionProps) {
  const [newDiagnosis, setNewDiagnosis] = useState({ icdCode: '', diagnosis: '', status: 'Active' });

  const updateProgressTowardGoals = (field: string, value: any) => {
    onChange({
      ...data,
      assessment: {
        ...data.assessment,
        progressTowardGoals: {
          ...data.assessment.progressTowardGoals,
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
    const goalProgress = data.assessment.progressTowardGoals.goalProgress || [];
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
    const goalProgress = [...data.assessment.progressTowardGoals.goalProgress];
    goalProgress[index] = {
      ...goalProgress[index],
      [field]: value,
    };
    updateProgressTowardGoals('goalProgress', goalProgress);
  };

  const removeGoalProgress = (index: number) => {
    const goalProgress = data.assessment.progressTowardGoals.goalProgress.filter(
      (_: any, i: number) => i !== index
    );
    updateProgressTowardGoals('goalProgress', goalProgress);
  };

  const addDiagnosis = () => {
    if (!newDiagnosis.icdCode || !newDiagnosis.diagnosis) return;

    const currentDiagnoses = data.assessment.currentDiagnoses || [];
    updateAssessment('currentDiagnoses', [...currentDiagnoses, newDiagnosis]);
    setNewDiagnosis({ icdCode: '', diagnosis: '', status: 'Active' });
  };

  const removeDiagnosis = (index: number) => {
    const currentDiagnoses = data.assessment.currentDiagnoses.filter(
      (_: any, i: number) => i !== index
    );
    updateAssessment('currentDiagnoses', currentDiagnoses);
  };

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
              value={data.assessment.progressTowardGoals.overallProgress}
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

            {data.assessment.progressTowardGoals.goalProgress?.map((goal: any, index: number) => (
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
          {!disabled && (
            <div className="grid grid-cols-4 gap-2">
              <Input
                placeholder="ICD-10 Code"
                value={newDiagnosis.icdCode}
                onChange={(e) => setNewDiagnosis({ ...newDiagnosis, icdCode: e.target.value })}
              />
              <Input
                placeholder="Diagnosis"
                value={newDiagnosis.diagnosis}
                onChange={(e) => setNewDiagnosis({ ...newDiagnosis, diagnosis: e.target.value })}
                className="col-span-2"
              />
              <Button type="button" onClick={addDiagnosis}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          )}

          <div className="space-y-2">
            {data.assessment.currentDiagnoses?.map((diagnosis: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Badge variant="secondary">{diagnosis.icdCode}</Badge>
                  <span className="font-medium">{diagnosis.diagnosis}</span>
                  <Badge
                    variant={
                      diagnosis.status === 'Active'
                        ? 'default'
                        : diagnosis.status === 'In Remission'
                        ? 'outline'
                        : 'secondary'
                    }
                  >
                    {diagnosis.status}
                  </Badge>
                </div>
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDiagnosis(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
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
              value={data.assessment.clinicalImpression}
              onChange={(e) => updateAssessment('clinicalImpression', e.target.value)}
              placeholder="Synthesize subjective and objective data. Clinical formulation of client's current status..."
              rows={6}
              disabled={disabled}
            />
          </div>

          <div>
            <Label>Medical Necessity *</Label>
            <Textarea
              value={data.assessment.medicalNecessity}
              onChange={(e) => updateAssessment('medicalNecessity', e.target.value)}
              placeholder="Justification for continued treatment. How does this treatment address the client's needs?"
              rows={4}
              disabled={disabled}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="treatment-plan-changes"
              checked={data.assessment.changesToTreatmentPlan}
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
