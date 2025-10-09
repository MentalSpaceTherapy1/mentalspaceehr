import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useScheduleExceptions, ScheduleException } from '@/hooks/useScheduleExceptions';
import { Calendar } from 'lucide-react';
import { TimeSlotPicker } from './TimeSlotPicker';

interface ScheduleExceptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicianId: string;
  onSuccess?: () => void;
}

export function ScheduleExceptionDialog({
  open,
  onOpenChange,
  clinicianId,
  onSuccess,
}: ScheduleExceptionDialogProps) {
  const { createException } = useScheduleExceptions(clinicianId);
  const [formData, setFormData] = useState<Partial<ScheduleException>>({
    clinicianId,
    exceptionType: 'Time Off',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    allDay: true,
    reason: '',
    notes: '',
    status: 'Requested',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.exceptionType || !formData.startDate || !formData.endDate || !formData.reason) {
      return;
    }

    await createException({
      clinicianId,
      exceptionType: formData.exceptionType,
      startDate: formData.startDate,
      endDate: formData.endDate,
      startTime: formData.allDay ? undefined : formData.startTime,
      endTime: formData.allDay ? undefined : formData.endTime,
      allDay: formData.allDay ?? true,
      reason: formData.reason,
      notes: formData.notes,
      status: formData.status || 'Requested',
    });

    onSuccess?.();
    onOpenChange(false);
    setFormData({
      clinicianId,
      exceptionType: 'Time Off',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      allDay: true,
      reason: '',
      notes: '',
      status: 'Requested',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            <Calendar className="h-5 w-5 inline mr-2" />
            Add Schedule Exception
          </DialogTitle>
          <DialogDescription>
            Request time off or schedule modifications
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Exception Type</Label>
            <Select
              value={formData.exceptionType}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, exceptionType: value as ScheduleException['exceptionType'] }))
              }
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Time Off">Time Off</SelectItem>
                <SelectItem value="Holiday">Holiday</SelectItem>
                <SelectItem value="Conference">Conference</SelectItem>
                <SelectItem value="Training">Training</SelectItem>
                <SelectItem value="Modified Hours">Modified Hours</SelectItem>
                <SelectItem value="Emergency">Emergency</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="all-day">All Day</Label>
            <Switch
              id="all-day"
              checked={formData.allDay}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, allDay: checked }))}
            />
          </div>

          {!formData.allDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">Start Time</Label>
                <TimeSlotPicker
                  value={formData.startTime || ''}
                  onChange={(value) => setFormData((prev) => ({ ...prev, startTime: value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-time">End Time</Label>
                <TimeSlotPicker
                  value={formData.endTime || ''}
                  onChange={(value) => setFormData((prev) => ({ ...prev, endTime: value }))}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g., Vacation, Medical appointment"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional information..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Submit Request</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
