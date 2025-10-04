import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import { useState } from 'react';

interface PlanSectionProps {
  data: any;
  onChange: (data: any) => void;
  disabled?: boolean;
}

export function PlanSection({ data, onChange, disabled }: PlanSectionProps) {
  const [newIntervention, setNewIntervention] = useState('');
  const [newTechnique, setNewTechnique] = useState('');

  const updatePlan = (field: string, value: any) => {
    onChange({
      ...data,
      plan: {
        ...data.plan,
        [field]: value,
      },
    });
  };

  const updateHomework = (field: string, value: any) => {
    onChange({
      ...data,
      plan: {
        ...data.plan,
        homework: {
          ...data.plan.homework,
          [field]: value,
        },
      },
    });
  };

  const updateMedicationChanges = (field: string, value: any) => {
    onChange({
      ...data,
      plan: {
        ...data.plan,
        medicationChanges: {
          ...data.plan.medicationChanges,
          [field]: value,
        },
      },
    });
  };

  const updateReferrals = (field: string, value: any) => {
    onChange({
      ...data,
      plan: {
        ...data.plan,
        referrals: {
          ...data.plan.referrals,
          [field]: value,
        },
      },
    });
  };

  const updateNextAppointment = (field: string, value: any) => {
    onChange({
      ...data,
      plan: {
        ...data.plan,
        nextAppointment: {
          ...data.plan.nextAppointment,
          [field]: value,
        },
      },
    });
  };

  const addItem = (category: 'interventionsProvided' | 'therapeuticTechniques', value: string) => {
    if (!value.trim()) return;
    const current = data.plan[category] || [];
    updatePlan(category, [...current, value.trim()]);
    if (category === 'interventionsProvided') setNewIntervention('');
    else setNewTechnique('');
  };

  const removeItem = (category: string, index: number) => {
    const current = data.plan[category] || [];
    updatePlan(category, current.filter((_: any, i: number) => i !== index));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Interventions Provided</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Add Intervention</Label>
            <div className="flex gap-2">
              <Input
                value={newIntervention}
                onChange={(e) => setNewIntervention(e.target.value)}
                placeholder="CBT, DBT skills training, supportive counseling..."
                disabled={disabled}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addItem('interventionsProvided', newIntervention);
                  }
                }}
              />
              <Button
                type="button"
                onClick={() => addItem('interventionsProvided', newIntervention)}
                disabled={disabled}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {data.plan.interventionsProvided?.map((intervention: string, index: number) => (
              <Badge key={index} variant="secondary">
                {intervention}
                {!disabled && (
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => removeItem('interventionsProvided', index)}
                  />
                )}
              </Badge>
            ))}
          </div>

          <div>
            <Label>Intervention Details *</Label>
            <Textarea
              value={data.plan.interventionDetails}
              onChange={(e) => updatePlan('interventionDetails', e.target.value)}
              placeholder="Detailed description of what was done in session, specific techniques used..."
              rows={5}
              disabled={disabled}
            />
          </div>

          <div>
            <Label>Add Therapeutic Technique</Label>
            <div className="flex gap-2">
              <Input
                value={newTechnique}
                onChange={(e) => setNewTechnique(e.target.value)}
                placeholder="Cognitive restructuring, mindfulness, exposure..."
                disabled={disabled}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addItem('therapeuticTechniques', newTechnique);
                  }
                }}
              />
              <Button
                type="button"
                onClick={() => addItem('therapeuticTechniques', newTechnique)}
                disabled={disabled}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {data.plan.therapeuticTechniques?.map((technique: string, index: number) => (
              <Badge key={index} variant="outline">
                {technique}
                {!disabled && (
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => removeItem('therapeuticTechniques', index)}
                  />
                )}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Homework & Next Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="homework-assigned"
              checked={data.plan.homework.assigned}
              onCheckedChange={(checked) => updateHomework('assigned', checked)}
              disabled={disabled}
            />
            <Label htmlFor="homework-assigned" className="cursor-pointer">
              Homework Assigned
            </Label>
          </div>

          {data.plan.homework.assigned && (
            <div>
              <Label>Homework Details *</Label>
              <Textarea
                value={data.plan.homework.homeworkDetails || ''}
                onChange={(e) => updateHomework('homeworkDetails', e.target.value)}
                placeholder="Specific homework assignments, practice exercises, readings..."
                rows={4}
                disabled={disabled}
              />
            </div>
          )}

          <div>
            <Label>Next Steps</Label>
            <Textarea
              value={data.plan.nextSteps}
              onChange={(e) => updatePlan('nextSteps', e.target.value)}
              placeholder="What will be addressed in the next session? Ongoing focus areas..."
              rows={3}
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Medication Changes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="medication-changes"
              checked={data.plan.medicationChanges.changesMade}
              onCheckedChange={(checked) => updateMedicationChanges('changesMade', checked)}
              disabled={disabled}
            />
            <Label htmlFor="medication-changes" className="cursor-pointer">
              Medication Changes Made
            </Label>
          </div>

          {data.plan.medicationChanges.changesMade && (
            <div>
              <Label>Change Details *</Label>
              <Textarea
                value={data.plan.medicationChanges.changeDetails || ''}
                onChange={(e) => updateMedicationChanges('changeDetails', e.target.value)}
                placeholder="Describe medication changes, rationale, and patient education provided..."
                rows={4}
                disabled={disabled}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Referrals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="referral-made"
              checked={data.plan.referrals.referralMade}
              onCheckedChange={(checked) => updateReferrals('referralMade', checked)}
              disabled={disabled}
            />
            <Label htmlFor="referral-made" className="cursor-pointer">
              Referral Made
            </Label>
          </div>

          {data.plan.referrals.referralMade && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Referral To *</Label>
                  <Input
                    value={data.plan.referrals.referralTo || ''}
                    onChange={(e) => updateReferrals('referralTo', e.target.value)}
                    placeholder="Provider name, specialty..."
                    disabled={disabled}
                  />
                </div>

                <div>
                  <Label>Referral Reason *</Label>
                  <Input
                    value={data.plan.referrals.referralReason || ''}
                    onChange={(e) => updateReferrals('referralReason', e.target.value)}
                    placeholder="Psychiatric eval, medical consultation..."
                    disabled={disabled}
                  />
                </div>
              </div>

              <div>
                <Label>Referral Details</Label>
                <Textarea
                  value={data.plan.referrals.referralDetails || ''}
                  onChange={(e) => updateReferrals('referralDetails', e.target.value)}
                  placeholder="Additional details about the referral..."
                  rows={3}
                  disabled={disabled}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Next Appointment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="appointment-scheduled"
              checked={data.plan.nextAppointment.scheduled}
              onCheckedChange={(checked) => updateNextAppointment('scheduled', checked)}
              disabled={disabled}
            />
            <Label htmlFor="appointment-scheduled" className="cursor-pointer">
              Next Appointment Scheduled
            </Label>
          </div>

          {data.plan.nextAppointment.scheduled && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={data.plan.nextAppointment.appointmentDate || ''}
                  onChange={(e) => updateNextAppointment('appointmentDate', e.target.value)}
                  disabled={disabled}
                />
              </div>

              <div>
                <Label>Type *</Label>
                <Select
                  value={data.plan.nextAppointment.appointmentType || ''}
                  onValueChange={(value) => updateNextAppointment('appointmentType', value)}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Individual Therapy">Individual Therapy</SelectItem>
                    <SelectItem value="Family Therapy">Family Therapy</SelectItem>
                    <SelectItem value="Medication Management">Medication Management</SelectItem>
                    <SelectItem value="Follow-up">Follow-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Frequency</Label>
                <Select
                  value={data.plan.nextAppointment.frequency || ''}
                  onValueChange={(value) => updateNextAppointment('frequency', value)}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Biweekly">Biweekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="As Needed">As Needed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Planning</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label>Additional Notes</Label>
            <Textarea
              value={data.plan.additionalPlanning}
              onChange={(e) => updatePlan('additionalPlanning', e.target.value)}
              placeholder="Any other relevant planning information..."
              rows={4}
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
