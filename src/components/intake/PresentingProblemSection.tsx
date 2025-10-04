import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { AISectionWrapper } from './AISectionWrapper';

interface PresentingProblemProps {
  data: any;
  onChange: (data: any) => void;
  clientId?: string;
  fullContext?: any;
  disabled?: boolean;
}

export function PresentingProblemSection({ data, onChange, clientId, fullContext, disabled }: PresentingProblemProps) {
  const handleChange = (field: string, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const addExacerbatingFactor = () => {
    const factors = data.exacerbatingFactors || [];
    onChange({ ...data, exacerbatingFactors: [...factors, ''] });
  };

  const removeExacerbatingFactor = (index: number) => {
    const factors = [...(data.exacerbatingFactors || [])];
    factors.splice(index, 1);
    onChange({ ...data, exacerbatingFactors: factors });
  };

  const updateExacerbatingFactor = (index: number, value: string) => {
    const factors = [...(data.exacerbatingFactors || [])];
    factors[index] = value;
    onChange({ ...data, exacerbatingFactors: factors });
  };

  const addAlleviatingFactor = () => {
    const factors = data.alleviatingFactors || [];
    onChange({ ...data, alleviatingFactors: [...factors, ''] });
  };

  const removeAlleviatingFactor = (index: number) => {
    const factors = [...(data.alleviatingFactors || [])];
    factors.splice(index, 1);
    onChange({ ...data, alleviatingFactors: factors });
  };

  const updateAlleviatingFactor = (index: number, value: string) => {
    const factors = [...(data.alleviatingFactors || [])];
    factors[index] = value;
    onChange({ ...data, alleviatingFactors: factors });
  };

  const addTherapist = () => {
    const history = data.previousTreatmentAttempts?.therapyHistory || { hadPreviousTherapy: false, therapists: [] };
    onChange({
      ...data,
      previousTreatmentAttempts: {
        ...data.previousTreatmentAttempts,
        therapyHistory: {
          ...history,
          therapists: [...history.therapists, { type: '', duration: '', dates: '', outcome: 'Unknown', reasonForEnding: '' }]
        }
      }
    });
  };

  const removeTherapist = (index: number) => {
    const history = data.previousTreatmentAttempts?.therapyHistory || { hadPreviousTherapy: false, therapists: [] };
    const therapists = [...history.therapists];
    therapists.splice(index, 1);
    onChange({
      ...data,
      previousTreatmentAttempts: {
        ...data.previousTreatmentAttempts,
        therapyHistory: { ...history, therapists }
      }
    });
  };

  const updateTherapist = (index: number, field: string, value: any) => {
    const history = data.previousTreatmentAttempts?.therapyHistory || { hadPreviousTherapy: false, therapists: [] };
    const therapists = [...history.therapists];
    therapists[index] = { ...therapists[index], [field]: value };
    onChange({
      ...data,
      previousTreatmentAttempts: {
        ...data.previousTreatmentAttempts,
        therapyHistory: { ...history, therapists }
      }
    });
  };

  const addMedication = () => {
    const history = data.previousTreatmentAttempts?.medicationHistory || { currentlyOnMedication: false, previousMedications: false, medications: [] };
    onChange({
      ...data,
      previousTreatmentAttempts: {
        ...data.previousTreatmentAttempts,
        medicationHistory: {
          ...history,
          medications: [...history.medications, { medicationName: '', dosage: '', startDate: '', prescribedBy: '', effectiveness: 'Unknown' }]
        }
      }
    });
  };

  const removeMedication = (index: number) => {
    const history = data.previousTreatmentAttempts?.medicationHistory || { currentlyOnMedication: false, previousMedications: false, medications: [] };
    const medications = [...history.medications];
    medications.splice(index, 1);
    onChange({
      ...data,
      previousTreatmentAttempts: {
        ...data.previousTreatmentAttempts,
        medicationHistory: { ...history, medications }
      }
    });
  };

  const updateMedication = (index: number, field: string, value: any) => {
    const history = data.previousTreatmentAttempts?.medicationHistory || { currentlyOnMedication: false, previousMedications: false, medications: [] };
    const medications = [...history.medications];
    medications[index] = { ...medications[index], [field]: value };
    onChange({
      ...data,
      previousTreatmentAttempts: {
        ...data.previousTreatmentAttempts,
        medicationHistory: { ...history, medications }
      }
    });
  };

  const addHospitalization = () => {
    const history = data.previousTreatmentAttempts?.hospitalizationHistory || { hasBeenHospitalized: false, hospitalizations: [] };
    onChange({
      ...data,
      previousTreatmentAttempts: {
        ...data.previousTreatmentAttempts,
        hospitalizationHistory: {
          ...history,
          hospitalizations: [...history.hospitalizations, { facility: '', dates: '', reason: '', wasVoluntary: true, outcome: '' }]
        }
      }
    });
  };

  const removeHospitalization = (index: number) => {
    const history = data.previousTreatmentAttempts?.hospitalizationHistory || { hasBeenHospitalized: false, hospitalizations: [] };
    const hospitalizations = [...history.hospitalizations];
    hospitalizations.splice(index, 1);
    onChange({
      ...data,
      previousTreatmentAttempts: {
        ...data.previousTreatmentAttempts,
        hospitalizationHistory: { ...history, hospitalizations }
      }
    });
  };

  const updateHospitalization = (index: number, field: string, value: any) => {
    const history = data.previousTreatmentAttempts?.hospitalizationHistory || { hasBeenHospitalized: false, hospitalizations: [] };
    const hospitalizations = [...history.hospitalizations];
    hospitalizations[index] = { ...hospitalizations[index], [field]: value };
    onChange({
      ...data,
      previousTreatmentAttempts: {
        ...data.previousTreatmentAttempts,
        hospitalizationHistory: { ...history, hospitalizations }
      }
    });
  };

  return (
    <AISectionWrapper
      sectionType="presenting"
      clientId={clientId}
      context={JSON.stringify(fullContext || {})}
      existingData={data}
      onAccept={(aiContent) => onChange({ ...data, ...aiContent })}
      renderSuggestion={(aiContent, isEditing, onEdit) => (
        <div className="space-y-2 text-sm">
          {isEditing ? (
            <div className="space-y-2">
              <Textarea 
                value={aiContent.chiefComplaint}
                onChange={(e) => onEdit({ ...aiContent, chiefComplaint: e.target.value })}
                placeholder="Chief Complaint"
                rows={2}
              />
              <Textarea 
                value={aiContent.historyOfPresentingProblem}
                onChange={(e) => onEdit({ ...aiContent, historyOfPresentingProblem: e.target.value })}
                placeholder="History"
                rows={4}
              />
            </div>
          ) : (
            <div>
              <p><strong>Chief Complaint:</strong> {aiContent.chiefComplaint}</p>
              <p className="mt-2"><strong>History:</strong> {aiContent.historyOfPresentingProblem}</p>
              {aiContent.symptomOnset && <p className="mt-1"><strong>Onset:</strong> {aiContent.symptomOnset}</p>}
              {aiContent.symptomDuration && <p className="mt-1"><strong>Duration:</strong> {aiContent.symptomDuration}</p>}
            </div>
          )}
        </div>
      )}
    >
      <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Chief Complaint</CardTitle>
          <CardDescription>Client's primary reason for seeking services</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.chiefComplaint || ''}
            onChange={(e) => handleChange('chiefComplaint', e.target.value)}
            placeholder="Client's stated reason for seeking treatment..."
            rows={3}
            disabled={disabled}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History of Presenting Problem</CardTitle>
          <CardDescription>Detailed narrative of symptom development and progression</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Detailed History</Label>
            <Textarea
              value={data.historyOfPresentingProblem || ''}
              onChange={(e) => handleChange('historyOfPresentingProblem', e.target.value)}
              placeholder="Include onset, duration, severity, precipitating factors, exacerbating and alleviating factors..."
              rows={8}
              disabled={disabled}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Symptom Onset</Label>
              <Input
                value={data.symptomOnset || ''}
                onChange={(e) => handleChange('symptomOnset', e.target.value)}
                placeholder="When did symptoms start? (e.g., 6 months ago, March 2024)"
              />
            </div>
            <div>
              <Label>Symptom Duration</Label>
              <Input
                value={data.symptomDuration || ''}
                onChange={(e) => handleChange('symptomDuration', e.target.value)}
                placeholder="How long have symptoms persisted?"
              />
            </div>
          </div>

          <div>
            <Label>Precipitating Factors</Label>
            <Textarea
              value={data.precipitatingFactors || ''}
              onChange={(e) => handleChange('precipitatingFactors', e.target.value)}
              placeholder="What events or circumstances triggered the symptoms?"
              rows={3}
            />
          </div>

          <div>
            <Label>Exacerbating Factors</Label>
            <p className="text-sm text-muted-foreground mb-2">What makes symptoms worse?</p>
            {(data.exacerbatingFactors || []).map((factor, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  value={factor}
                  onChange={(e) => updateExacerbatingFactor(index, e.target.value)}
                  placeholder="Factor that worsens symptoms"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeExacerbatingFactor(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addExacerbatingFactor}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Exacerbating Factor
            </Button>
          </div>

          <div>
            <Label>Alleviating Factors</Label>
            <p className="text-sm text-muted-foreground mb-2">What helps reduce symptoms?</p>
            {(data.alleviatingFactors || []).map((factor, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  value={factor}
                  onChange={(e) => updateAlleviatingFactor(index, e.target.value)}
                  placeholder="Factor that improves symptoms"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAlleviatingFactor(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addAlleviatingFactor}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Alleviating Factor
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Previous Treatment Attempts</CardTitle>
          <CardDescription>History of prior therapy, medications, and hospitalizations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Therapy History */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hadPreviousTherapy"
                checked={data.previousTreatmentAttempts?.therapyHistory?.hadPreviousTherapy || false}
                onCheckedChange={(checked) => 
                  onChange({
                    ...data,
                    previousTreatmentAttempts: {
                      ...data.previousTreatmentAttempts,
                      therapyHistory: {
                        ...(data.previousTreatmentAttempts?.therapyHistory || { therapists: [] }),
                        hadPreviousTherapy: checked as boolean
                      }
                    }
                  })
                }
              />
              <Label htmlFor="hadPreviousTherapy" className="font-semibold">Previous Therapy History</Label>
            </div>

            {data.previousTreatmentAttempts?.therapyHistory?.hadPreviousTherapy && (
              <div className="ml-6 space-y-4">
                {(data.previousTreatmentAttempts?.therapyHistory?.therapists || []).map((therapist, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">Therapist {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTherapist(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Therapist Name (Optional)</Label>
                          <Input
                            value={therapist.therapistName || ''}
                            onChange={(e) => updateTherapist(index, 'therapistName', e.target.value)}
                            placeholder="Therapist name"
                          />
                        </div>
                        <div>
                          <Label>Type of Therapy</Label>
                          <Input
                            value={therapist.type}
                            onChange={(e) => updateTherapist(index, 'type', e.target.value)}
                            placeholder="CBT, DBT, Psychodynamic, etc."
                          />
                        </div>
                        <div>
                          <Label>Duration</Label>
                          <Input
                            value={therapist.duration}
                            onChange={(e) => updateTherapist(index, 'duration', e.target.value)}
                            placeholder="e.g., 6 months, 1 year"
                          />
                        </div>
                        <div>
                          <Label>Dates</Label>
                          <Input
                            value={therapist.dates}
                            onChange={(e) => updateTherapist(index, 'dates', e.target.value)}
                            placeholder="e.g., Jan 2023 - Jun 2023"
                          />
                        </div>
                        <div>
                          <Label>Outcome</Label>
                          <Select
                            value={therapist.outcome}
                            onValueChange={(value) => updateTherapist(index, 'outcome', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Helpful">Helpful</SelectItem>
                              <SelectItem value="Somewhat Helpful">Somewhat Helpful</SelectItem>
                              <SelectItem value="Not Helpful">Not Helpful</SelectItem>
                              <SelectItem value="Unknown">Unknown</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Reason for Ending</Label>
                          <Input
                            value={therapist.reasonForEnding}
                            onChange={(e) => updateTherapist(index, 'reasonForEnding', e.target.value)}
                            placeholder="Why therapy ended"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTherapist}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Therapist
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Medication History */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="currentlyOnMedication"
                  checked={data.previousTreatmentAttempts?.medicationHistory?.currentlyOnMedication || false}
                  onCheckedChange={(checked) => 
                    onChange({
                      ...data,
                      previousTreatmentAttempts: {
                        ...data.previousTreatmentAttempts,
                        medicationHistory: {
                          ...(data.previousTreatmentAttempts?.medicationHistory || { medications: [] }),
                          currentlyOnMedication: checked as boolean
                        }
                      }
                    })
                  }
                />
                <Label htmlFor="currentlyOnMedication">Currently on Psychiatric Medication</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="previousMedications"
                  checked={data.previousTreatmentAttempts?.medicationHistory?.previousMedications || false}
                  onCheckedChange={(checked) => 
                    onChange({
                      ...data,
                      previousTreatmentAttempts: {
                        ...data.previousTreatmentAttempts,
                        medicationHistory: {
                          ...(data.previousTreatmentAttempts?.medicationHistory || { medications: [] }),
                          previousMedications: checked as boolean
                        }
                      }
                    })
                  }
                />
                <Label htmlFor="previousMedications" className="font-semibold">Previous Psychiatric Medications</Label>
              </div>
            </div>

            {(data.previousTreatmentAttempts?.medicationHistory?.currentlyOnMedication || 
              data.previousTreatmentAttempts?.medicationHistory?.previousMedications) && (
              <div className="ml-6 space-y-4">
                {(data.previousTreatmentAttempts?.medicationHistory?.medications || []).map((medication, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">Medication {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMedication(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Medication Name</Label>
                          <Input
                            value={medication.medicationName}
                            onChange={(e) => updateMedication(index, 'medicationName', e.target.value)}
                            placeholder="Medication name"
                          />
                        </div>
                        <div>
                          <Label>Dosage</Label>
                          <Input
                            value={medication.dosage}
                            onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                            placeholder="e.g., 50mg"
                          />
                        </div>
                        <div>
                          <Label>Start Date</Label>
                          <Input
                            value={medication.startDate}
                            onChange={(e) => updateMedication(index, 'startDate', e.target.value)}
                            placeholder="e.g., Jan 2024"
                          />
                        </div>
                        <div>
                          <Label>End Date (if applicable)</Label>
                          <Input
                            value={medication.endDate || ''}
                            onChange={(e) => updateMedication(index, 'endDate', e.target.value)}
                            placeholder="Leave blank if current"
                          />
                        </div>
                        <div>
                          <Label>Prescribed By</Label>
                          <Input
                            value={medication.prescribedBy}
                            onChange={(e) => updateMedication(index, 'prescribedBy', e.target.value)}
                            placeholder="Prescriber name"
                          />
                        </div>
                        <div>
                          <Label>Effectiveness</Label>
                          <Select
                            value={medication.effectiveness}
                            onValueChange={(value) => updateMedication(index, 'effectiveness', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Very Effective">Very Effective</SelectItem>
                              <SelectItem value="Somewhat Effective">Somewhat Effective</SelectItem>
                              <SelectItem value="Not Effective">Not Effective</SelectItem>
                              <SelectItem value="Unknown">Unknown</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2">
                          <Label>Side Effects (if any)</Label>
                          <Textarea
                            value={medication.sideEffects || ''}
                            onChange={(e) => updateMedication(index, 'sideEffects', e.target.value)}
                            placeholder="Describe any side effects"
                            rows={2}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Reason for Discontinuation (if applicable)</Label>
                          <Textarea
                            value={medication.reasonForDiscontinuation || ''}
                            onChange={(e) => updateMedication(index, 'reasonForDiscontinuation', e.target.value)}
                            placeholder="Why was medication stopped?"
                            rows={2}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMedication}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Medication
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Hospitalization History */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasBeenHospitalized"
                checked={data.previousTreatmentAttempts?.hospitalizationHistory?.hasBeenHospitalized || false}
                onCheckedChange={(checked) => 
                  onChange({
                    ...data,
                    previousTreatmentAttempts: {
                      ...data.previousTreatmentAttempts,
                      hospitalizationHistory: {
                        ...(data.previousTreatmentAttempts?.hospitalizationHistory || { hospitalizations: [] }),
                        hasBeenHospitalized: checked as boolean
                      }
                    }
                  })
                }
              />
              <Label htmlFor="hasBeenHospitalized" className="font-semibold">Previous Psychiatric Hospitalizations</Label>
            </div>

            {data.previousTreatmentAttempts?.hospitalizationHistory?.hasBeenHospitalized && (
              <div className="ml-6 space-y-4">
                {(data.previousTreatmentAttempts?.hospitalizationHistory?.hospitalizations || []).map((hospitalization, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">Hospitalization {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeHospitalization(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Facility</Label>
                          <Input
                            value={hospitalization.facility}
                            onChange={(e) => updateHospitalization(index, 'facility', e.target.value)}
                            placeholder="Hospital or facility name"
                          />
                        </div>
                        <div>
                          <Label>Dates</Label>
                          <Input
                            value={hospitalization.dates}
                            onChange={(e) => updateHospitalization(index, 'dates', e.target.value)}
                            placeholder="e.g., March 2023"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Reason</Label>
                          <Textarea
                            value={hospitalization.reason}
                            onChange={(e) => updateHospitalization(index, 'reason', e.target.value)}
                            placeholder="Reason for hospitalization"
                            rows={2}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`wasVoluntary-${index}`}
                            checked={hospitalization.wasVoluntary}
                            onCheckedChange={(checked) => updateHospitalization(index, 'wasVoluntary', checked as boolean)}
                          />
                          <Label htmlFor={`wasVoluntary-${index}`}>Was Voluntary</Label>
                        </div>
                        <div className="md:col-span-2">
                          <Label>Outcome</Label>
                          <Textarea
                            value={hospitalization.outcome}
                            onChange={(e) => updateHospitalization(index, 'outcome', e.target.value)}
                            placeholder="Treatment outcome and discharge plan"
                            rows={2}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addHospitalization}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Hospitalization
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </AISectionWrapper>
  );
}
