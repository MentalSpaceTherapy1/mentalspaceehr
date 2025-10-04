import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';

interface DiagnosticFormulationProps {
  data: any;
  clinicianImpression: string;
  strengthsAndResources: string[];
  onDiagnosisChange: (data: any) => void;
  onImpressionChange: (impression: string) => void;
  onStrengthsChange: (strengths: string[]) => void;
}

export function DiagnosticFormulationSection({
  data,
  clinicianImpression,
  strengthsAndResources,
  onDiagnosisChange,
  onImpressionChange,
  onStrengthsChange
}: DiagnosticFormulationProps) {
  const [newStrength, setNewStrength] = useState('');

  const addDiagnosis = () => {
    const diagnoses = data.diagnoses || [];
    onDiagnosisChange({
      ...data,
      diagnoses: [...diagnoses, { icdCode: '', diagnosis: '', type: 'Principal', specifiers: '' }]
    });
  };

  const removeDiagnosis = (index: number) => {
    const diagnoses = [...(data.diagnoses || [])];
    diagnoses.splice(index, 1);
    onDiagnosisChange({ ...data, diagnoses });
  };

  const updateDiagnosis = (index: number, field: string, value: string) => {
    const diagnoses = [...(data.diagnoses || [])];
    diagnoses[index] = { ...diagnoses[index], [field]: value };
    onDiagnosisChange({ ...data, diagnoses });
  };

  const addStrength = () => {
    if (newStrength.trim()) {
      onStrengthsChange([...(strengthsAndResources || []), newStrength.trim()]);
      setNewStrength('');
    }
  };

  const removeStrength = (index: number) => {
    const strengths = [...(strengthsAndResources || [])];
    strengths.splice(index, 1);
    onStrengthsChange(strengths);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Clinical Impression</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={clinicianImpression || ''}
            onChange={(e) => onImpressionChange(e.target.value)}
            placeholder="Comprehensive narrative summary integrating all assessment data..."
            rows={6}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Diagnoses</CardTitle>
          <Button onClick={addDiagnosis} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Diagnosis
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {(data.diagnoses || []).map((diagnosis: any, index: number) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <h4 className="font-medium">Diagnosis {index + 1}</h4>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDiagnosis(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>ICD Code</Label>
                  <Input
                    value={diagnosis.icdCode || ''}
                    onChange={(e) => updateDiagnosis(index, 'icdCode', e.target.value)}
                    placeholder="F41.1"
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <select
                    value={diagnosis.type || 'Principal'}
                    onChange={(e) => updateDiagnosis(index, 'type', e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3"
                  >
                    <option value="Principal">Principal</option>
                    <option value="Secondary">Secondary</option>
                    <option value="Rule Out">Rule Out</option>
                    <option value="Provisional">Provisional</option>
                  </select>
                </div>
              </div>
              <div>
                <Label>Diagnosis</Label>
                <Input
                  value={diagnosis.diagnosis || ''}
                  onChange={(e) => updateDiagnosis(index, 'diagnosis', e.target.value)}
                  placeholder="Major Depressive Disorder"
                />
              </div>
              <div>
                <Label>Specifiers</Label>
                <Input
                  value={diagnosis.specifiers || ''}
                  onChange={(e) => updateDiagnosis(index, 'specifiers', e.target.value)}
                  placeholder="Moderate, Recurrent"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Strengths & Resources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newStrength}
              onChange={(e) => setNewStrength(e.target.value)}
              placeholder="Add a strength or resource..."
              onKeyPress={(e) => e.key === 'Enter' && addStrength()}
            />
            <Button onClick={addStrength}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {(strengthsAndResources || []).map((strength, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded">
                <span>{strength}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeStrength(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
