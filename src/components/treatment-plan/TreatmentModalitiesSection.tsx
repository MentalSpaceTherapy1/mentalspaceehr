import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import { TreatmentPlanData } from '@/pages/TreatmentPlan';

interface TreatmentModalitiesSectionProps {
  data: TreatmentPlanData;
  onChange: (data: TreatmentPlanData) => void;
  disabled?: boolean;
}

export function TreatmentModalitiesSection({ data, onChange, disabled }: TreatmentModalitiesSectionProps) {
  const therapeuticApproaches = [
    'CBT',
    'DBT',
    'EMDR',
    'Psychodynamic',
    'Humanistic',
    'Solution-Focused',
    'Narrative Therapy',
    'Mindfulness-Based',
    'Trauma-Focused',
    'Family Systems',
  ];

  const toggleApproach = (approach: string) => {
    const current = data.treatmentModalities.therapeuticApproaches || [];
    const updated = current.includes(approach)
      ? current.filter(a => a !== approach)
      : [...current, approach];
    
    onChange({
      ...data,
      treatmentModalities: {
        ...data.treatmentModalities,
        therapeuticApproaches: updated,
      },
    });
  };

  const addAdjunctService = () => {
    const newService = { service: '', provider: '', frequency: '' };
    onChange({
      ...data,
      treatmentModalities: {
        ...data.treatmentModalities,
        adjunctServices: [...(data.treatmentModalities.adjunctServices || []), newService],
      },
    });
  };

  const removeAdjunctService = (index: number) => {
    const updated = data.treatmentModalities.adjunctServices.filter((_, i) => i !== index);
    onChange({
      ...data,
      treatmentModalities: {
        ...data.treatmentModalities,
        adjunctServices: updated,
      },
    });
  };

  const updateAdjunctService = (index: number, field: string, value: string) => {
    const updated = data.treatmentModalities.adjunctServices.map((service, i) =>
      i === index ? { ...service, [field]: value } : service
    );
    onChange({
      ...data,
      treatmentModalities: {
        ...data.treatmentModalities,
        adjunctServices: updated,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-lg font-semibold mb-4 block">Treatment Modalities</Label>
        
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Primary Modality</Label>
              <Select
                value={data.treatmentModalities.primaryModality}
                onValueChange={(value: any) =>
                  onChange({
                    ...data,
                    treatmentModalities: { ...data.treatmentModalities, primaryModality: value },
                  })
                }
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Individual Therapy">Individual Therapy</SelectItem>
                  <SelectItem value="Couples Therapy">Couples Therapy</SelectItem>
                  <SelectItem value="Family Therapy">Family Therapy</SelectItem>
                  <SelectItem value="Group Therapy">Group Therapy</SelectItem>
                  <SelectItem value="Combined">Combined</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Frequency</Label>
              <Input
                value={data.treatmentModalities.frequency}
                onChange={(e) =>
                  onChange({
                    ...data,
                    treatmentModalities: { ...data.treatmentModalities, frequency: e.target.value },
                  })
                }
                placeholder="Weekly, Biweekly, etc."
                disabled={disabled}
              />
            </div>

            <div>
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={data.treatmentModalities.duration}
                onChange={(e) =>
                  onChange({
                    ...data,
                    treatmentModalities: { ...data.treatmentModalities, duration: parseInt(e.target.value) },
                  })
                }
                disabled={disabled}
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Therapeutic Approaches</Label>
            <div className="flex flex-wrap gap-2">
              {therapeuticApproaches.map((approach) => (
                <Badge
                  key={approach}
                  variant={
                    data.treatmentModalities.therapeuticApproaches?.includes(approach)
                      ? 'default'
                      : 'outline'
                  }
                  className="cursor-pointer"
                  onClick={() => !disabled && toggleApproach(approach)}
                >
                  {approach}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Adjunct Services</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAdjunctService}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Service
              </Button>
            </div>

            {data.treatmentModalities.adjunctServices?.map((service, index) => (
              <div key={index} className="grid grid-cols-4 gap-3 mb-3">
                <Input
                  value={service.service}
                  onChange={(e) => updateAdjunctService(index, 'service', e.target.value)}
                  placeholder="Service type"
                  disabled={disabled}
                />
                <Input
                  value={service.provider || ''}
                  onChange={(e) => updateAdjunctService(index, 'provider', e.target.value)}
                  placeholder="Provider"
                  disabled={disabled}
                />
                <Input
                  value={service.frequency || ''}
                  onChange={(e) => updateAdjunctService(index, 'frequency', e.target.value)}
                  placeholder="Frequency"
                  disabled={disabled}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAdjunctService(index)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
