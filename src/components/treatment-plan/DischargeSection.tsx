import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { TreatmentPlanData } from '@/pages/TreatmentPlan';

interface DischargeSectionProps {
  data: TreatmentPlanData;
  onChange: (data: TreatmentPlanData) => void;
  disabled?: boolean;
}

export function DischargeSection({ data, onChange, disabled }: DischargeSectionProps) {
  const addCriterion = () => {
    onChange({
      ...data,
      dischargeCriteria: [...data.dischargeCriteria, ''],
    });
  };

  const removeCriterion = (index: number) => {
    onChange({
      ...data,
      dischargeCriteria: data.dischargeCriteria.filter((_, i) => i !== index),
    });
  };

  const updateCriterion = (index: number, value: string) => {
    const updated = [...data.dischargeCriteria];
    updated[index] = value;
    onChange({
      ...data,
      dischargeCriteria: updated,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-lg font-semibold">Discharge Criteria</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addCriterion}
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Criterion
        </Button>
      </div>

      {data.dischargeCriteria.map((criterion, index) => (
        <div key={index} className="flex gap-2">
          <Input
            value={criterion}
            onChange={(e) => updateCriterion(index, e.target.value)}
            placeholder="e.g., Client demonstrates consistent use of coping skills..."
            disabled={disabled}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => removeCriterion(index)}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <div>
        <Label>Anticipated Discharge Date (Optional)</Label>
        <Input
          type="date"
          value={data.anticipatedDischargeDate || ''}
          onChange={(e) => onChange({ ...data, anticipatedDischargeDate: e.target.value })}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
