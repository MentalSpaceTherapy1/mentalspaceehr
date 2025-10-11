/**
 * CPT Code Search Component
 *
 * Searchable autocomplete for CPT codes with descriptions
 */

import { useState, useEffect, useMemo } from 'react';
import { Search, Check, ChevronsUpDown } from 'lucide-react';
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

export interface CPTCode {
  code: string;
  description: string;
  category?: string;
  price?: number;
}

interface CPTCodeSearchProps {
  value?: string;
  onChange: (code: string) => void;
  placeholder?: string;
  category?: 'psychotherapy' | 'diagnostic' | 'family' | 'group' | 'all';
}

// Comprehensive CPT code database for mental health
const CPT_CODES_DATABASE: CPTCode[] = [
  // Diagnostic Evaluation
  { code: '90791', description: 'Psychiatric diagnostic evaluation', category: 'diagnostic', price: 200 },
  { code: '90792', description: 'Psychiatric diagnostic evaluation with medical services', category: 'diagnostic', price: 250 },

  // Individual Psychotherapy
  { code: '90832', description: 'Psychotherapy, 30 minutes', category: 'psychotherapy', price: 100 },
  { code: '90834', description: 'Psychotherapy, 45 minutes', category: 'psychotherapy', price: 150 },
  { code: '90837', description: 'Psychotherapy, 60 minutes', category: 'psychotherapy', price: 200 },

  // Psychotherapy with E/M
  { code: '90833', description: 'Psychotherapy, 30 minutes with E/M', category: 'psychotherapy', price: 120 },
  { code: '90836', description: 'Psychotherapy, 45 minutes with E/M', category: 'psychotherapy', price: 170 },
  { code: '90838', description: 'Psychotherapy, 60 minutes with E/M', category: 'psychotherapy', price: 220 },

  // Crisis Psychotherapy
  { code: '90839', description: 'Psychotherapy for crisis, first 60 minutes', category: 'psychotherapy', price: 250 },
  { code: '90840', description: 'Psychotherapy for crisis, each additional 30 minutes', category: 'psychotherapy', price: 125 },

  // Family Psychotherapy
  { code: '90846', description: 'Family psychotherapy without patient present', category: 'family', price: 150 },
  { code: '90847', description: 'Family psychotherapy with patient present', category: 'family', price: 175 },
  { code: '90849', description: 'Multiple-family group psychotherapy', category: 'family', price: 100 },

  // Group Psychotherapy
  { code: '90853', description: 'Group psychotherapy (not family)', category: 'group', price: 75 },

  // Interactive Complexity
  { code: '90785', description: 'Interactive complexity add-on', category: 'psychotherapy', price: 30 },

  // Medication Management
  { code: '90863', description: 'Pharmacologic management', category: 'diagnostic', price: 80 },

  // Health Behavior Assessment
  { code: '96156', description: 'Health behavior assessment, initial', category: 'diagnostic', price: 150 },
  { code: '96158', description: 'Health behavior assessment, re-assessment', category: 'diagnostic', price: 100 },

  // Health Behavior Intervention
  { code: '96164', description: 'Health behavior intervention, individual, 30 min', category: 'psychotherapy', price: 90 },
  { code: '96165', description: 'Health behavior intervention, group, 30 min', category: 'group', price: 60 },
  { code: '96167', description: 'Health behavior intervention, family with patient, 30 min', category: 'family', price: 100 },
  { code: '96168', description: 'Health behavior intervention, family without patient, 30 min', category: 'family', price: 100 },

  // Neuropsychological Testing
  { code: '96116', description: 'Neurobehavioral status exam', category: 'diagnostic', price: 200 },
  { code: '96121', description: 'Neurobehavioral status exam (add-on)', category: 'diagnostic', price: 100 },

  // Psychological Testing
  { code: '96130', description: 'Psychological testing evaluation, first hour', category: 'diagnostic', price: 200 },
  { code: '96131', description: 'Psychological testing evaluation, each additional hour', category: 'diagnostic', price: 150 },
  { code: '96136', description: 'Psychological test administration, first 30 minutes', category: 'diagnostic', price: 100 },
  { code: '96137', description: 'Psychological test administration, each additional 30 minutes', category: 'diagnostic', price: 75 },

  // Autism Spectrum Disorder
  { code: '97151', description: 'Behavior identification assessment', category: 'diagnostic', price: 300 },
  { code: '97152', description: 'Behavior identification assessment, each additional 15 minutes', category: 'diagnostic', price: 75 },
  { code: '97153', description: 'Adaptive behavior treatment by protocol', category: 'psychotherapy', price: 60 },
  { code: '97154', description: 'Group adaptive behavior treatment by protocol', category: 'group', price: 40 },
  { code: '97155', description: 'Adaptive behavior treatment with protocol modification', category: 'psychotherapy', price: 80 },
  { code: '97156', description: 'Family adaptive behavior treatment guidance', category: 'family', price: 90 },
  { code: '97157', description: 'Multiple-family group adaptive behavior treatment guidance', category: 'family', price: 60 },
  { code: '97158', description: 'Group adaptive behavior treatment with protocol modification', category: 'group', price: 60 },

  // Telehealth
  { code: '90785', description: 'Interactive complexity (telehealth)', category: 'psychotherapy', price: 30 },

  // Collaborative Care
  { code: '99492', description: 'Initial psychiatric collaborative care management, first 70 minutes', category: 'diagnostic', price: 200 },
  { code: '99493', description: 'Subsequent psychiatric collaborative care, first 60 minutes', category: 'diagnostic', price: 150 },
  { code: '99494', description: 'Initial/subsequent psychiatric collaborative care, each additional 30 minutes', category: 'diagnostic', price: 75 },
];

export function CPTCodeSearch({
  value,
  onChange,
  placeholder = 'Search CPT codes...',
  category = 'all',
}: CPTCodeSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCodes = useMemo(() => {
    let codes = CPT_CODES_DATABASE;

    // Filter by category
    if (category !== 'all') {
      codes = codes.filter((c) => c.category === category);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      codes = codes.filter(
        (c) =>
          c.code.includes(query) ||
          c.description.toLowerCase().includes(query) ||
          c.category?.toLowerCase().includes(query)
      );
    }

    return codes;
  }, [category, searchQuery]);

  const selectedCode = CPT_CODES_DATABASE.find((c) => c.code === value);

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
              <Badge variant="outline">{selectedCode.code}</Badge>
              <span className="truncate">{selectedCode.description}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search by code or description..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandEmpty>No CPT codes found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {filteredCodes.map((cptCode) => (
              <CommandItem
                key={cptCode.code}
                value={cptCode.code}
                onSelect={(currentValue) => {
                  onChange(currentValue === value ? '' : currentValue);
                  setOpen(false);
                }}
                className="flex items-center gap-2 py-3"
              >
                <Check
                  className={cn(
                    'h-4 w-4',
                    value === cptCode.code ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {cptCode.code}
                    </Badge>
                    {cptCode.category && (
                      <Badge variant="outline" className="text-xs">
                        {cptCode.category}
                      </Badge>
                    )}
                    {cptCode.price && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        ${cptCode.price}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{cptCode.description}</p>
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
export { CPT_CODES_DATABASE };
