import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X } from 'lucide-react';
import { TreatmentPlanData } from '@/pages/TreatmentPlan';

interface StrengthsBarriersSectionProps {
  data: TreatmentPlanData;
  onChange: (data: TreatmentPlanData) => void;
  disabled?: boolean;
}

export function StrengthsBarriersSection({ data, onChange, disabled }: StrengthsBarriersSectionProps) {
  const addItem = (field: 'clientStrengths' | 'supportSystems' | 'communityResources' | 'barriers') => {
    onChange({
      ...data,
      [field]: [...data[field], ''],
    });
  };

  const removeItem = (field: 'clientStrengths' | 'supportSystems' | 'communityResources' | 'barriers', index: number) => {
    onChange({
      ...data,
      [field]: data[field].filter((_, i) => i !== index),
    });
  };

  const updateItem = (field: 'clientStrengths' | 'supportSystems' | 'communityResources' | 'barriers', index: number, value: string) => {
    const updated = [...data[field]];
    updated[index] = value;
    onChange({
      ...data,
      [field]: updated,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-base font-semibold">Client Strengths</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addItem('clientStrengths')}
            disabled={disabled}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Strength
          </Button>
        </div>
        {data.clientStrengths.map((strength, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <Input
              value={strength}
              onChange={(e) => updateItem('clientStrengths', index, e.target.value)}
              placeholder="e.g., Strong support system, motivated for change..."
              disabled={disabled}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeItem('clientStrengths', index)}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-base font-semibold">Support Systems</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addItem('supportSystems')}
            disabled={disabled}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Support
          </Button>
        </div>
        {data.supportSystems.map((support, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <Input
              value={support}
              onChange={(e) => updateItem('supportSystems', index, e.target.value)}
              placeholder="e.g., Spouse, family members, AA group..."
              disabled={disabled}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeItem('supportSystems', index)}
              disabled={disabled}
            />
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-base font-semibold">Community Resources</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addItem('communityResources')}
            disabled={disabled}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Resource
          </Button>
        </div>
        {data.communityResources.map((resource, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <Input
              value={resource}
              onChange={(e) => updateItem('communityResources', index, e.target.value)}
              placeholder="e.g., Community mental health center, support groups..."
              disabled={disabled}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeItem('communityResources', index)}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center space-x-2 mb-3">
          <Checkbox
            id="barriers-identified"
            checked={data.barriersIdentified}
            onCheckedChange={(checked) => onChange({ ...data, barriersIdentified: Boolean(checked) })}
            disabled={disabled}
          />
          <Label htmlFor="barriers-identified" className="text-base font-semibold cursor-pointer">
            Barriers to Treatment Identified
          </Label>
        </div>

        {data.barriersIdentified && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Barriers</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addItem('barriers')}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Barrier
              </Button>
            </div>
            {data.barriers?.map((barrier, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={barrier}
                  onChange={(e) => updateItem('barriers', index, e.target.value)}
                  placeholder="e.g., Transportation, financial constraints..."
                  disabled={disabled}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem('barriers', index)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <div>
              <Label>Plan to Address Barriers</Label>
              <Textarea
                value={data.planToAddressBarriers || ''}
                onChange={(e) => onChange({ ...data, planToAddressBarriers: e.target.value })}
                placeholder="Describe how identified barriers will be addressed..."
                rows={3}
                disabled={disabled}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
