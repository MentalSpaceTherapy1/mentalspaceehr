import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import { useState } from 'react';

interface BillingSectionProps {
  data: any;
  onChange: (data: any) => void;
  disabled?: boolean;
}

export function BillingSection({ data, onChange, disabled }: BillingSectionProps) {
  const [newDiagnosisCode, setNewDiagnosisCode] = useState('');
  const [newModifier, setNewModifier] = useState('');

  const updateBilling = (field: string, value: any) => {
    onChange({
      ...data,
      billing: {
        ...data.billing,
        [field]: value,
      },
    });
  };

  const addDiagnosisCode = () => {
    if (!newDiagnosisCode.trim()) return;
    const current = data.billing.diagnosisCodes || [];
    updateBilling('diagnosisCodes', [...current, newDiagnosisCode.trim()]);
    setNewDiagnosisCode('');
  };

  const removeDiagnosisCode = (index: number) => {
    const current = data.billing.diagnosisCodes || [];
    updateBilling('diagnosisCodes', current.filter((_: any, i: number) => i !== index));
  };

  const addModifier = () => {
    if (!newModifier.trim()) return;
    const current = data.billing.modifiers || [];
    updateBilling('modifiers', [...current, newModifier.trim()]);
    setNewModifier('');
  };

  const removeModifier = (index: number) => {
    const current = data.billing.modifiers || [];
    updateBilling('modifiers', current.filter((_: any, i: number) => i !== index));
  };

  // Common CPT codes for mental health
  const commonCPTCodes = [
    { code: '90791', description: 'Psychiatric diagnostic evaluation' },
    { code: '90792', description: 'Psychiatric diagnostic evaluation with medical services' },
    { code: '90832', description: 'Psychotherapy, 30 minutes' },
    { code: '90834', description: 'Psychotherapy, 45 minutes' },
    { code: '90837', description: 'Psychotherapy, 60 minutes' },
    { code: '90846', description: 'Family psychotherapy without patient' },
    { code: '90847', description: 'Family psychotherapy with patient' },
    { code: '90853', description: 'Group psychotherapy' },
    { code: '99214', description: 'Office visit, established patient, moderate' },
    { code: '99215', description: 'Office visit, established patient, high complexity' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>CPT Code & Modifiers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>CPT Code *</Label>
            <Select
              value={data.billing.cptCode}
              onValueChange={(value) => updateBilling('cptCode', value)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select CPT code" />
              </SelectTrigger>
              <SelectContent>
                {commonCPTCodes.map((cpt) => (
                  <SelectItem key={cpt.code} value={cpt.code}>
                    {cpt.code} - {cpt.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Add Modifier (Optional)</Label>
            <div className="flex gap-2">
              <Input
                value={newModifier}
                onChange={(e) => setNewModifier(e.target.value)}
                placeholder="e.g., 95 (Telehealth), HK (Specialized services)"
                disabled={disabled}
                maxLength={2}
              />
              <Button type="button" onClick={addModifier} disabled={disabled}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {data.billing.modifiers && data.billing.modifiers.length > 0 && (
            <div>
              <Label>Modifiers</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {data.billing.modifiers.map((modifier: string, index: number) => (
                  <Badge key={index} variant="secondary">
                    {modifier}
                    {!disabled && (
                      <X
                        className="h-3 w-3 ml-1 cursor-pointer"
                        onClick={() => removeModifier(index)}
                      />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Place of Service *</Label>
              <Select
                value={data.billing.placeOfService}
                onValueChange={(value) => updateBilling('placeOfService', value)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="02">02 - Telehealth</SelectItem>
                  <SelectItem value="11">11 - Office</SelectItem>
                  <SelectItem value="12">12 - Home</SelectItem>
                  <SelectItem value="22">22 - Outpatient Hospital</SelectItem>
                  <SelectItem value="53">53 - Community Mental Health Center</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Units</Label>
              <Input
                type="number"
                value={data.billing.units || 1}
                onChange={(e) => updateBilling('units', parseInt(e.target.value))}
                min={1}
                disabled={disabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Diagnosis Codes (ICD-10)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Add Diagnosis Code *</Label>
            <div className="flex gap-2">
              <Input
                value={newDiagnosisCode}
                onChange={(e) => setNewDiagnosisCode(e.target.value)}
                placeholder="e.g., F41.1, F33.1, F43.10"
                disabled={disabled}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addDiagnosisCode();
                  }
                }}
              />
              <Button type="button" onClick={addDiagnosisCode} disabled={disabled}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              List primary diagnosis first, then additional diagnoses
            </p>
          </div>

          <div>
            <Label>Diagnosis Codes</Label>
            <div className="space-y-2 mt-2">
              {data.billing.diagnosisCodes?.length === 0 && (
                <p className="text-sm text-muted-foreground">No diagnosis codes added yet</p>
              )}
              {data.billing.diagnosisCodes?.map((code: string, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <Badge variant={index === 0 ? 'default' : 'secondary'}>
                      {index === 0 ? 'Primary' : `Secondary ${index}`}
                    </Badge>
                    <span className="font-medium">{code}</span>
                  </div>
                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDiagnosisCode(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service Code:</span>
              <span className="font-medium">{data.billing.cptCode || 'Not selected'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Place of Service:</span>
              <span className="font-medium">{data.billing.placeOfService || 'Not selected'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Units:</span>
              <span className="font-medium">{data.billing.units || 1}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Primary Diagnosis:</span>
              <span className="font-medium">
                {data.billing.diagnosisCodes?.[0] || 'Not added'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Additional Diagnoses:</span>
              <span className="font-medium">
                {data.billing.diagnosisCodes?.length > 1
                  ? data.billing.diagnosisCodes.length - 1
                  : 0}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
