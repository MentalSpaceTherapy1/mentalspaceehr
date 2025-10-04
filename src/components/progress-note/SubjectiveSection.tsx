import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';
import { useState } from 'react';

interface SubjectiveSectionProps {
  data: any;
  onChange: (data: any) => void;
  disabled?: boolean;
}

export function SubjectiveSection({ data, onChange, disabled }: SubjectiveSectionProps) {
  const [newSymptom, setNewSymptom] = useState('');

  const updateSubjective = (field: string, value: any) => {
    onChange({
      ...data,
      subjective: {
        ...data.subjective,
        [field]: value,
      },
    });
  };

  const updateFunctionalImpairment = (field: string, value: any) => {
    onChange({
      ...data,
      subjective: {
        ...data.subjective,
        functionalImpairment: {
          ...data.subjective.functionalImpairment,
          [field]: value,
        },
      },
    });
  };

  const addSymptom = (category: 'symptomsReported' | 'symptomsImproved' | 'symptomsWorsened' | 'symptomsUnchanged') => {
    if (!newSymptom.trim()) return;
    
    const currentSymptoms = data.subjective[category] || [];
    updateSubjective(category, [...currentSymptoms, newSymptom.trim()]);
    setNewSymptom('');
  };

  const removeSymptom = (category: string, index: number) => {
    const currentSymptoms = data.subjective[category] || [];
    updateSubjective(category, currentSymptoms.filter((_: any, i: number) => i !== index));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Client's Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Presenting Concerns *</Label>
            <Textarea
              value={data.subjective.presentingConcerns}
              onChange={(e) => updateSubjective('presentingConcerns', e.target.value)}
              placeholder="What brings the client to session today? What are their main concerns?"
              rows={4}
              disabled={disabled}
            />
          </div>

          <div>
            <Label>Mood Report</Label>
            <Textarea
              value={data.subjective.moodReport}
              onChange={(e) => updateSubjective('moodReport', e.target.value)}
              placeholder="Client reports feeling..."
              rows={2}
              disabled={disabled}
            />
          </div>

          <div>
            <Label>Recent Events</Label>
            <Textarea
              value={data.subjective.recentEvents}
              onChange={(e) => updateSubjective('recentEvents', e.target.value)}
              placeholder="Significant events since last session..."
              rows={3}
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Symptom Tracking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Add Symptoms</Label>
            <div className="flex gap-2">
              <Input
                value={newSymptom}
                onChange={(e) => setNewSymptom(e.target.value)}
                placeholder="Enter symptom..."
                disabled={disabled}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSymptom('symptomsReported');
                  }
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Symptoms Reported</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {data.subjective.symptomsReported?.map((symptom: string, index: number) => (
                  <Badge key={index} variant="secondary">
                    {symptom}
                    {!disabled && (
                      <X
                        className="h-3 w-3 ml-1 cursor-pointer"
                        onClick={() => removeSymptom('symptomsReported', index)}
                      />
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Symptoms Improved</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {data.subjective.symptomsImproved?.map((symptom: string, index: number) => (
                  <Badge key={index} variant="default" className="bg-green-500">
                    {symptom}
                    {!disabled && (
                      <X
                        className="h-3 w-3 ml-1 cursor-pointer"
                        onClick={() => removeSymptom('symptomsImproved', index)}
                      />
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Symptoms Worsened</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {data.subjective.symptomsWorsened?.map((symptom: string, index: number) => (
                  <Badge key={index} variant="destructive">
                    {symptom}
                    {!disabled && (
                      <X
                        className="h-3 w-3 ml-1 cursor-pointer"
                        onClick={() => removeSymptom('symptomsWorsened', index)}
                      />
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Symptoms Unchanged</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {data.subjective.symptomsUnchanged?.map((symptom: string, index: number) => (
                  <Badge key={index} variant="outline">
                    {symptom}
                    {!disabled && (
                      <X
                        className="h-3 w-3 ml-1 cursor-pointer"
                        onClick={() => removeSymptom('symptomsUnchanged', index)}
                      />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Medication & Homework</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Medication Adherence</Label>
              <Select
                value={data.subjective.medicationAdherence}
                onValueChange={(value) => updateSubjective('medicationAdherence', value)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="N/A">N/A</SelectItem>
                  <SelectItem value="Compliant">Compliant</SelectItem>
                  <SelectItem value="Partial">Partial</SelectItem>
                  <SelectItem value="Non-Compliant">Non-Compliant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Homework Compliance</Label>
              <Select
                value={data.subjective.homeworkCompliance}
                onValueChange={(value) => updateSubjective('homeworkCompliance', value)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="N/A">N/A</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Partially Completed">Partially Completed</SelectItem>
                  <SelectItem value="Not Completed">Not Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {data.subjective.medicationAdherence !== 'N/A' && (
            <div>
              <Label>Side Effects Details</Label>
              <Textarea
                value={data.subjective.sideEffectDetails || ''}
                onChange={(e) => updateSubjective('sideEffectDetails', e.target.value)}
                placeholder="Any reported medication side effects..."
                rows={2}
                disabled={disabled}
              />
            </div>
          )}

          {data.subjective.homeworkCompliance !== 'N/A' && (
            <div>
              <Label>Homework Review</Label>
              <Textarea
                value={data.subjective.homeworkReview}
                onChange={(e) => updateSubjective('homeworkReview', e.target.value)}
                placeholder="Discussion of homework completion and effectiveness..."
                rows={3}
                disabled={disabled}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Life Context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Life Stressors</Label>
            <Textarea
              value={data.subjective.lifeStressors}
              onChange={(e) => updateSubjective('lifeStressors', e.target.value)}
              placeholder="Current stressors affecting the client..."
              rows={3}
              disabled={disabled}
            />
          </div>

          <div>
            <Label>Coping Strategies</Label>
            <Textarea
              value={data.subjective.copingStrategies}
              onChange={(e) => updateSubjective('copingStrategies', e.target.value)}
              placeholder="How is the client coping? What strategies are they using?"
              rows={3}
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Functional Impairment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Work Impairment</Label>
              <Select
                value={data.subjective.functionalImpairment.work}
                onValueChange={(value) => updateFunctionalImpairment('work', value)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="Mild">Mild</SelectItem>
                  <SelectItem value="Moderate">Moderate</SelectItem>
                  <SelectItem value="Severe">Severe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>School Impairment</Label>
              <Select
                value={data.subjective.functionalImpairment.school}
                onValueChange={(value) => updateFunctionalImpairment('school', value)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="N/A">N/A</SelectItem>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="Mild">Mild</SelectItem>
                  <SelectItem value="Moderate">Moderate</SelectItem>
                  <SelectItem value="Severe">Severe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Relationship Impairment</Label>
              <Select
                value={data.subjective.functionalImpairment.relationships}
                onValueChange={(value) => updateFunctionalImpairment('relationships', value)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="Mild">Mild</SelectItem>
                  <SelectItem value="Moderate">Moderate</SelectItem>
                  <SelectItem value="Severe">Severe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Self-Care Impairment</Label>
              <Select
                value={data.subjective.functionalImpairment.selfCare}
                onValueChange={(value) => updateFunctionalImpairment('selfCare', value)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="Mild">Mild</SelectItem>
                  <SelectItem value="Moderate">Moderate</SelectItem>
                  <SelectItem value="Severe">Severe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Social Impairment</Label>
              <Select
                value={data.subjective.functionalImpairment.social}
                onValueChange={(value) => updateFunctionalImpairment('social', value)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="Mild">Mild</SelectItem>
                  <SelectItem value="Moderate">Moderate</SelectItem>
                  <SelectItem value="Severe">Severe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
