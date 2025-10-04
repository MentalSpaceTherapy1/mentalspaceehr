import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';

interface TreatmentRecommendationsProps {
  data: any;
  initialGoals: any[];
  onRecommendationsChange: (data: any) => void;
  onGoalsChange: (goals: any[]) => void;
}

export function TreatmentRecommendationsSection({
  data,
  initialGoals,
  onRecommendationsChange,
  onGoalsChange
}: TreatmentRecommendationsProps) {
  const addGoal = () => {
    onGoalsChange([
      ...(initialGoals || []),
      { goalDescription: '', targetDate: '', measurableOutcome: '' }
    ]);
  };

  const removeGoal = (index: number) => {
    const goals = [...(initialGoals || [])];
    goals.splice(index, 1);
    onGoalsChange(goals);
  };

  const updateGoal = (index: number, field: string, value: string) => {
    const goals = [...(initialGoals || [])];
    goals[index] = { ...goals[index], [field]: value };
    onGoalsChange(goals);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Treatment Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Recommended Frequency</Label>
              <Select
                value={data.recommendedFrequency}
                onValueChange={(v) => onRecommendationsChange({ ...data, recommendedFrequency: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Biweekly">Biweekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="As Needed">As Needed</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Recommended Modality</Label>
              <Select
                value={data.recommendedModality}
                onValueChange={(v) => onRecommendationsChange({ ...data, recommendedModality: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select modality..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Individual">Individual</SelectItem>
                  <SelectItem value="Couples">Couples</SelectItem>
                  <SelectItem value="Family">Family</SelectItem>
                  <SelectItem value="Group">Group</SelectItem>
                  <SelectItem value="Combination">Combination</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Therapeutic Approaches</Label>
            <Textarea
              value={data.therapeuticApproach?.join(', ') || ''}
              onChange={(e) => onRecommendationsChange({
                ...data,
                therapeuticApproach: e.target.value.split(',').map(s => s.trim())
              })}
              placeholder="CBT, DBT, Psychodynamic, EMDR, etc. (comma-separated)"
              rows={2}
            />
          </div>

          <div>
            <Label>Additional Recommendations</Label>
            <Textarea
              value={data.additionalRecommendations?.join('\n') || ''}
              onChange={(e) => onRecommendationsChange({
                ...data,
                additionalRecommendations: e.target.value.split('\n')
              })}
              placeholder="Medication evaluation, support groups, lifestyle changes... (one per line)"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Initial Treatment Goals</CardTitle>
          <Button onClick={addGoal} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Goal
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {(initialGoals || []).map((goal, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <h4 className="font-medium">Goal {index + 1}</h4>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeGoal(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div>
                <Label>Goal Description</Label>
                <Textarea
                  value={goal.goalDescription || ''}
                  onChange={(e) => updateGoal(index, 'goalDescription', e.target.value)}
                  placeholder="Client will reduce anxiety symptoms by 50%..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Target Date</Label>
                  <Input
                    type="date"
                    value={goal.targetDate || ''}
                    onChange={(e) => updateGoal(index, 'targetDate', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Measurable Outcome</Label>
                  <Input
                    value={goal.measurableOutcome || ''}
                    onChange={(e) => updateGoal(index, 'measurableOutcome', e.target.value)}
                    placeholder="GAD-7 score < 10"
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
