import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  useEffect(() => {
    if (blockedTime) {
      setTitle(blockedTime.title);
      setBlockType(blockedTime.block_type);
      setStartDate(new Date(blockedTime.start_date));
      setEndDate(new Date(blockedTime.end_date));
      setStartTime(blockedTime.start_time);
      setEndTime(blockedTime.end_time);
      setNotes(blockedTime.notes || '');
    } else {
      setTitle('');
      setBlockType('');
      setStartDate(undefined);
      setEndDate(undefined);
      setStartTime('09:00');
      setEndTime('17:00');
      setNotes('');
    }
  }, [blockedTime, open]);

  const handleSubmit = async () => {
    if (!title || !blockType || !startDate || !endDate) return;

    setSaving(true);
    try {
      await onSave({
        id: blockedTime?.id,
        clinician_id: clinicianId,
        title,
        block_type: blockType,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        start_time: startTime,
        end_time: endTime,
        notes,
        is_recurring: false,
        created_by: clinicianId
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
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
