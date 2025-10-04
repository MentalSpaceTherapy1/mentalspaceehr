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
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Recommended Frequency</Label>
            <Input
              value={content.recommendedFrequency || ''}
              onChange={(e) => onEdit({ ...content, recommendedFrequency: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Recommended Modality</Label>
            <Input
              value={content.recommendedModality || ''}
              onChange={(e) => onEdit({ ...content, recommendedModality: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Therapeutic Approaches (comma-separated)</Label>
            <Textarea
              value={Array.isArray(content.therapeuticApproach) ? content.therapeuticApproach.join(', ') : content.therapeuticApproach || ''}
              onChange={(e) => onEdit({ ...content, therapeuticApproach: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
              rows={2}
            />
          </div>
          <div>
            <Label className="text-xs">Additional Recommendations (one per line)</Label>
            <Textarea
              value={Array.isArray(content.additionalRecommendations) ? content.additionalRecommendations.join('\n') : content.additionalRecommendations || ''}
              onChange={(e) => onEdit({ ...content, additionalRecommendations: e.target.value.split('\n').filter(s => s.trim()) })}
              rows={3}
            />
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-3 text-sm">
        {content.recommendedFrequency && (
          <div>
            <span className="font-semibold">Frequency:</span> {content.recommendedFrequency}
          </div>
        )}
        {content.recommendedModality && (
          <div>
            <span className="font-semibold">Modality:</span> {content.recommendedModality}
          </div>
        )}
        {content.therapeuticApproach && (
          <div>
            <span className="font-semibold">Approaches:</span> {Array.isArray(content.therapeuticApproach) ? content.therapeuticApproach.join(', ') : content.therapeuticApproach}
          </div>
        )}
        {content.medicationRecommendation?.recommended && (
          <div>
            <span className="font-semibold">Medication:</span> Recommended
            {content.medicationRecommendation.referralMade && ` (Referral to: ${content.medicationRecommendation.referralTo})`}
          </div>
        )}
        {content.additionalRecommendations && (
          <div>
            <span className="font-semibold">Additional:</span>
            <ul className="list-disc list-inside mt-1">
              {(Array.isArray(content.additionalRecommendations) ? content.additionalRecommendations : [content.additionalRecommendations]).map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
        {content.initialGoals && content.initialGoals.length > 0 && (
          <div>
            <span className="font-semibold">Treatment Goals:</span>
            <ul className="list-disc list-inside mt-1">
              {content.initialGoals.map((goal: any, i: number) => (
                <li key={i}>{goal.goalDescription}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <AISectionWrapper
      sectionType="treatment"
      clientId={clientId}
      context={fullContext || ''}
      existingData={{ ...data, initialGoals }}
      onAccept={(content) => {
        const updatedData = { ...data };
        
        // Handle top-level fields
        if (content.recommendedFrequency) updatedData.recommendedFrequency = content.recommendedFrequency;
        if (content.recommendedModality) updatedData.recommendedModality = content.recommendedModality;
        if (content.therapeuticApproach) {
          updatedData.therapeuticApproach = Array.isArray(content.therapeuticApproach) 
            ? content.therapeuticApproach 
            : [content.therapeuticApproach];
        }
        if (content.additionalRecommendations) {
          updatedData.additionalRecommendations = Array.isArray(content.additionalRecommendations)
            ? content.additionalRecommendations
            : [content.additionalRecommendations];
        }
        
        // Handle medication recommendation (nested object with boolean)
        if (content.medicationRecommendation) {
          updatedData.medicationRecommendation = {
            recommended: content.medicationRecommendation.recommended || false,
            referralMade: content.medicationRecommendation.referralMade || false,
            referralTo: content.medicationRecommendation.referralTo || ''
          };
        }
        
        // Handle goals separately
        if (content.initialGoals && Array.isArray(content.initialGoals)) {
          onGoalsChange(content.initialGoals);
        }
        
        onRecommendationsChange(updatedData);
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
