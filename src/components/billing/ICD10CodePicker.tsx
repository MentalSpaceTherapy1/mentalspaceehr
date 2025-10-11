/**
 * ICD-10 Code Picker Component
 *
 * Searchable autocomplete for ICD-10 diagnosis codes
 */

import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

export interface ICD10Code {
  code: string;
  description: string;
  category?: string;
}

interface ICD10CodePickerProps {
  value?: string;
  onChange: (code: string) => void;
  placeholder?: string;
  category?: 'anxiety' | 'depression' | 'trauma' | 'bipolar' | 'adhd' | 'substance' | 'all';
}

// Comprehensive ICD-10 code database for mental health
const ICD10_CODES_DATABASE: ICD10Code[] = [
  // Anxiety Disorders (F40-F48)
  { code: 'F40.00', description: 'Agoraphobia, unspecified', category: 'anxiety' },
  { code: 'F40.01', description: 'Agoraphobia with panic disorder', category: 'anxiety' },
  { code: 'F40.10', description: 'Social phobia, unspecified', category: 'anxiety' },
  { code: 'F40.11', description: 'Social phobia, generalized', category: 'anxiety' },
  { code: 'F40.210', description: 'Animal type phobia', category: 'anxiety' },
  { code: 'F40.218', description: 'Other natural environment type phobia', category: 'anxiety' },
  { code: 'F40.220', description: 'Blood phobia', category: 'anxiety' },
  { code: 'F40.228', description: 'Other injury phobia', category: 'anxiety' },
  { code: 'F40.230', description: 'Fear of thunderstorms', category: 'anxiety' },
  { code: 'F40.231', description: 'Fear of flying', category: 'anxiety' },
  { code: 'F40.232', description: 'Fear of heights', category: 'anxiety' },
  { code: 'F40.233', description: 'Fear of enclosed spaces', category: 'anxiety' },
  { code: 'F40.248', description: 'Other situational type phobia', category: 'anxiety' },
  { code: 'F41.0', description: 'Panic disorder [episodic paroxysmal anxiety]', category: 'anxiety' },
  { code: 'F41.1', description: 'Generalized anxiety disorder', category: 'anxiety' },
  { code: 'F41.3', description: 'Other mixed anxiety disorders', category: 'anxiety' },
  { code: 'F41.8', description: 'Other specified anxiety disorders', category: 'anxiety' },
  { code: 'F41.9', description: 'Anxiety disorder, unspecified', category: 'anxiety' },
  { code: 'F42.2', description: 'Mixed obsessional thoughts and acts', category: 'anxiety' },
  { code: 'F42.3', description: 'Hoarding disorder', category: 'anxiety' },
  { code: 'F42.4', description: 'Excoriation (skin-picking) disorder', category: 'anxiety' },
  { code: 'F42.8', description: 'Other obsessive-compulsive disorder', category: 'anxiety' },
  { code: 'F42.9', description: 'Obsessive-compulsive disorder, unspecified', category: 'anxiety' },

  // Depressive Disorders (F32-F33)
  { code: 'F32.0', description: 'Major depressive disorder, single episode, mild', category: 'depression' },
  { code: 'F32.1', description: 'Major depressive disorder, single episode, moderate', category: 'depression' },
  { code: 'F32.2', description: 'Major depressive disorder, single episode, severe without psychotic features', category: 'depression' },
  { code: 'F32.3', description: 'Major depressive disorder, single episode, severe with psychotic features', category: 'depression' },
  { code: 'F32.4', description: 'Major depressive disorder, single episode, in partial remission', category: 'depression' },
  { code: 'F32.5', description: 'Major depressive disorder, single episode, in full remission', category: 'depression' },
  { code: 'F32.9', description: 'Major depressive disorder, single episode, unspecified', category: 'depression' },
  { code: 'F33.0', description: 'Major depressive disorder, recurrent, mild', category: 'depression' },
  { code: 'F33.1', description: 'Major depressive disorder, recurrent, moderate', category: 'depression' },
  { code: 'F33.2', description: 'Major depressive disorder, recurrent severe without psychotic features', category: 'depression' },
  { code: 'F33.3', description: 'Major depressive disorder, recurrent, severe with psychotic symptoms', category: 'depression' },
  { code: 'F33.40', description: 'Major depressive disorder, recurrent, in remission, unspecified', category: 'depression' },
  { code: 'F33.41', description: 'Major depressive disorder, recurrent, in partial remission', category: 'depression' },
  { code: 'F33.42', description: 'Major depressive disorder, recurrent, in full remission', category: 'depression' },
  { code: 'F33.9', description: 'Major depressive disorder, recurrent, unspecified', category: 'depression' },
  { code: 'F34.1', description: 'Dysthymic disorder (Persistent depressive disorder)', category: 'depression' },

  // Trauma and Stressor Related Disorders (F43)
  { code: 'F43.0', description: 'Acute stress reaction', category: 'trauma' },
  { code: 'F43.10', description: 'Post-traumatic stress disorder, unspecified', category: 'trauma' },
  { code: 'F43.11', description: 'Post-traumatic stress disorder, acute', category: 'trauma' },
  { code: 'F43.12', description: 'Post-traumatic stress disorder, chronic', category: 'trauma' },
  { code: 'F43.20', description: 'Adjustment disorder, unspecified', category: 'trauma' },
  { code: 'F43.21', description: 'Adjustment disorder with depressed mood', category: 'trauma' },
  { code: 'F43.22', description: 'Adjustment disorder with anxiety', category: 'trauma' },
  { code: 'F43.23', description: 'Adjustment disorder with mixed anxiety and depressed mood', category: 'trauma' },
  { code: 'F43.24', description: 'Adjustment disorder with disturbance of conduct', category: 'trauma' },
  { code: 'F43.25', description: 'Adjustment disorder with mixed disturbance of emotions and conduct', category: 'trauma' },
  { code: 'F43.29', description: 'Adjustment disorder with other symptoms', category: 'trauma' },

  // Bipolar Disorders (F30-F31)
  { code: 'F30.10', description: 'Manic episode without psychotic symptoms, unspecified', category: 'bipolar' },
  { code: 'F30.11', description: 'Manic episode without psychotic symptoms, mild', category: 'bipolar' },
  { code: 'F30.12', description: 'Manic episode without psychotic symptoms, moderate', category: 'bipolar' },
  { code: 'F30.13', description: 'Manic episode, severe, without psychotic symptoms', category: 'bipolar' },
  { code: 'F30.2', description: 'Manic episode, severe with psychotic symptoms', category: 'bipolar' },
  { code: 'F31.0', description: 'Bipolar disorder, current episode hypomanic', category: 'bipolar' },
  { code: 'F31.10', description: 'Bipolar disorder, current episode manic without psychotic features, unspecified', category: 'bipolar' },
  { code: 'F31.11', description: 'Bipolar disorder, current episode manic without psychotic features, mild', category: 'bipolar' },
  { code: 'F31.12', description: 'Bipolar disorder, current episode manic without psychotic features, moderate', category: 'bipolar' },
  { code: 'F31.13', description: 'Bipolar disorder, current episode manic without psychotic features, severe', category: 'bipolar' },
  { code: 'F31.2', description: 'Bipolar disorder, current episode manic severe with psychotic features', category: 'bipolar' },
  { code: 'F31.30', description: 'Bipolar disorder, current episode depressed, mild or moderate severity, unspecified', category: 'bipolar' },
  { code: 'F31.31', description: 'Bipolar disorder, current episode depressed, mild', category: 'bipolar' },
  { code: 'F31.32', description: 'Bipolar disorder, current episode depressed, moderate', category: 'bipolar' },
  { code: 'F31.4', description: 'Bipolar disorder, current episode depressed, severe, without psychotic features', category: 'bipolar' },
  { code: 'F31.5', description: 'Bipolar disorder, current episode depressed, severe, with psychotic features', category: 'bipolar' },
  { code: 'F31.9', description: 'Bipolar disorder, unspecified', category: 'bipolar' },

  // ADHD (F90)
  { code: 'F90.0', description: 'Attention-deficit hyperactivity disorder, predominantly inattentive type', category: 'adhd' },
  { code: 'F90.1', description: 'Attention-deficit hyperactivity disorder, predominantly hyperactive type', category: 'adhd' },
  { code: 'F90.2', description: 'Attention-deficit hyperactivity disorder, combined type', category: 'adhd' },
  { code: 'F90.8', description: 'Attention-deficit hyperactivity disorder, other type', category: 'adhd' },
  { code: 'F90.9', description: 'Attention-deficit hyperactivity disorder, unspecified type', category: 'adhd' },

  // Substance Use Disorders (F10-F19)
  { code: 'F10.10', description: 'Alcohol abuse, uncomplicated', category: 'substance' },
  { code: 'F10.11', description: 'Alcohol abuse, in remission', category: 'substance' },
  { code: 'F10.20', description: 'Alcohol dependence, uncomplicated', category: 'substance' },
  { code: 'F10.21', description: 'Alcohol dependence, in remission', category: 'substance' },
  { code: 'F11.10', description: 'Opioid abuse, uncomplicated', category: 'substance' },
  { code: 'F11.20', description: 'Opioid dependence, uncomplicated', category: 'substance' },
  { code: 'F11.21', description: 'Opioid dependence, in remission', category: 'substance' },
  { code: 'F12.10', description: 'Cannabis abuse, uncomplicated', category: 'substance' },
  { code: 'F12.20', description: 'Cannabis dependence, uncomplicated', category: 'substance' },
  { code: 'F13.10', description: 'Sedative, hypnotic or anxiolytic abuse, uncomplicated', category: 'substance' },
  { code: 'F13.20', description: 'Sedative, hypnotic or anxiolytic dependence, uncomplicated', category: 'substance' },
  { code: 'F14.10', description: 'Cocaine abuse, uncomplicated', category: 'substance' },
  { code: 'F14.20', description: 'Cocaine dependence, uncomplicated', category: 'substance' },
  { code: 'F15.10', description: 'Other stimulant abuse, uncomplicated', category: 'substance' },
  { code: 'F15.20', description: 'Other stimulant dependence, uncomplicated', category: 'substance' },

  // Personality Disorders (F60)
  { code: 'F60.0', description: 'Paranoid personality disorder', category: 'all' },
  { code: 'F60.1', description: 'Schizoid personality disorder', category: 'all' },
  { code: 'F60.2', description: 'Antisocial personality disorder', category: 'all' },
  { code: 'F60.3', description: 'Borderline personality disorder', category: 'all' },
  { code: 'F60.4', description: 'Histrionic personality disorder', category: 'all' },
  { code: 'F60.5', description: 'Obsessive-compulsive personality disorder', category: 'all' },
  { code: 'F60.6', description: 'Avoidant personality disorder', category: 'all' },
  { code: 'F60.7', description: 'Dependent personality disorder', category: 'all' },
  { code: 'F60.81', description: 'Narcissistic personality disorder', category: 'all' },

  // Autism Spectrum (F84)
  { code: 'F84.0', description: 'Autistic disorder', category: 'all' },
  { code: 'F84.5', description: "Asperger's syndrome", category: 'all' },

  // Other Common Codes
  { code: 'Z63.0', description: 'Problems in relationship with spouse or partner', category: 'all' },
  { code: 'Z63.5', description: 'Disruption of family by separation or divorce', category: 'all' },
  { code: 'Z65.0', description: 'Conviction in civil and criminal proceedings without imprisonment', category: 'all' },
  { code: 'Z65.1', description: 'Imprisonment and other incarceration', category: 'all' },
  { code: 'Z65.2', description: 'Problems related to release from prison', category: 'all' },
  { code: 'Z65.3', description: 'Problems related to other legal circumstances', category: 'all' },
];

export function ICD10CodePicker({
  value,
  onChange,
  placeholder = 'Search ICD-10 codes...',
  category = 'all',
}: ICD10CodePickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCodes = useMemo(() => {
    let codes = ICD10_CODES_DATABASE;

    // Filter by category
    if (category !== 'all') {
      codes = codes.filter((c) => c.category === category || c.category === 'all');
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      codes = codes.filter(
        (c) =>
          c.code.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query) ||
          c.category?.toLowerCase().includes(query)
      );
    }

    return codes;
  }, [category, searchQuery]);

  const selectedCode = ICD10_CODES_DATABASE.find((c) => c.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedCode ? (
            <span className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {selectedCode.code}
              </Badge>
              <span className="truncate">{selectedCode.description}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[550px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search by code or description..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandEmpty>No ICD-10 codes found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {filteredCodes.map((icd10Code) => (
              <CommandItem
                key={icd10Code.code}
                value={icd10Code.code}
                onSelect={(currentValue) => {
                  onChange(currentValue === value ? '' : currentValue);
                  setOpen(false);
                }}
                className="flex items-center gap-2 py-3"
              >
                <Check
                  className={cn(
                    'h-4 w-4',
                    value === icd10Code.code ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {icd10Code.code}
                    </Badge>
                    {icd10Code.category && icd10Code.category !== 'all' && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {icd10Code.category}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{icd10Code.description}</p>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Export the database for use in other components
export { ICD10_CODES_DATABASE };
