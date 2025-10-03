import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface CancellationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: any;
  onCancel: (id: string, reason: string, notes?: string, applyFee?: boolean) => Promise<void>;
}

const CANCELLATION_REASONS = [
  'Client Request',
  'Provider Cancellation',
  'Emergency',
  'Insurance Issue',
  'Weather',
  'No Transportation',
  'Illness',
  'Schedule Conflict',
  'Other'
];

export function CancellationDialog({
  open,
  onOpenChange,
  appointment,
  onCancel
}: CancellationDialogProps) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [applyFee, setApplyFee] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!appointment || !reason) {
      toast({
        title: 'Error',
        description: 'Please select a cancellation reason.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      await onCancel(appointment.id, reason, notes, applyFee);
      toast({
        title: 'Success',
        description: 'Appointment cancelled successfully.'
      });
      onOpenChange(false);
      setReason('');
      setNotes('');
      setApplyFee(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to cancel appointment.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Appointment</DialogTitle>
          <DialogDescription>
            {appointment && `${format(new Date(appointment.appointment_date), 'MMM d, yyyy')} at ${appointment.start_time}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Cancellation Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {CANCELLATION_REASONS.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional details..."
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="applyFee"
              checked={applyFee}
              onCheckedChange={(checked) => setApplyFee(checked as boolean)}
            />
            <Label htmlFor="applyFee" className="text-sm font-normal cursor-pointer">
              Apply cancellation fee
            </Label>
          </div>

          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm text-muted-foreground">
              This action will permanently cancel the appointment. The appointment will be marked as cancelled
              and cannot be restored.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Go Back
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={saving || !reason}>
            {saving ? 'Cancelling...' : 'Cancel Appointment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
