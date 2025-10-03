import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RecurringAppointmentFormProps {
  isRecurring: boolean;
  onIsRecurringChange: (value: boolean) => void;
  recurrencePattern?: {
    frequency: string;
    interval: number;
    daysOfWeek?: string[];
    endDate?: Date;
    numberOfOccurrences?: number;
  };
  onRecurrencePatternChange: (pattern: any) => void;
}

const DAYS_OF_WEEK = [
  { value: 'Sunday', label: 'Sun' },
  { value: 'Monday', label: 'Mon' },
  { value: 'Tuesday', label: 'Tue' },
  { value: 'Wednesday', label: 'Wed' },
  { value: 'Thursday', label: 'Thu' },
  { value: 'Friday', label: 'Fri' },
  { value: 'Saturday', label: 'Sat' },
];

export function RecurringAppointmentForm({
  isRecurring,
  onIsRecurringChange,
  recurrencePattern = {
    frequency: 'Weekly',
    interval: 1,
    daysOfWeek: [],
  },
  onRecurrencePatternChange,
}: RecurringAppointmentFormProps) {
  const [endCondition, setEndCondition] = useState<'endDate' | 'occurrences'>(
    recurrencePattern.endDate ? 'endDate' : 'occurrences'
  );

  const handleFrequencyChange = (frequency: string) => {
    onRecurrencePatternChange({
      ...recurrencePattern,
      frequency,
      daysOfWeek: frequency === 'Daily' || frequency === 'Monthly' ? undefined : [],
    });
  };

  const handleIntervalChange = (value: string) => {
    const interval = parseInt(value);
    if (!isNaN(interval) && interval > 0) {
      onRecurrencePatternChange({
        ...recurrencePattern,
        interval,
      });
    }
  };

  const getMaxDays = () => {
    if (recurrencePattern.frequency === 'Weekly') return 1;
    if (recurrencePattern.frequency === 'TwiceWeekly') return 2;
    return 7; // For Biweekly
  };

  const handleDayToggle = (day: string) => {
    const currentDays = recurrencePattern.daysOfWeek || [];
    const maxDays = getMaxDays();
    
    if (currentDays.includes(day)) {
      // Always allow removal
      const newDays = currentDays.filter((d) => d !== day);
      onRecurrencePatternChange({
        ...recurrencePattern,
        daysOfWeek: newDays,
      });
    } else {
      // Check if we can add more days
      if (currentDays.length < maxDays) {
        const newDays = [...currentDays, day];
        onRecurrencePatternChange({
          ...recurrencePattern,
          daysOfWeek: newDays,
        });
      }
    }
  };

  const isValidDaySelection = () => {
    const currentDays = recurrencePattern.daysOfWeek || [];
    const maxDays = getMaxDays();
    
    if (recurrencePattern.frequency === 'Weekly') {
      return currentDays.length === 1;
    }
    if (recurrencePattern.frequency === 'TwiceWeekly') {
      return currentDays.length === 2;
    }
    return true; // Biweekly can have any number
  };

  const handleEndConditionChange = (value: 'endDate' | 'occurrences') => {
    setEndCondition(value);
    if (value === 'endDate') {
      onRecurrencePatternChange({
        ...recurrencePattern,
        numberOfOccurrences: undefined,
      });
    } else {
      onRecurrencePatternChange({
        ...recurrencePattern,
        endDate: undefined,
      });
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    onRecurrencePatternChange({
      ...recurrencePattern,
      endDate: date,
    });
  };

  const handleOccurrencesChange = (value: string) => {
    const occurrences = parseInt(value);
    if (!isNaN(occurrences) && occurrences > 0) {
      onRecurrencePatternChange({
        ...recurrencePattern,
        numberOfOccurrences: occurrences,
      });
    }
  };

  const showDaysOfWeek = 
    recurrencePattern.frequency === 'Weekly' || 
    recurrencePattern.frequency === 'TwiceWeekly' || 
    recurrencePattern.frequency === 'Biweekly';

  const getDaySelectionHint = () => {
    if (recurrencePattern.frequency === 'Weekly') {
      return 'Select exactly 1 day';
    }
    if (recurrencePattern.frequency === 'TwiceWeekly') {
      return 'Select exactly 2 days';
    }
    return 'Select days to repeat on';
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="is-recurring"
          checked={isRecurring}
          onCheckedChange={onIsRecurringChange}
        />
        <Label htmlFor="is-recurring" className="font-semibold text-base cursor-pointer">
          Make this a recurring appointment
        </Label>
      </div>

      {isRecurring && (
        <div className="space-y-4 pl-6 border-l-2 border-primary/30">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Frequency</Label>
              <Select
                value={recurrencePattern.frequency}
                onValueChange={handleFrequencyChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="Daily">Daily</SelectItem>
                  <SelectItem value="Weekly">Weekly (1x per week)</SelectItem>
                  <SelectItem value="TwiceWeekly">Twice a Week (2x per week)</SelectItem>
                  <SelectItem value="Biweekly">Biweekly (Every 2 weeks)</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Every {recurrencePattern.interval} {recurrencePattern.frequency.toLowerCase()}
              </Label>
              <Input
                type="number"
                min="1"
                value={recurrencePattern.interval}
                onChange={(e) => handleIntervalChange(e.target.value)}
                placeholder="1"
              />
            </div>
          </div>

          {showDaysOfWeek && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Repeat on</Label>
                <span className="text-xs text-muted-foreground">
                  {getDaySelectionHint()}
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected = (recurrencePattern.daysOfWeek || []).includes(day.value);
                  const currentDays = recurrencePattern.daysOfWeek || [];
                  const maxDays = getMaxDays();
                  const canAdd = currentDays.length < maxDays;
                  
                  return (
                    <Button
                      key={day.value}
                      type="button"
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleDayToggle(day.value)}
                      disabled={!isSelected && !canAdd}
                      className="w-12"
                    >
                      {day.label}
                    </Button>
                  );
                })}
              </div>
              {!isValidDaySelection() && (
                <p className="text-sm text-destructive">
                  {recurrencePattern.frequency === 'Weekly' && 'Please select exactly 1 day'}
                  {recurrencePattern.frequency === 'TwiceWeekly' && 'Please select exactly 2 days'}
                </p>
              )}
            </div>
          )}

          <div className="space-y-3">
            <Label className="text-sm font-medium">Ends</Label>
            <RadioGroup value={endCondition} onValueChange={handleEndConditionChange}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="endDate" id="end-date" />
                <Label htmlFor="end-date" className="cursor-pointer flex items-center gap-2">
                  On
                  {endCondition === 'endDate' && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            'justify-start text-left font-normal',
                            !recurrencePattern.endDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {recurrencePattern.endDate
                            ? format(recurrencePattern.endDate, 'PPP')
                            : 'Pick end date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
                        <Calendar
                          mode="single"
                          selected={recurrencePattern.endDate}
                          onSelect={handleEndDateChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                          className={cn('p-3 pointer-events-auto')}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="occurrences" id="occurrences" />
                <Label htmlFor="occurrences" className="cursor-pointer flex items-center gap-2">
                  After
                  {endCondition === 'occurrences' && (
                    <Input
                      type="number"
                      min="1"
                      value={recurrencePattern.numberOfOccurrences || 10}
                      onChange={(e) => handleOccurrencesChange(e.target.value)}
                      className="w-20 h-8"
                    />
                  )}
                  occurrences
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      )}
    </div>
  );
}
