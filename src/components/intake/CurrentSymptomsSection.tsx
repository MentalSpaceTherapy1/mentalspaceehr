import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface CurrentSymptomsProps {
  data: any;
  onChange: (data: any) => void;
}

const symptoms = [
  'depression', 'anxiety', 'irritability', 'anger', 'mood swings', 'crying spells',
  'hopelessness', 'worthlessness', 'guilt', 'anhedonia', 'socialWithdrawal',
  'insomnia', 'hypersomnia', 'appetiteChange', 'weightChange', 'fatigue',
  'concentrationDifficulty', 'indecisiveness', 'psychomotorAgitation',
  'psychomotorRetardation', 'panic', 'worry', 'obsessions', 'compulsions',
  'flashbacks', 'nightmares', 'hypervigilance', 'avoidance', 'dissociation',
  'hallucinations', 'delusions', 'disorganizedThinking', 'behavioralProblems'
];

export function CurrentSymptomsSection({ data, onChange }: CurrentSymptomsProps) {
  const handleSymptomChange = (symptom: string, field: 'present' | 'severity', value: any) => {
    const updated = {
      ...data,
      [symptom]: {
        ...(data[symptom] || {}),
        [field]: value
      }
    };
    onChange(updated);
  };

  const formatSymptomName = (symptom: string) => {
    return symptom.replace(/([A-Z])/g, ' $1').trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Symptoms</CardTitle>
        <CardDescription>Check all present symptoms and rate severity</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {symptoms.map((symptom) => (
            <div key={symptom} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3 flex-1">
                <Switch
                  checked={data[symptom]?.present || false}
                  onCheckedChange={(checked) => handleSymptomChange(symptom, 'present', checked)}
                />
                <Label className="cursor-pointer flex-1">{formatSymptomName(symptom)}</Label>
              </div>
              {data[symptom]?.present && (
                <Select
                  value={data[symptom]?.severity || 'Mild'}
                  onValueChange={(value) => handleSymptomChange(symptom, 'severity', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mild">Mild</SelectItem>
                    <SelectItem value="Moderate">Moderate</SelectItem>
                    <SelectItem value="Severe">Severe</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
