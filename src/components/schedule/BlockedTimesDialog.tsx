import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { CalendarIcon, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RecurrencePattern } from '@/lib/recurringAppointments';

interface BlockedTimesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicianId: string;
  onSave: (blockedTime: any) => Promise<void>;
  blockedTime?: any;
}

const BLOCK_TYPES = [
  'PTO',
  'Vacation',
  'Sick Leave',
  'Meeting',
  'Lunch',
  'Training',
  'Conference',
  'Personal',
  'Other'
];

export function BlockedTimesDialog({
  open,
  onOpenChange,
  clinicianId,
  onSave,
  blockedTime
}: BlockedTimesDialogProps) {
  const [title, setTitle] = useState('');
  const [blockType, setBlockType] = useState('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'Weekly' | 'Biweekly' | 'Monthly'>('Weekly');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date>();
  const [numberOfOccurrences, setNumberOfOccurrences] = useState<number>(10);
  const [endType, setEndType] = useState<'date' | 'occurrences'>('occurrences');

  const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    if (blockedTime) {
      setTitle(blockedTime.title);
      setBlockType(blockedTime.block_type);
      setStartDate(new Date(blockedTime.start_date));
      setEndDate(new Date(blockedTime.end_date));
      setStartTime(blockedTime.start_time);
      setEndTime(blockedTime.end_time);
      setNotes(blockedTime.notes || '');
      setIsRecurring(blockedTime.is_recurring || false);
      if (blockedTime.recurrence_pattern) {
        const pattern = blockedTime.recurrence_pattern;
        setRecurrenceFrequency(pattern.frequency);
        setSelectedDays(pattern.daysOfWeek || []);
        if (pattern.endDate) {
          setEndType('date');
          setRecurrenceEndDate(new Date(pattern.endDate));
        } else {
          setEndType('occurrences');
          setNumberOfOccurrences(pattern.numberOfOccurrences || 10);
        }
      }
    } else {
      setTitle('');
      setBlockType('');
      setStartDate(undefined);
      setEndDate(undefined);
      setStartTime('09:00');
      setEndTime('17:00');
      setNotes('');
      setIsRecurring(false);
      setRecurrenceFrequency('Weekly');
      setSelectedDays([]);
      setRecurrenceEndDate(undefined);
      setNumberOfOccurrences(10);
      setEndType('occurrences');
    }
  }, [blockedTime, open]);

  const handleSubmit = async () => {
    if (!title || !blockType || !startDate || !endDate) return;

    setSaving(true);
    try {
      const baseData = {
        id: blockedTime?.id,
        clinician_id: clinicianId,
        title,
        block_type: blockType,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        start_time: startTime,
        end_time: endTime,
        notes,
        is_recurring: isRecurring,
        created_by: clinicianId
      };

      if (isRecurring) {
        const recurrencePattern: RecurrencePattern = {
          frequency: recurrenceFrequency,
          interval: 1,
          daysOfWeek: (recurrenceFrequency === 'Weekly' || recurrenceFrequency === 'Biweekly') ? selectedDays : undefined,
          endDate: endType === 'date' ? recurrenceEndDate : undefined,
          numberOfOccurrences: endType === 'occurrences' ? numberOfOccurrences : undefined
        };
        await onSave({ ...baseData, recurrence_pattern: recurrencePattern });
      } else {
        await onSave(baseData);
      }
      
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{blockedTime ? 'Edit Blocked Time' : 'Add Blocked Time'}</DialogTitle>
          <DialogDescription>
            Block out time in your schedule for PTO, meetings, or other commitments.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Vacation"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="blockType">Type *</Label>
              <Select value={blockType} onValueChange={setBlockType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {BLOCK_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              rows={3}
            />
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center space-x-2 mb-4">
              <Checkbox
                id="recurring"
                checked={isRecurring}
                onCheckedChange={(checked) => setIsRecurring(checked === true)}
              />
              <Label htmlFor="recurring" className="flex items-center gap-2 cursor-pointer">
                <Repeat className="h-4 w-4" />
                Make this recurring
              </Label>
            </div>

            {isRecurring && (
              <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={recurrenceFrequency} onValueChange={(value: any) => setRecurrenceFrequency(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Weekly">Weekly</SelectItem>
                      <SelectItem value="Biweekly">Biweekly (Every 2 weeks)</SelectItem>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(recurrenceFrequency === 'Weekly' || recurrenceFrequency === 'Biweekly') && (
                  <div className="space-y-2">
                    <Label>Days of Week</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map(day => (
                        <Button
                          key={day}
                          type="button"
                          variant={selectedDays.includes(day) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleDay(day)}
                        >
                          {day.slice(0, 3)}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Ends</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="endByDate"
                        checked={endType === 'date'}
                        onCheckedChange={() => setEndType('date')}
                      />
                      <Label htmlFor="endByDate" className="cursor-pointer">On specific date</Label>
                    </div>
                    {endType === 'date' && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal ml-6",
                              !recurrenceEndDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {recurrenceEndDate ? format(recurrenceEndDate, "PPP") : "Pick end date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={recurrenceEndDate}
                            onSelect={setRecurrenceEndDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="endByOccurrences"
                        checked={endType === 'occurrences'}
                        onCheckedChange={() => setEndType('occurrences')}
                      />
                      <Label htmlFor="endByOccurrences" className="cursor-pointer">After number of occurrences</Label>
                    </div>
                    {endType === 'occurrences' && (
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={numberOfOccurrences}
                        onChange={(e) => setNumberOfOccurrences(parseInt(e.target.value) || 1)}
                        className="ml-6"
                        placeholder="Number of occurrences"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !title || !blockType || !startDate || !endDate}>
            {saving ? 'Saving...' : blockedTime ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
