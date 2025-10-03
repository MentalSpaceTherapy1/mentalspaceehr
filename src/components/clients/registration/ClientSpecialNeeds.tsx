import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ClientSpecialNeedsProps {
  formData: any;
  setFormData: (data: any) => void;
}

const ACCESSIBILITY_OPTIONS = [
  'Wheelchair Access',
  'Hearing Assistance',
  'Visual Assistance',
  'Interpreter Services',
  'Sign Language Interpreter',
  'Large Print Materials',
  'Braille Materials',
  'Service Animal Accommodation',
  'Accessible Parking',
  'Elevator Access',
];

export function ClientSpecialNeeds({ formData, setFormData }: ClientSpecialNeedsProps) {
  const toggleAccessibilityNeed = (need: string) => {
    const current = formData.accessibilityNeeds || [];
    const updated = current.includes(need)
      ? current.filter((n: string) => n !== need)
      : [...current, need];
    setFormData({ ...formData, accessibilityNeeds: updated });
  };

  const addAllergyAlert = () => {
    setFormData({
      ...formData,
      allergyAlerts: [...(formData.allergyAlerts || []), '']
    });
  };

  const updateAllergyAlert = (index: number, value: string) => {
    const updated = [...formData.allergyAlerts];
    updated[index] = value;
    setFormData({ ...formData, allergyAlerts: updated });
  };

  const removeAllergyAlert = (index: number) => {
    const updated = formData.allergyAlerts.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, allergyAlerts: updated });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Special Needs</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Document any special considerations or accommodations needed for this client
        </p>
        <Textarea
          value={formData.specialNeeds || ''}
          onChange={(e) => setFormData({ ...formData, specialNeeds: e.target.value })}
          placeholder="Describe any special needs or considerations..."
          rows={4}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Accessibility Needs</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select all accessibility accommodations that apply
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ACCESSIBILITY_OPTIONS.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <Checkbox
                id={option}
                checked={(formData.accessibilityNeeds || []).includes(option)}
                onCheckedChange={() => toggleAccessibilityNeed(option)}
              />
              <Label htmlFor={option} className="cursor-pointer font-normal">
                {option}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2 text-destructive">Allergy Alerts</h3>
        <p className="text-sm text-muted-foreground mb-4">
          <strong>CRITICAL:</strong> Document all known allergies (medications, foods, environmental, etc.)
        </p>
        <div className="space-y-3">
          {(formData.allergyAlerts || []).map((allergy: string, index: number) => (
            <div key={index} className="flex gap-2">
              <Input
                value={allergy}
                onChange={(e) => updateAllergyAlert(index, e.target.value)}
                placeholder="e.g., Penicillin, Peanuts, Latex"
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeAllergyAlert(index)}
                className="text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={addAllergyAlert}
            className="w-full"
          >
            Add Allergy Alert
          </Button>
          {(!formData.allergyAlerts || formData.allergyAlerts.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No known allergies documented
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
