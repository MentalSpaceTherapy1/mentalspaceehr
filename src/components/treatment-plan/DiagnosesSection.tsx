import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import { TreatmentPlanData } from '@/pages/TreatmentPlan';

interface DiagnosesSectionProps {
  data: TreatmentPlanData;
  onChange: (data: TreatmentPlanData) => void;
  disabled?: boolean;
}

export function DiagnosesSection({ data, onChange, disabled }: DiagnosesSectionProps) {
  const addDiagnosis = () => {
    const newDiagnosis = {
      icdCode: '',
      diagnosis: '',
      severity: 'Moderate' as const,
      type: data.diagnoses.length === 0 ? 'Principal' as const : 'Secondary' as const,
    };
    onChange({
      ...data,
      diagnoses: [...data.diagnoses, newDiagnosis],
    });
  };

  const removeDiagnosis = (index: number) => {
    const updatedDiagnoses = data.diagnoses.filter((_, i) => i !== index);
    onChange({
      ...data,
      diagnoses: updatedDiagnoses,
    });
  };

  const updateDiagnosis = (index: number, field: string, value: any) => {
    const updatedDiagnoses = [...data.diagnoses];
    updatedDiagnoses[index] = { ...updatedDiagnoses[index], [field]: value };
    onChange({
      ...data,
      diagnoses: updatedDiagnoses,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-lg font-semibold">Diagnoses</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addDiagnosis}
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Diagnosis
        </Button>
      </div>

      {data.diagnoses.length === 0 && (
        <p className="text-sm text-muted-foreground">No diagnoses added yet</p>
      )}

      {data.diagnoses.map((diagnosis, index) => (
        <Card key={index}>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <Badge variant={diagnosis.type === 'Principal' ? 'default' : 'secondary'}>
                  {diagnosis.type}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeDiagnosis(index)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ICD-10 Code *</Label>
                  <Input
                    value={diagnosis.icdCode}
                    onChange={(e) => updateDiagnosis(index, 'icdCode', e.target.value)}
                    placeholder="F41.1"
                    disabled={disabled}
                  />
                </div>

                <div>
                  <Label>Severity</Label>
                  <Select
                    value={diagnosis.severity}
                    onValueChange={(value) => updateDiagnosis(index, 'severity', value)}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mild">Mild</SelectItem>
                      <SelectItem value="Moderate">Moderate</SelectItem>
                      <SelectItem value="Severe">Severe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Diagnosis Description *</Label>
                <Input
                  value={diagnosis.diagnosis}
                  onChange={(e) => updateDiagnosis(index, 'diagnosis', e.target.value)}
                  placeholder="Generalized Anxiety Disorder"
                  disabled={disabled}
                />
              </div>

              <div>
                <Label>Specifiers</Label>
                <Input
                  value={diagnosis.specifiers || ''}
                  onChange={(e) => updateDiagnosis(index, 'specifiers', e.target.value)}
                  placeholder="With panic attacks"
                  disabled={disabled}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
