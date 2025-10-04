import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, X } from 'lucide-react';
import { AISectionWrapper } from './AISectionWrapper';

interface TreatmentRecommendationsProps {
  data: any;
  initialGoals: any[];
  onRecommendationsChange: (data: any) => void;
  onGoalsChange: (goals: any[]) => void;
  clientId?: string;
  fullContext?: string;
}

export function TreatmentRecommendationsSection({
  data,
  initialGoals,
  onRecommendationsChange,
  onGoalsChange,
  clientId,
  fullContext
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

  const renderTreatmentSuggestion = (content: any, isEditing: boolean, onEdit: (newContent: any) => void) => {
    if (isEditing) {
      return <Textarea value={JSON.stringify(content, null, 2)} onChange={(e) => {
        try { onEdit(JSON.parse(e.target.value)); } catch {}
      }} rows={10} />;
    }
    return <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(content, null, 2)}</pre>;
  };

  return (
    <AISectionWrapper
      sectionType="treatment"
      clientId={clientId}
      context={fullContext || ''}
      existingData={{ ...data, initialGoals }}
      onAccept={(content) => {
        if (content.initialGoals) {
          onGoalsChange(content.initialGoals);
          delete content.initialGoals;
        }
        onRecommendationsChange({ ...data, ...content });
      }}
      renderSuggestion={renderTreatmentSuggestion}
    >
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
              value={
                Array.isArray(data.therapeuticApproach)
                  ? data.therapeuticApproach.join(', ')
                  : data.therapeuticApproach || ''
              }
              onChange={(e) => onRecommendationsChange({
                ...data,
                therapeuticApproach: e.target.value.split(',').map(s => s.trim()).filter(s => s)
              })}
              placeholder="CBT, DBT, Psychodynamic, EMDR, etc. (comma-separated)"
              rows={2}
            />
          </div>

          <Separator />

          <div>
            <Label className="text-base font-semibold">Medication Recommendation</Label>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label>Medication Recommended</Label>
                <Switch
                  checked={data.medicationRecommendation?.recommended || false}
                  onCheckedChange={(v) => onRecommendationsChange({
                    ...data,
                    medicationRecommendation: {
                      ...(data.medicationRecommendation || {}),
                      recommended: v
                    }
                  })}
                />
              </div>

              {data.medicationRecommendation?.recommended && (
                <div className="ml-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Referral Made</Label>
                    <Switch
                      checked={data.medicationRecommendation?.referralMade || false}
                      onCheckedChange={(v) => onRecommendationsChange({
                        ...data,
                        medicationRecommendation: {
                          ...(data.medicationRecommendation || {}),
                          referralMade: v
                        }
                      })}
                    />
                  </div>

                  {data.medicationRecommendation?.referralMade && (
                    <div>
                      <Label>Referral To</Label>
                      <Input
                        value={data.medicationRecommendation?.referralTo || ''}
                        onChange={(e) => onRecommendationsChange({
                          ...data,
                          medicationRecommendation: {
                            ...(data.medicationRecommendation || {}),
                            referralTo: e.target.value
                          }
                        })}
                        placeholder="Psychiatrist name or practice"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div>
            <Label>Additional Recommendations</Label>
            <Textarea
              value={
                Array.isArray(data.additionalRecommendations)
                  ? data.additionalRecommendations.join('\n')
                  : data.additionalRecommendations || ''
              }
              onChange={(e) => onRecommendationsChange({
                ...data,
                additionalRecommendations: e.target.value.split('\n').filter(s => s.trim())
              })}
              placeholder="Support groups, lifestyle changes, additional services... (one per line)"
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
    </AISectionWrapper>
  );
}
