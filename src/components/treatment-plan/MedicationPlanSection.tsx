import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';

interface MedicationPlanSectionProps {
  data: {
    medicationPlan: {
      medicationsRequired: boolean;
      prescribingProvider?: string;
      medications: Array<{
        medicationName: string;
        dosage: string;
        frequency: string;
        indication: string;
      }>;
      monitoringPlan: string;
    };
  };
  onChange: (data: any) => void;
  disabled?: boolean;
}

export function MedicationPlanSection({ data, onChange, disabled }: MedicationPlanSectionProps) {
  const addMedication = () => {
    onChange({
      ...data,
      medicationPlan: {
        ...data.medicationPlan,
        medications: [
          ...data.medicationPlan.medications,
          { medicationName: '', dosage: '', frequency: '', indication: '' }
        ]
      }
    });
  };

  const removeMedication = (index: number) => {
    const newMedications = data.medicationPlan.medications.filter((_, i) => i !== index);
    onChange({
      ...data,
      medicationPlan: {
        ...data.medicationPlan,
        medications: newMedications
      }
    });
  };

  const updateMedication = (index: number, field: string, value: string) => {
    const newMedications = [...data.medicationPlan.medications];
    newMedications[index] = { ...newMedications[index], [field]: value };
    onChange({
      ...data,
      medicationPlan: {
        ...data.medicationPlan,
        medications: newMedications
      }
    });
  };

  const updateMedicationPlan = (field: string, value: any) => {
    onChange({
      ...data,
      medicationPlan: {
        ...data.medicationPlan,
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Medication Plan</h3>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="medications-required"
          checked={data.medicationPlan.medicationsRequired}
          onCheckedChange={(checked) => updateMedicationPlan('medicationsRequired', checked)}
          disabled={disabled}
        />
        <Label htmlFor="medications-required">Medications Required</Label>
      </div>

      {data.medicationPlan.medicationsRequired && (
        <>
          <div>
            <Label htmlFor="prescribing-provider">Prescribing Provider</Label>
            <Input
              id="prescribing-provider"
              value={data.medicationPlan.prescribingProvider || ''}
              onChange={(e) => updateMedicationPlan('prescribingProvider', e.target.value)}
              placeholder="Enter prescribing provider name"
              disabled={disabled}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Medications</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMedication}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Medication
              </Button>
            </div>

            {data.medicationPlan.medications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No medications added yet</p>
            ) : (
              data.medicationPlan.medications.map((medication, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-medium">Medication {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMedication(index)}
                      disabled={disabled}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Medication Name</Label>
                      <Input
                        value={medication.medicationName}
                        onChange={(e) => updateMedication(index, 'medicationName', e.target.value)}
                        placeholder="e.g., Sertraline"
                        disabled={disabled}
                      />
                    </div>

                    <div>
                      <Label>Dosage</Label>
                      <Input
                        value={medication.dosage}
                        onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                        placeholder="e.g., 50mg"
                        disabled={disabled}
                      />
                    </div>

                    <div>
                      <Label>Frequency</Label>
                      <Input
                        value={medication.frequency}
                        onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                        placeholder="e.g., Once daily"
                        disabled={disabled}
                      />
                    </div>

                    <div>
                      <Label>Indication</Label>
                      <Input
                        value={medication.indication}
                        onChange={(e) => updateMedication(index, 'indication', e.target.value)}
                        placeholder="e.g., Depression"
                        disabled={disabled}
                      />
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          <div>
            <Label htmlFor="monitoring-plan">Monitoring Plan</Label>
            <Textarea
              id="monitoring-plan"
              value={data.medicationPlan.monitoringPlan}
              onChange={(e) => updateMedicationPlan('monitoringPlan', e.target.value)}
              placeholder="Describe the medication monitoring plan (e.g., frequency of follow-ups, side effect monitoring, lab work required)"
              rows={4}
              disabled={disabled}
            />
          </div>
        </>
      )}
    </div>
  );
}
