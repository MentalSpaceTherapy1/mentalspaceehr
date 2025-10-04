import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, X, ChevronsUpDown, Check, Sparkles, Loader2 } from 'lucide-react';
import { icd10MentalHealthCodes, searchICD10Codes } from '@/lib/icd10Codes';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DiagnosticFormulationProps {
  data: any;
  clinicianImpression: string;
  strengthsAndResources: string[];
  onDiagnosisChange: (data: any) => void;
  onImpressionChange: (impression: string) => void;
  onStrengthsChange: (strengths: string[]) => void;
  intakeData?: any;
  clientId?: string;
}

export function DiagnosticFormulationSection({
  data,
  clinicianImpression,
  strengthsAndResources,
  onDiagnosisChange,
  onImpressionChange,
  onStrengthsChange,
  intakeData,
  clientId
}: DiagnosticFormulationProps) {
  const [newStrength, setNewStrength] = useState('');
  const [openPopoverIndex, setOpenPopoverIndex] = useState<number | null>(null);
  const [searchValues, setSearchValues] = useState<{ [key: number]: string }>({});
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);
  const { toast } = useToast();

  const addDiagnosis = () => {
    const diagnoses = data.diagnoses || [];
    onDiagnosisChange({
      ...data,
      diagnoses: [...diagnoses, { icdCode: '', diagnosis: '', type: 'Principal', specifiers: '' }]
    });
  };

  const removeDiagnosis = (index: number) => {
    const diagnoses = [...(data.diagnoses || [])];
    diagnoses.splice(index, 1);
    onDiagnosisChange({ ...data, diagnoses });
  };

  const updateDiagnosis = (index: number, field: string, value: string) => {
    const diagnoses = [...(data.diagnoses || [])];
    diagnoses[index] = { ...diagnoses[index], [field]: value };
    onDiagnosisChange({ ...data, diagnoses });
  };

  const addStrength = () => {
    if (newStrength.trim()) {
      onStrengthsChange([...(strengthsAndResources || []), newStrength.trim()]);
      setNewStrength('');
    }
  };

  const removeStrength = (index: number) => {
    const strengths = [...(strengthsAndResources || [])];
    strengths.splice(index, 1);
    onStrengthsChange(strengths);
  };

  const handleAISuggestDiagnoses = async () => {
    if (!clientId) {
      toast({
        title: 'Error',
        description: 'No client selected',
        variant: 'destructive'
      });
      return;
    }

    try {
      setGeneratingSuggestions(true);
      
      // Prepare clinical content from intake data
      const clinicalContent = JSON.stringify({
        chiefComplaint: intakeData?.chiefComplaint,
        historyOfPresentingProblem: intakeData?.historyOfPresentingProblem,
        currentSymptoms: intakeData?.currentSymptoms,
        mentalStatusExam: intakeData?.mentalStatusExam,
        safetyAssessment: intakeData?.safetyAssessment,
        histories: {
          developmental: intakeData?.developmentalHistory,
          family: intakeData?.familyHistory,
          medical: intakeData?.medicalHistory,
          substance: intakeData?.substanceUseHistory,
          social: intakeData?.socialHistory
        },
        clinicianImpression
      });

      const { data: suggestions, error } = await supabase.functions.invoke('suggest-clinical-content', {
        body: {
          content: clinicalContent,
          suggestionType: 'diagnoses',
          clientId
        }
      });

      if (error) throw error;

      if (suggestions?.suggestions?.diagnoses) {
        // Add AI-suggested diagnoses
        const newDiagnoses = suggestions.suggestions.diagnoses.map((diag: any) => ({
          icdCode: diag.code,
          diagnosis: diag.description,
          type: diag.type || 'Principal',
          specifiers: diag.specifiers || ''
        }));

        onDiagnosisChange({
          ...data,
          diagnoses: [...(data.diagnoses || []), ...newDiagnoses]
        });

        toast({
          title: 'AI Suggestions Added',
          description: `Added ${newDiagnoses.length} diagnosis suggestion(s) based on assessment data`,
        });
      }
    } catch (error: any) {
      console.error('Error getting AI diagnosis suggestions:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate diagnosis suggestions',
        variant: 'destructive'
      });
    } finally {
      setGeneratingSuggestions(false);
    }
  };

  const selectICD10Code = (index: number, code: string, description: string) => {
    updateDiagnosis(index, 'icdCode', code);
    updateDiagnosis(index, 'diagnosis', description);
    setOpenPopoverIndex(null);
    setSearchValues(prev => ({ ...prev, [index]: '' }));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Clinical Impression</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={clinicianImpression || ''}
            onChange={(e) => onImpressionChange(e.target.value)}
            placeholder="Comprehensive narrative summary integrating all assessment data..."
            rows={6}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Diagnoses</CardTitle>
          <div className="flex gap-2">
            <Button 
              onClick={handleAISuggestDiagnoses} 
              size="sm" 
              variant="outline"
              disabled={generatingSuggestions || !clientId}
            >
              {generatingSuggestions ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Suggest
                </>
              )}
            </Button>
            <Button onClick={addDiagnosis} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Diagnosis
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(data.diagnoses || []).map((diagnosis: any, index: number) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <h4 className="font-medium">Diagnosis {index + 1}</h4>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDiagnosis(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>ICD-10 Code & Diagnosis</Label>
                  <Popover 
                    open={openPopoverIndex === index} 
                    onOpenChange={(open) => setOpenPopoverIndex(open ? index : null)}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openPopoverIndex === index}
                        className="w-full justify-between"
                      >
                        {diagnosis.icdCode ? (
                          <span className="truncate">
                            <span className="font-mono font-bold">{diagnosis.icdCode}</span>
                            {diagnosis.diagnosis && ` - ${diagnosis.diagnosis.substring(0, 40)}${diagnosis.diagnosis.length > 40 ? '...' : ''}`}
                          </span>
                        ) : (
                          'Search ICD-10 codes...'
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[500px] p-0">
                      <Command>
                        <CommandInput 
                          placeholder="Search by code, diagnosis, or category..." 
                          value={searchValues[index] || ''}
                          onValueChange={(value) => setSearchValues(prev => ({ ...prev, [index]: value }))}
                        />
                        <CommandList>
                          <CommandEmpty>No diagnosis codes found.</CommandEmpty>
                          <CommandGroup>
                            {searchICD10Codes(searchValues[index] || '').slice(0, 100).map((code) => (
                              <CommandItem
                                key={code.code}
                                value={`${code.code} ${code.description}`}
                                onSelect={() => selectICD10Code(index, code.code, code.description)}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    diagnosis.icdCode === code.code ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold">{code.code}</span>
                                    <span className="text-xs text-muted-foreground">{code.category}</span>
                                  </div>
                                  <span className="text-sm">{code.description}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground mt-1">
                    Or type manually below
                  </p>
                  <Input
                    value={diagnosis.icdCode || ''}
                    onChange={(e) => updateDiagnosis(index, 'icdCode', e.target.value)}
                    placeholder="F41.1"
                    className="mt-2 font-mono"
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <select
                    value={diagnosis.type || 'Principal'}
                    onChange={(e) => updateDiagnosis(index, 'type', e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3"
                  >
                    <option value="Principal">Principal</option>
                    <option value="Secondary">Secondary</option>
                    <option value="Rule Out">Rule Out</option>
                    <option value="Provisional">Provisional</option>
                  </select>
                </div>
              </div>
              <div>
                <Label>Diagnosis</Label>
                <Input
                  value={diagnosis.diagnosis || ''}
                  onChange={(e) => updateDiagnosis(index, 'diagnosis', e.target.value)}
                  placeholder="Major Depressive Disorder"
                />
              </div>
              <div>
                <Label>Specifiers</Label>
                <Input
                  value={diagnosis.specifiers || ''}
                  onChange={(e) => updateDiagnosis(index, 'specifiers', e.target.value)}
                  placeholder="Moderate, Recurrent"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Strengths & Resources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newStrength}
              onChange={(e) => setNewStrength(e.target.value)}
              placeholder="Add a strength or resource..."
              onKeyPress={(e) => e.key === 'Enter' && addStrength()}
            />
            <Button onClick={addStrength}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {(strengthsAndResources || []).map((strength, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded">
                <span>{strength}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeStrength(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
