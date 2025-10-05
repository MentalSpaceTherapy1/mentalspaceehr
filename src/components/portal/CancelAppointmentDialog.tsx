import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAppointments } from '@/hooks/useAppointments';
import { AlertCircle, Loader2 } from 'lucide-react';
import { format, differenceInHours } from 'date-fns';
import { toast } from 'sonner';

interface CancelAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: any;
}

export const CancelAppointmentDialog = ({ open, onOpenChange, appointment }: CancelAppointmentDialogProps) => {
  const { cancelAppointment } = useAppointments();
  const [cancelling, setCancelling] = useState(false);
  const [formData, setFormData] = useState({
    reason: '',
    notes: '',
    acknowledged: false
  });

  const appointmentDateTime = appointment 
    ? new Date(`${appointment.appointment_date}T${appointment.start_time}`)
    : new Date();
  const hoursUntilAppointment = differenceInHours(appointmentDateTime, new Date());
  const isLateCancellation = hoursUntilAppointment < 24;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.reason) {
      toast.error('Please select a cancellation reason');
      return;
    }

    if (isLateCancellation && !formData.acknowledged) {
      toast.error('Please acknowledge the cancellation policy');
      return;
    }

    try {
      setCancelling(true);

      await cancelAppointment(
        appointment.id,
        formData.reason,
        formData.notes,
        isLateCancellation
      );

      toast.success('Appointment cancelled successfully');
      onOpenChange(false);
      
      // Reset form
      setFormData({
        reason: '',
        notes: '',
        acknowledged: false
      });

    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Failed to cancel appointment');
    } finally {
      setCancelling(false);
    }
  };

  if (!appointment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cancel Appointment</DialogTitle>
          <DialogDescription>
            Cancel your appointment on {format(appointmentDateTime, 'MMMM d, yyyy')} at {appointment.start_time}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Late Cancellation Warning */}
          {isLateCancellation && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Late Cancellation Notice</AlertTitle>
              <AlertDescription>
                This appointment is within 24 hours. A late cancellation fee may apply according to our practice policy.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason for Cancellation *</Label>
            <Select
              value={formData.reason}
              onValueChange={(value) => setFormData({ ...formData, reason: value })}
              disabled={cancelling}
            >
              <SelectTrigger id="cancel-reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Illness">Illness</SelectItem>
                <SelectItem value="Schedule Conflict">Schedule Conflict</SelectItem>
                <SelectItem value="Transportation Issue">Transportation Issue</SelectItem>
                <SelectItem value="Emergency">Emergency</SelectItem>
                <SelectItem value="Feeling Better">Feeling Better / No Longer Needed</SelectItem>
                <SelectItem value="Financial Reasons">Financial Reasons</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancel-notes">Additional Notes (Optional)</Label>
            <Textarea
              id="cancel-notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Please provide any additional details..."
              rows={3}
              disabled={cancelling}
            />
          </div>

          {isLateCancellation && (
            <div className="flex items-start space-x-2">
              <Checkbox
                id="acknowledge"
                checked={formData.acknowledged}
                onCheckedChange={(checked) => setFormData({ ...formData, acknowledged: checked as boolean })}
                disabled={cancelling}
              />
              <Label htmlFor="acknowledge" className="text-sm font-normal leading-tight">
                I understand that cancelling within 24 hours may result in a late cancellation fee as per the practice policy.
              </Label>
            </div>
          )}

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">Cancellation Policy:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Cancellations with 24+ hours notice: No fee</li>
              <li>Cancellations within 24 hours: Late cancellation fee may apply</li>
              <li>No-shows: Full session fee may be charged</li>
            </ul>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={cancelling}>
              Keep Appointment
            </Button>
            <Button type="submit" variant="destructive" disabled={cancelling}>
              {cancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel Appointment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
