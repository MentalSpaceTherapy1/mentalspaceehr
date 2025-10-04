import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Plus, X } from 'lucide-react';

interface HistorySectionProps {
  developmental: any;
  family: any;
  medical: any;
  substance: any;
  social: any;
  cultural: any;
  onDevelopmentalChange: (data: any) => void;
  onFamilyChange: (data: any) => void;
  onMedicalChange: (data: any) => void;
  onSubstanceChange: (data: any) => void;
  onSocialChange: (data: any) => void;
  onCulturalChange: (data: any) => void;
}

export function HistorySection({
  developmental,
  family,
  medical,
  substance,
  social,
  cultural,
  onDevelopmentalChange,
  onFamilyChange,
  onMedicalChange,
  onSubstanceChange,
  onSocialChange,
  onCulturalChange
}: HistorySectionProps) {
  const handleArrayAdd = (setter: any, data: any, field: string, newItem: any) => {
    const array = data[field] || [];
    setter({ ...data, [field]: [...array, newItem] });
  };

  const handleArrayRemove = (setter: any, data: any, field: string, index: number) => {
    const array = [...(data[field] || [])];
    array.splice(index, 1);
    setter({ ...data, [field]: array });
  };

  const handleArrayUpdate = (setter: any, data: any, field: string, index: number, value: any) => {
    const array = [...(data[field] || [])];
    array[index] = value;
    setter({ ...data, [field]: array });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comprehensive History</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="developmental" className="space-y-4">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}>
            <TabsTrigger value="developmental">Developmental</TabsTrigger>
            <TabsTrigger value="family">Family</TabsTrigger>
            <TabsTrigger value="medical">Medical</TabsTrigger>
            <TabsTrigger value="substance">Substance Use</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
            <TabsTrigger value="cultural">Cultural</TabsTrigger>
          </TabsList>

          {/* Developmental Tab */}
          <TabsContent value="developmental" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Prenatal History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Planned Pregnancy</Label>
                  <Switch
                    checked={developmental?.prenatal?.plannedPregnancy || false}
                    onCheckedChange={(v) => onDevelopmentalChange({
                      ...developmental,
                      prenatal: { ...(developmental?.prenatal || {}), plannedPregnancy: v }
                    })}
                  />
                </div>

                <div>
                  <Label>Maternal Age</Label>
                  <Input
                    type="number"
                    value={developmental?.prenatal?.maternalAge || ''}
                    onChange={(e) => onDevelopmentalChange({
                      ...developmental,
                      prenatal: { ...(developmental?.prenatal || {}), maternalAge: e.target.value ? parseInt(e.target.value) : undefined }
                    })}
                    placeholder="Mother's age at time of pregnancy"
                  />
                </div>

                <div>
                  <Label>Complications</Label>
                  <Textarea
                    value={developmental?.prenatal?.complications || ''}
                    onChange={(e) => onDevelopmentalChange({
                      ...developmental,
                      prenatal: { ...(developmental?.prenatal || {}), complications: e.target.value }
                    })}
                    placeholder="Any prenatal complications, illnesses, or concerns..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Substance Use During Pregnancy</Label>
                  <Textarea
                    value={developmental?.prenatal?.substanceUse || ''}
                    onChange={(e) => onDevelopmentalChange({
                      ...developmental,
                      prenatal: { ...(developmental?.prenatal || {}), substanceUse: e.target.value }
                    })}
                    placeholder="Alcohol, tobacco, medications, or other substances used during pregnancy..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Birth History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Delivery Type</Label>
                  <Select
                    value={developmental?.birth?.deliveryType}
                    onValueChange={(v) => onDevelopmentalChange({
                      ...developmental,
                      birth: { ...(developmental?.birth || {}), deliveryType: v }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vaginal">Vaginal</SelectItem>
                      <SelectItem value="C-Section">C-Section</SelectItem>
                      <SelectItem value="Forceps">Forceps</SelectItem>
                      <SelectItem value="Vacuum">Vacuum</SelectItem>
                      <SelectItem value="Unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Birth Weight</Label>
                    <Input
                      value={developmental?.birth?.birthWeight || ''}
                      onChange={(e) => onDevelopmentalChange({
                        ...developmental,
                        birth: { ...(developmental?.birth || {}), birthWeight: e.target.value }
                      })}
                      placeholder="e.g., 7 lbs 8 oz"
                    />
                  </div>

                  <div>
                    <Label>Apgar Scores</Label>
                    <Input
                      value={developmental?.birth?.apgarScores || ''}
                      onChange={(e) => onDevelopmentalChange({
                        ...developmental,
                        birth: { ...(developmental?.birth || {}), apgarScores: e.target.value }
                      })}
                      placeholder="e.g., 8/9"
                    />
                  </div>
                </div>

                <div>
                  <Label>Birth Complications</Label>
                  <Textarea
                    value={developmental?.birth?.complications || ''}
                    onChange={(e) => onDevelopmentalChange({
                      ...developmental,
                      birth: { ...(developmental?.birth || {}), complications: e.target.value }
                    })}
                    placeholder="Any complications during delivery..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Neonatal Complications</Label>
                  <Textarea
                    value={developmental?.birth?.neonatalComplications || ''}
                    onChange={(e) => onDevelopmentalChange({
                      ...developmental,
                      birth: { ...(developmental?.birth || {}), neonatalComplications: e.target.value }
                    })}
                    placeholder="NICU stay, jaundice, breathing issues, etc..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Early Development</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Developmental Milestone Delays</Label>
                  <Switch
                    checked={developmental?.earlyDevelopment?.milestoneDelays || false}
                    onCheckedChange={(v) => onDevelopmentalChange({
                      ...developmental,
                      earlyDevelopment: { ...(developmental?.earlyDevelopment || {}), milestoneDelays: v }
                    })}
                  />
                </div>

                {developmental?.earlyDevelopment?.milestoneDelays && (
                  <div>
                    <Label>Delay Details</Label>
                    <Textarea
                      value={developmental?.earlyDevelopment?.delayDetails || ''}
                      onChange={(e) => onDevelopmentalChange({
                        ...developmental,
                        earlyDevelopment: { ...(developmental?.earlyDevelopment || {}), delayDetails: e.target.value }
                      })}
                      placeholder="Describe specific delays (motor, speech, social, etc.)..."
                      rows={3}
                    />
                  </div>
                )}

                <div>
                  <Label>Early Interventions</Label>
                  <Textarea
                    value={developmental?.earlyDevelopment?.earlyInterventions || ''}
                    onChange={(e) => onDevelopmentalChange({
                      ...developmental,
                      earlyDevelopment: { ...(developmental?.earlyDevelopment || {}), earlyInterventions: e.target.value }
                    })}
                    placeholder="Physical therapy, speech therapy, occupational therapy, etc..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Family Tab */}
          <TabsContent value="family" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mental Health History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Family History of Mental Health Conditions</Label>
                  <Switch
                    checked={family?.mentalHealthHistory?.hasFamilyHistory || false}
                    onCheckedChange={(v) => onFamilyChange({
                      ...family,
                      mentalHealthHistory: { ...(family?.mentalHealthHistory || {}), hasFamilyHistory: v }
                    })}
                  />
                </div>

                {family?.mentalHealthHistory?.hasFamilyHistory && (
                  <div className="space-y-4">
                    {(family?.mentalHealthHistory?.relatives || []).map((relative: any, index: number) => (
                      <Card key={index}>
                        <CardContent className="pt-6 space-y-4">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium">Relative {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleArrayRemove(onFamilyChange, family, 'mentalHealthHistory.relatives', index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>Relationship</Label>
                              <Input
                                value={relative.relationship || ''}
                                onChange={(e) => {
                                  const relatives = [...(family?.mentalHealthHistory?.relatives || [])];
                                  relatives[index] = { ...relatives[index], relationship: e.target.value };
                                  onFamilyChange({
                                    ...family,
                                    mentalHealthHistory: { ...(family?.mentalHealthHistory || {}), relatives }
                                  });
                                }}
                                placeholder="e.g., Mother, Father, Sibling"
                              />
                            </div>

                            <div>
                              <Label>Conditions</Label>
                              <Input
                                value={(relative.conditions || []).join(', ')}
                                onChange={(e) => {
                                  const relatives = [...(family?.mentalHealthHistory?.relatives || [])];
                                  relatives[index] = { 
                                    ...relatives[index], 
                                    conditions: e.target.value.split(',').map((c: string) => c.trim()).filter((c: string) => c)
                                  };
                                  onFamilyChange({
                                    ...family,
                                    mentalHealthHistory: { ...(family?.mentalHealthHistory || {}), relatives }
                                  });
                                }}
                                placeholder="Comma-separated conditions"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <Label>Treatment History</Label>
                              <Textarea
                                value={relative.treatmentHistory || ''}
                                onChange={(e) => {
                                  const relatives = [...(family?.mentalHealthHistory?.relatives || [])];
                                  relatives[index] = { ...relatives[index], treatmentHistory: e.target.value };
                                  onFamilyChange({
                                    ...family,
                                    mentalHealthHistory: { ...(family?.mentalHealthHistory || {}), relatives }
                                  });
                                }}
                                placeholder="Treatment details..."
                                rows={2}
                              />
                            </div>

                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={relative.hospitalizations || false}
                                  onCheckedChange={(v) => {
                                    const relatives = [...(family?.mentalHealthHistory?.relatives || [])];
                                    relatives[index] = { ...relatives[index], hospitalizations: v };
                                    onFamilyChange({
                                      ...family,
                                      mentalHealthHistory: { ...(family?.mentalHealthHistory || {}), relatives }
                                    });
                                  }}
                                />
                                <Label>Hospitalizations</Label>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={relative.completedSuicide || false}
                                  onCheckedChange={(v) => {
                                    const relatives = [...(family?.mentalHealthHistory?.relatives || [])];
                                    relatives[index] = { ...relatives[index], completedSuicide: v };
                                    onFamilyChange({
                                      ...family,
                                      mentalHealthHistory: { ...(family?.mentalHealthHistory || {}), relatives }
                                    });
                                  }}
                                />
                                <Label>Completed Suicide</Label>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={relative.substanceAbuse || false}
                                  onCheckedChange={(v) => {
                                    const relatives = [...(family?.mentalHealthHistory?.relatives || [])];
                                    relatives[index] = { ...relatives[index], substanceAbuse: v };
                                    onFamilyChange({
                                      ...family,
                                      mentalHealthHistory: { ...(family?.mentalHealthHistory || {}), relatives }
                                    });
                                  }}
                                />
                                <Label>Substance Abuse</Label>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const relatives = family?.mentalHealthHistory?.relatives || [];
                        onFamilyChange({
                          ...family,
                          mentalHealthHistory: {
                            ...(family?.mentalHealthHistory || {}),
                            relatives: [...relatives, { relationship: '', conditions: [], treatmentHistory: '' }]
                          }
                        });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Relative
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Family Medical History</CardTitle>
              </CardHeader>
              <CardContent>
                <Label>Significant Medical Conditions</Label>
                <Textarea
                  value={family?.medicalHistory?.significantConditions || ''}
                  onChange={(e) => onFamilyChange({
                    ...family,
                    medicalHistory: { ...(family?.medicalHistory || {}), significantConditions: e.target.value }
                  })}
                  placeholder="Heart disease, diabetes, cancer, genetic conditions, etc..."
                  rows={3}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Family Dynamics & Environment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Family Dynamics</Label>
                  <Textarea
                    value={family?.familyDynamics || ''}
                    onChange={(e) => onFamilyChange({ ...family, familyDynamics: e.target.value })}
                    placeholder="Describe family relationships, communication patterns, conflicts..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Childhood Environment</Label>
                  <Textarea
                    value={family?.childhoodEnvironment || ''}
                    onChange={(e) => onFamilyChange({ ...family, childhoodEnvironment: e.target.value })}
                    placeholder="Describe home environment, stability, parenting style, economic status..."
                    rows={3}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <Label>History of Trauma</Label>
                  <Switch
                    checked={family?.traumaHistory || false}
                    onCheckedChange={(v) => onFamilyChange({ ...family, traumaHistory: v })}
                  />
                </div>

                {family?.traumaHistory && (
                  <div>
                    <Label>Trauma Details</Label>
                    <Textarea
                      value={family?.traumaDetails || ''}
                      onChange={(e) => onFamilyChange({ ...family, traumaDetails: e.target.value })}
                      placeholder="Describe traumatic experiences, including nature, age at occurrence, impact..."
                      rows={4}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Medical Tab */}
          <TabsContent value="medical" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Current Medical Conditions</Label>
                <Textarea
                  value={(medical?.currentMedicalConditions || []).join(', ')}
                  onChange={(e) => onMedicalChange({
                    ...medical,
                    currentMedicalConditions: e.target.value.split(',').map((c: string) => c.trim()).filter((c: string) => c)
                  })}
                  placeholder="Comma-separated list of current conditions"
                  rows={3}
                />
              </div>

              <div>
                <Label>Past Medical Conditions</Label>
                <Textarea
                  value={(medical?.pastMedicalConditions || []).join(', ')}
                  onChange={(e) => onMedicalChange({
                    ...medical,
                    pastMedicalConditions: e.target.value.split(',').map((c: string) => c.trim()).filter((c: string) => c)
                  })}
                  placeholder="Comma-separated list of past conditions"
                  rows={3}
                />
              </div>
            </div>

            <div>
              <Label>Surgeries/Procedures</Label>
              <Textarea
                value={(medical?.surgeries || []).join(', ')}
                onChange={(e) => onMedicalChange({
                  ...medical,
                  surgeries: e.target.value.split(',').map((s: string) => s.trim()).filter((s: string) => s)
                })}
                placeholder="Comma-separated list of surgeries with dates"
                rows={2}
              />
            </div>

            <Separator />

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Allergies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Medication Allergies</Label>
                  <Textarea
                    value={(medical?.allergies?.medications || []).join(', ')}
                    onChange={(e) => onMedicalChange({
                      ...medical,
                      allergies: {
                        ...(medical?.allergies || {}),
                        medications: e.target.value.split(',').map((a: string) => a.trim()).filter((a: string) => a)
                      }
                    })}
                    placeholder="Comma-separated medication allergies"
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Environmental Allergies</Label>
                  <Textarea
                    value={(medical?.allergies?.environmental || []).join(', ')}
                    onChange={(e) => onMedicalChange({
                      ...medical,
                      allergies: {
                        ...(medical?.allergies || {}),
                        environmental: e.target.value.split(',').map((a: string) => a.trim()).filter((a: string) => a)
                      }
                    })}
                    placeholder="Pollen, dust, pet dander, etc."
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Food Allergies</Label>
                  <Textarea
                    value={(medical?.allergies?.food || []).join(', ')}
                    onChange={(e) => onMedicalChange({
                      ...medical,
                      allergies: {
                        ...(medical?.allergies || {}),
                        food: e.target.value.split(',').map((a: string) => a.trim()).filter((a: string) => a)
                      }
                    })}
                    placeholder="Comma-separated food allergies"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            <Separator />

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current Medications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(medical?.currentMedications || []).map((med: any, index: number) => (
                  <Card key={index}>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">Medication {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleArrayRemove(onMedicalChange, medical, 'currentMedications', index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Medication Name</Label>
                          <Input
                            value={med.name || ''}
                            onChange={(e) => {
                              const meds = [...(medical?.currentMedications || [])];
                              meds[index] = { ...meds[index], name: e.target.value };
                              onMedicalChange({ ...medical, currentMedications: meds });
                            }}
                            placeholder="Medication name"
                          />
                        </div>

                        <div>
                          <Label>Dosage</Label>
                          <Input
                            value={med.dosage || ''}
                            onChange={(e) => {
                              const meds = [...(medical?.currentMedications || [])];
                              meds[index] = { ...meds[index], dosage: e.target.value };
                              onMedicalChange({ ...medical, currentMedications: meds });
                            }}
                            placeholder="e.g., 50mg"
                          />
                        </div>

                        <div>
                          <Label>Frequency</Label>
                          <Input
                            value={med.frequency || ''}
                            onChange={(e) => {
                              const meds = [...(medical?.currentMedications || [])];
                              meds[index] = { ...meds[index], frequency: e.target.value };
                              onMedicalChange({ ...medical, currentMedications: meds });
                            }}
                            placeholder="e.g., Twice daily"
                          />
                        </div>

                        <div>
                          <Label>Prescribed For</Label>
                          <Input
                            value={med.prescribedFor || ''}
                            onChange={(e) => {
                              const meds = [...(medical?.currentMedications || [])];
                              meds[index] = { ...meds[index], prescribedFor: e.target.value };
                              onMedicalChange({ ...medical, currentMedications: meds });
                            }}
                            placeholder="Condition/indication"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <Label>Prescriber</Label>
                          <Input
                            value={med.prescriber || ''}
                            onChange={(e) => {
                              const meds = [...(medical?.currentMedications || [])];
                              meds[index] = { ...meds[index], prescriber: e.target.value };
                              onMedicalChange({ ...medical, currentMedications: meds });
                            }}
                            placeholder="Prescribing physician"
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
                  onClick={() => handleArrayAdd(onMedicalChange, medical, 'currentMedications', {
                    name: '', dosage: '', frequency: '', prescribedFor: '', prescriber: ''
                  })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Medication
                </Button>
              </CardContent>
            </Card>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Last Physical Exam</Label>
                <Input
                  type="date"
                  value={medical?.lastPhysicalExam || ''}
                  onChange={(e) => onMedicalChange({ ...medical, lastPhysicalExam: e.target.value })}
                />
              </div>

              <div>
                <Label>Primary Care Physician</Label>
                <Input
                  value={medical?.primaryCarePhysician || ''}
                  onChange={(e) => onMedicalChange({ ...medical, primaryCarePhysician: e.target.value })}
                  placeholder="PCP name"
                />
              </div>
            </div>
          </TabsContent>

          {/* Substance Use Tab */}
          <TabsContent value="substance" className="space-y-4">
            {/* Alcohol Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Alcohol Use</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Current Use</Label>
                  <Switch
                    checked={substance?.alcohol?.current || false}
                    onCheckedChange={(v) => onSubstanceChange({
                      ...substance,
                      alcohol: { ...(substance?.alcohol || {}), current: v }
                    })}
                  />
                </div>

                {substance?.alcohol?.current && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Frequency</Label>
                        <Select
                          value={substance?.alcohol?.frequency}
                          onValueChange={(v) => onSubstanceChange({
                            ...substance,
                            alcohol: { ...(substance?.alcohol || {}), frequency: v }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Never">Never</SelectItem>
                            <SelectItem value="Rarely">Rarely</SelectItem>
                            <SelectItem value="Weekly">Weekly</SelectItem>
                            <SelectItem value="Daily">Daily</SelectItem>
                            <SelectItem value="Multiple times daily">Multiple times daily</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Amount</Label>
                        <Input
                          value={substance?.alcohol?.amount || ''}
                          onChange={(e) => onSubstanceChange({
                            ...substance,
                            alcohol: { ...(substance?.alcohol || {}), amount: e.target.value }
                          })}
                          placeholder="e.g., 2-3 drinks"
                        />
                      </div>

                      <div>
                        <Label>Age of First Use</Label>
                        <Input
                          type="number"
                          value={substance?.alcohol?.ageOfFirstUse || ''}
                          onChange={(e) => onSubstanceChange({
                            ...substance,
                            alcohol: { ...(substance?.alcohol || {}), ageOfFirstUse: e.target.value ? parseInt(e.target.value) : undefined }
                          })}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Problems Related to Use</Label>
                      <Switch
                        checked={substance?.alcohol?.problemsRelated || false}
                        onCheckedChange={(v) => onSubstanceChange({
                          ...substance,
                          alcohol: { ...(substance?.alcohol || {}), problemsRelated: v }
                        })}
                      />
                    </div>

                    {substance?.alcohol?.problemsRelated && (
                      <Textarea
                        value={substance?.alcohol?.problemDetails || ''}
                        onChange={(e) => onSubstanceChange({
                          ...substance,
                          alcohol: { ...(substance?.alcohol || {}), problemDetails: e.target.value }
                        })}
                        placeholder="Describe problems (DUIs, health issues, relationship conflicts, etc.)..."
                        rows={3}
                      />
                    )}

                    <div className="flex items-center justify-between">
                      <Label>Previous Treatment</Label>
                      <Switch
                        checked={substance?.alcohol?.previousTreatment || false}
                        onCheckedChange={(v) => onSubstanceChange({
                          ...substance,
                          alcohol: { ...(substance?.alcohol || {}), previousTreatment: v }
                        })}
                      />
                    </div>

                    {substance?.alcohol?.previousTreatment && (
                      <>
                        <Textarea
                          value={substance?.alcohol?.treatmentDetails || ''}
                          onChange={(e) => onSubstanceChange({
                            ...substance,
                            alcohol: { ...(substance?.alcohol || {}), treatmentDetails: e.target.value }
                          })}
                          placeholder="Treatment programs, rehab, AA, etc..."
                          rows={2}
                        />

                        <div>
                          <Label>Longest Period of Sobriety</Label>
                          <Input
                            value={substance?.alcohol?.longestSobriety || ''}
                            onChange={(e) => onSubstanceChange({
                              ...substance,
                              alcohol: { ...(substance?.alcohol || {}), longestSobriety: e.target.value }
                            })}
                            placeholder="e.g., 6 months, 2 years"
                          />
                        </div>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Tobacco Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tobacco Use</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Current Use</Label>
                  <Switch
                    checked={substance?.tobacco?.current || false}
                    onCheckedChange={(v) => onSubstanceChange({
                      ...substance,
                      tobacco: { ...(substance?.tobacco || {}), current: v }
                    })}
                  />
                </div>

                {substance?.tobacco?.current && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Type</Label>
                      <Select
                        value={substance?.tobacco?.type}
                        onValueChange={(v) => onSubstanceChange({
                          ...substance,
                          tobacco: { ...(substance?.tobacco || {}), type: v }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cigarettes">Cigarettes</SelectItem>
                          <SelectItem value="Vaping">Vaping</SelectItem>
                          <SelectItem value="Chewing">Chewing</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Amount</Label>
                      <Input
                        value={substance?.tobacco?.amount || ''}
                        onChange={(e) => onSubstanceChange({
                          ...substance,
                          tobacco: { ...(substance?.tobacco || {}), amount: e.target.value }
                        })}
                        placeholder="e.g., 1 pack/day"
                      />
                    </div>

                    <div>
                      <Label>Age of First Use</Label>
                      <Input
                        type="number"
                        value={substance?.tobacco?.ageOfFirstUse || ''}
                        onChange={(e) => onSubstanceChange({
                          ...substance,
                          tobacco: { ...(substance?.tobacco || {}), ageOfFirstUse: e.target.value ? parseInt(e.target.value) : undefined }
                        })}
                      />
                    </div>

                    <div>
                      <Label>Quit Attempts</Label>
                      <Input
                        type="number"
                        value={substance?.tobacco?.quitAttempts || ''}
                        onChange={(e) => onSubstanceChange({
                          ...substance,
                          tobacco: { ...(substance?.tobacco || {}), quitAttempts: e.target.value ? parseInt(e.target.value) : undefined }
                        })}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cannabis Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cannabis Use</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Current Use</Label>
                  <Switch
                    checked={substance?.cannabis?.current || false}
                    onCheckedChange={(v) => onSubstanceChange({
                      ...substance,
                      cannabis: { ...(substance?.cannabis || {}), current: v }
                    })}
                  />
                </div>

                {substance?.cannabis?.current && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Frequency</Label>
                        <Input
                          value={substance?.cannabis?.frequency || ''}
                          onChange={(e) => onSubstanceChange({
                            ...substance,
                            cannabis: { ...(substance?.cannabis || {}), frequency: e.target.value }
                          })}
                          placeholder="e.g., Daily, Weekly"
                        />
                      </div>

                      <div>
                        <Label>Age of First Use</Label>
                        <Input
                          type="number"
                          value={substance?.cannabis?.ageOfFirstUse || ''}
                          onChange={(e) => onSubstanceChange({
                            ...substance,
                            cannabis: { ...(substance?.cannabis || {}), ageOfFirstUse: e.target.value ? parseInt(e.target.value) : undefined }
                          })}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Problems Related to Use</Label>
                      <Switch
                        checked={substance?.cannabis?.problemsRelated || false}
                        onCheckedChange={(v) => onSubstanceChange({
                          ...substance,
                          cannabis: { ...(substance?.cannabis || {}), problemsRelated: v }
                        })}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Other Substances */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Other Substances</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(substance?.otherSubstances || []).map((sub: any, index: number) => (
                  <Card key={index}>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">Substance {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleArrayRemove(onSubstanceChange, substance, 'otherSubstances', index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Substance Name</Label>
                          <Input
                            value={sub.substance || ''}
                            onChange={(e) => {
                              const subs = [...(substance?.otherSubstances || [])];
                              subs[index] = { ...subs[index], substance: e.target.value };
                              onSubstanceChange({ ...substance, otherSubstances: subs });
                            }}
                            placeholder="Cocaine, opioids, etc."
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={sub.current || false}
                            onCheckedChange={(v) => {
                              const subs = [...(substance?.otherSubstances || [])];
                              subs[index] = { ...subs[index], current: v };
                              onSubstanceChange({ ...substance, otherSubstances: subs });
                            }}
                          />
                          <Label>Current Use</Label>
                        </div>

                        <div>
                          <Label>Frequency</Label>
                          <Input
                            value={sub.frequency || ''}
                            onChange={(e) => {
                              const subs = [...(substance?.otherSubstances || [])];
                              subs[index] = { ...subs[index], frequency: e.target.value };
                              onSubstanceChange({ ...substance, otherSubstances: subs });
                            }}
                            placeholder="How often used"
                          />
                        </div>

                        <div>
                          <Label>Age of First Use</Label>
                          <Input
                            type="number"
                            value={sub.ageOfFirstUse || ''}
                            onChange={(e) => {
                              const subs = [...(substance?.otherSubstances || [])];
                              subs[index] = { ...subs[index], ageOfFirstUse: e.target.value ? parseInt(e.target.value) : undefined };
                              onSubstanceChange({ ...substance, otherSubstances: subs });
                            }}
                          />
                        </div>

                        <div>
                          <Label>Route of Administration</Label>
                          <Input
                            value={sub.routeOfAdministration || ''}
                            onChange={(e) => {
                              const subs = [...(substance?.otherSubstances || [])];
                              subs[index] = { ...subs[index], routeOfAdministration: e.target.value };
                              onSubstanceChange({ ...substance, otherSubstances: subs });
                            }}
                            placeholder="Oral, intranasal, IV, etc."
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={sub.problemsRelated || false}
                            onCheckedChange={(v) => {
                              const subs = [...(substance?.otherSubstances || [])];
                              subs[index] = { ...subs[index], problemsRelated: v };
                              onSubstanceChange({ ...substance, otherSubstances: subs });
                            }}
                          />
                          <Label>Problems Related</Label>
                        </div>

                        {sub.problemsRelated && (
                          <div className="md:col-span-2">
                            <Label>Problem Details</Label>
                            <Textarea
                              value={sub.problemDetails || ''}
                              onChange={(e) => {
                                const subs = [...(substance?.otherSubstances || [])];
                                subs[index] = { ...subs[index], problemDetails: e.target.value };
                                onSubstanceChange({ ...substance, otherSubstances: subs });
                              }}
                              rows={2}
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleArrayAdd(onSubstanceChange, substance, 'otherSubstances', {
                    substance: '', current: false, frequency: '', ageOfFirstUse: undefined, routeOfAdministration: '', problemsRelated: false
                  })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Substance
                </Button>
              </CardContent>
            </Card>

            {/* Recovery Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recovery Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>In Recovery</Label>
                  <Switch
                    checked={substance?.recoveryStatus?.inRecovery || false}
                    onCheckedChange={(v) => onSubstanceChange({
                      ...substance,
                      recoveryStatus: { ...(substance?.recoveryStatus || {}), inRecovery: v }
                    })}
                  />
                </div>

                {substance?.recoveryStatus?.inRecovery && (
                  <>
                    <div>
                      <Label>Sobriety Date</Label>
                      <Input
                        type="date"
                        value={substance?.recoveryStatus?.sobrietyDate || ''}
                        onChange={(e) => onSubstanceChange({
                          ...substance,
                          recoveryStatus: { ...(substance?.recoveryStatus || {}), sobrietyDate: e.target.value }
                        })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>AA/NA Attendance</Label>
                      <Switch
                        checked={substance?.recoveryStatus?.aaOrNaAttendance || false}
                        onCheckedChange={(v) => onSubstanceChange({
                          ...substance,
                          recoveryStatus: { ...(substance?.recoveryStatus || {}), aaOrNaAttendance: v }
                        })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Has Sponsor</Label>
                      <Switch
                        checked={substance?.recoveryStatus?.sponsor || false}
                        onCheckedChange={(v) => onSubstanceChange({
                          ...substance,
                          recoveryStatus: { ...(substance?.recoveryStatus || {}), sponsor: v }
                        })}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Social Tab */}
          <TabsContent value="social" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Relationships</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Relationship Status</Label>
                  <Input
                    value={social?.relationshipStatus || ''}
                    onChange={(e) => onSocialChange({ ...social, relationshipStatus: e.target.value })}
                    placeholder="Single, Married, Divorced, etc."
                  />
                </div>

                <div>
                  <Label>Quality of Relationships</Label>
                  <Textarea
                    value={social?.qualityOfRelationships || ''}
                    onChange={(e) => onSocialChange({ ...social, qualityOfRelationships: e.target.value })}
                    placeholder="Describe quality of relationships with partner, family, friends..."
                    rows={3}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <Label>Has Children</Label>
                  <Switch
                    checked={social?.children?.hasChildren || false}
                    onCheckedChange={(v) => onSocialChange({
                      ...social,
                      children: { ...(social?.children || {}), hasChildren: v }
                    })}
                  />
                </div>

                {social?.children?.hasChildren && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-4">
                    <div>
                      <Label>Number of Children</Label>
                      <Input
                        type="number"
                        value={social?.children?.numberOfChildren || ''}
                        onChange={(e) => onSocialChange({
                          ...social,
                          children: { ...(social?.children || {}), numberOfChildren: e.target.value ? parseInt(e.target.value) : undefined }
                        })}
                      />
                    </div>

                    <div>
                      <Label>Ages</Label>
                      <Input
                        value={social?.children?.ages || ''}
                        onChange={(e) => onSocialChange({
                          ...social,
                          children: { ...(social?.children || {}), ages: e.target.value }
                        })}
                        placeholder="e.g., 5, 8, 12"
                      />
                    </div>

                    <div>
                      <Label>Custody Arrangement</Label>
                      <Input
                        value={social?.children?.custody || ''}
                        onChange={(e) => onSocialChange({
                          ...social,
                          children: { ...(social?.children || {}), custody: e.target.value }
                        })}
                        placeholder="Full, joint, shared, etc."
                      />
                    </div>

                    <div>
                      <Label>Relationship Quality</Label>
                      <Input
                        value={social?.children?.relationshipQuality || ''}
                        onChange={(e) => onSocialChange({
                          ...social,
                          children: { ...(social?.children || {}), relationshipQuality: e.target.value }
                        })}
                        placeholder="Good, strained, etc."
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Support System</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Has Support System</Label>
                  <Switch
                    checked={social?.supportSystem?.hasSupportSystem || false}
                    onCheckedChange={(v) => onSocialChange({
                      ...social,
                      supportSystem: { ...(social?.supportSystem || {}), hasSupportSystem: v }
                    })}
                  />
                </div>

                {social?.supportSystem?.hasSupportSystem && (
                  <>
                    <div>
                      <Label>Support People</Label>
                      <Textarea
                        value={(social?.supportSystem?.supportPeople || []).join(', ')}
                        onChange={(e) => onSocialChange({
                          ...social,
                          supportSystem: {
                            ...(social?.supportSystem || {}),
                            supportPeople: e.target.value.split(',').map((p: string) => p.trim()).filter((p: string) => p)
                          }
                        })}
                        placeholder="Comma-separated list of support people (names/relationships)"
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label>Quality of Support</Label>
                      <Select
                        value={social?.supportSystem?.qualityOfSupport}
                        onValueChange={(v) => onSocialChange({
                          ...social,
                          supportSystem: { ...(social?.supportSystem || {}), qualityOfSupport: v }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Strong">Strong</SelectItem>
                          <SelectItem value="Moderate">Moderate</SelectItem>
                          <SelectItem value="Weak">Weak</SelectItem>
                          <SelectItem value="None">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Legal History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Current Legal Issues</Label>
                  <Switch
                    checked={social?.legalHistory?.currentLegalIssues || false}
                    onCheckedChange={(v) => onSocialChange({
                      ...social,
                      legalHistory: { ...(social?.legalHistory || {}), currentLegalIssues: v }
                    })}
                  />
                </div>

                {social?.legalHistory?.currentLegalIssues && (
                  <Textarea
                    value={social?.legalHistory?.details || ''}
                    onChange={(e) => onSocialChange({
                      ...social,
                      legalHistory: { ...(social?.legalHistory || {}), details: e.target.value }
                    })}
                    placeholder="Describe legal issues, charges, court dates..."
                    rows={3}
                  />
                )}

                <div className="flex items-center justify-between">
                  <Label>On Probation or Parole</Label>
                  <Switch
                    checked={social?.legalHistory?.probationOrParole || false}
                    onCheckedChange={(v) => onSocialChange({
                      ...social,
                      legalHistory: { ...(social?.legalHistory || {}), probationOrParole: v }
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Education</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Highest Level Completed</Label>
                  <Input
                    value={social?.educationHistory?.highestLevel || ''}
                    onChange={(e) => onSocialChange({
                      ...social,
                      educationHistory: { ...(social?.educationHistory || {}), highestLevel: e.target.value }
                    })}
                    placeholder="High school, some college, bachelor's, etc."
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Currently in School</Label>
                  <Switch
                    checked={social?.educationHistory?.currentlyInSchool || false}
                    onCheckedChange={(v) => onSocialChange({
                      ...social,
                      educationHistory: { ...(social?.educationHistory || {}), currentlyInSchool: v }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Academic Difficulties</Label>
                  <Switch
                    checked={social?.educationHistory?.academicDifficulties || false}
                    onCheckedChange={(v) => onSocialChange({
                      ...social,
                      educationHistory: { ...(social?.educationHistory || {}), academicDifficulties: v }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Special Education Services</Label>
                  <Switch
                    checked={social?.educationHistory?.specialEducation || false}
                    onCheckedChange={(v) => onSocialChange({
                      ...social,
                      educationHistory: { ...(social?.educationHistory || {}), specialEducation: v }
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Employment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Current Employment</Label>
                  <Input
                    value={social?.occupationalHistory?.currentEmployment || ''}
                    onChange={(e) => onSocialChange({
                      ...social,
                      occupationalHistory: { ...(social?.occupationalHistory || {}), currentEmployment: e.target.value }
                    })}
                    placeholder="Employed, unemployed, retired, disabled, etc."
                  />
                </div>

                <div>
                  <Label>Job Satisfaction</Label>
                  <Select
                    value={social?.occupationalHistory?.jobSatisfaction}
                    onValueChange={(v) => onSocialChange({
                      ...social,
                      occupationalHistory: { ...(social?.occupationalHistory || {}), jobSatisfaction: v }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Moderate">Moderate</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="N/A">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Work-Related Problems</Label>
                  <Switch
                    checked={social?.occupationalHistory?.workProblems || false}
                    onCheckedChange={(v) => onSocialChange({
                      ...social,
                      occupationalHistory: { ...(social?.occupationalHistory || {}), workProblems: v }
                    })}
                  />
                </div>

                {social?.occupationalHistory?.workProblems && (
                  <Textarea
                    value={social?.occupationalHistory?.workProblemDetails || ''}
                    onChange={(e) => onSocialChange({
                      ...social,
                      occupationalHistory: { ...(social?.occupationalHistory || {}), workProblemDetails: e.target.value }
                    })}
                    placeholder="Describe work-related problems..."
                    rows={2}
                  />
                )}

                <div className="flex items-center justify-between">
                  <Label>Military Service</Label>
                  <Switch
                    checked={social?.occupationalHistory?.militaryService || false}
                    onCheckedChange={(v) => onSocialChange({
                      ...social,
                      occupationalHistory: { ...(social?.occupationalHistory || {}), militaryService: v }
                    })}
                  />
                </div>

                {social?.occupationalHistory?.militaryService && (
                  <Textarea
                    value={social?.occupationalHistory?.militaryDetails || ''}
                    onChange={(e) => onSocialChange({
                      ...social,
                      occupationalHistory: { ...(social?.occupationalHistory || {}), militaryDetails: e.target.value }
                    })}
                    placeholder="Branch, years served, deployment, discharge type..."
                    rows={2}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Financial & Living Situation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Financial Stress</Label>
                  <Switch
                    checked={social?.financial?.financialStress || false}
                    onCheckedChange={(v) => onSocialChange({
                      ...social,
                      financial: { ...(social?.financial || {}), financialStress: v }
                    })}
                  />
                </div>

                {social?.financial?.financialStress && (
                  <Textarea
                    value={social?.financial?.stressDetails || ''}
                    onChange={(e) => onSocialChange({
                      ...social,
                      financial: { ...(social?.financial || {}), stressDetails: e.target.value }
                    })}
                    placeholder="Debt, unemployment, housing insecurity, etc..."
                    rows={2}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recreational & Spiritual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Hobbies</Label>
                  <Textarea
                    value={(social?.recreational?.hobbies || []).join(', ')}
                    onChange={(e) => onSocialChange({
                      ...social,
                      recreational: {
                        ...(social?.recreational || {}),
                        hobbies: e.target.value.split(',').map((h: string) => h.trim()).filter((h: string) => h)
                      }
                    })}
                    placeholder="Comma-separated hobbies"
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Social Activities</Label>
                  <Textarea
                    value={(social?.recreational?.socialActivities || []).join(', ')}
                    onChange={(e) => onSocialChange({
                      ...social,
                      recreational: {
                        ...(social?.recreational || {}),
                        socialActivities: e.target.value.split(',').map((a: string) => a.trim()).filter((a: string) => a)
                      }
                    })}
                    placeholder="Comma-separated activities"
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Exercise Routine</Label>
                  <Input
                    value={social?.recreational?.exercise || ''}
                    onChange={(e) => onSocialChange({
                      ...social,
                      recreational: { ...(social?.recreational || {}), exercise: e.target.value }
                    })}
                    placeholder="Type and frequency of exercise"
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <Label>Spiritual/Religious</Label>
                  <Switch
                    checked={social?.spiritual?.spiritualOrReligious || false}
                    onCheckedChange={(v) => onSocialChange({
                      ...social,
                      spiritual: { ...(social?.spiritual || {}), spiritualOrReligious: v }
                    })}
                  />
                </div>

                {social?.spiritual?.spiritualOrReligious && (
                  <>
                    <div>
                      <Label>Importance</Label>
                      <Select
                        value={social?.spiritual?.importance}
                        onValueChange={(v) => onSocialChange({
                          ...social,
                          spiritual: { ...(social?.spiritual || {}), importance: v }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Very Important">Very Important</SelectItem>
                          <SelectItem value="Somewhat Important">Somewhat Important</SelectItem>
                          <SelectItem value="Not Important">Not Important</SelectItem>
                          <SelectItem value="N/A">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Practice Type</Label>
                      <Input
                        value={social?.spiritual?.practiceType || ''}
                        onChange={(e) => onSocialChange({
                          ...social,
                          spiritual: { ...(social?.spiritual || {}), practiceType: e.target.value }
                        })}
                        placeholder="Religion, meditation, etc."
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Support from Community</Label>
                      <Switch
                        checked={social?.spiritual?.supportFromCommunity || false}
                        onCheckedChange={(v) => onSocialChange({
                          ...social,
                          spiritual: { ...(social?.spiritual || {}), supportFromCommunity: v }
                        })}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cultural Tab */}
          <TabsContent value="cultural" className="space-y-4">
            <div>
              <Label>Cultural Identity</Label>
              <Textarea
                value={cultural?.culturalIdentity || ''}
                onChange={(e) => onCulturalChange({ ...cultural, culturalIdentity: e.target.value })}
                placeholder="How does the client identify culturally?"
                rows={3}
              />
            </div>

            <div>
              <Label>Cultural Factors in Treatment</Label>
              <Textarea
                value={cultural?.culturalFactorsInTreatment || ''}
                onChange={(e) => onCulturalChange({ ...cultural, culturalFactorsInTreatment: e.target.value })}
                placeholder="How do cultural factors influence treatment approach, preferences, or concerns?"
                rows={4}
              />
            </div>

            <Separator />

            <div>
              <Label>Immigration History</Label>
              <Textarea
                value={cultural?.immigrationHistory || ''}
                onChange={(e) => onCulturalChange({ ...cultural, immigrationHistory: e.target.value })}
                placeholder="Immigration status, country of origin, years in country..."
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Acculturative Stress</Label>
              <Switch
                checked={cultural?.acculturativeStress || false}
                onCheckedChange={(v) => onCulturalChange({ ...cultural, acculturativeStress: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Experiences of Discrimination</Label>
              <Switch
                checked={cultural?.discrimination || false}
                onCheckedChange={(v) => onCulturalChange({ ...cultural, discrimination: v })}
              />
            </div>

            {cultural?.discrimination && (
              <div>
                <Label>Discrimination Details</Label>
                <Textarea
                  value={cultural?.discriminationDetails || ''}
                  onChange={(e) => onCulturalChange({ ...cultural, discriminationDetails: e.target.value })}
                  placeholder="Describe experiences of discrimination and their impact..."
                  rows={4}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
