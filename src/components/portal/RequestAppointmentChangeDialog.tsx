import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePortalAccount } from '@/hooks/usePortalAccount';
import { usePortalMessages } from '@/hooks/usePortalMessages';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RequestAppointmentChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: any;
}

export const RequestAppointmentChangeDialog = ({ open, onOpenChange, appointment }: RequestAppointmentChangeDialogProps) => {
  const { portalContext } = usePortalAccount();
  const { sendMessage } = usePortalMessages();
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    reason: '',
    preferredDate: undefined as Date | undefined,
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!portalContext?.client.id || !portalContext.client.primaryTherapist?.id) {
      toast.error('Unable to send request');
      return;
    }

    if (!formData.reason) {
      toast.error('Please select a reason');
      return;
    }

    try {
      setSending(true);

      const messageContent = `Appointment Change Request

Appointment Details:
- Date: ${format(new Date(appointment.appointment_date), 'EEEE, MMMM d, yyyy')}
- Time: ${appointment.start_time} - ${appointment.end_time}
- Type: ${appointment.appointment_type}

Change Request:
- Reason: ${formData.reason}
${formData.preferredDate ? `- Preferred New Date: ${format(formData.preferredDate, 'EEEE, MMMM d, yyyy')}` : ''}
${formData.notes ? `- Additional Notes: ${formData.notes}` : ''}

Please contact me to reschedule this appointment.`;

      await sendMessage({
        clientId: portalContext.client.id,
        clinicianId: portalContext.client.primaryTherapist.id,
        subject: `Appointment Change Request - ${format(new Date(appointment.appointment_date), 'MMM d, yyyy')}`,
        message: messageContent,
        priority: 'Normal',
        requiresResponse: true
      });

      toast.success('Change request sent successfully');
      onOpenChange(false);
      
      // Reset form
      setFormData({
        reason: '',
        preferredDate: undefined,
        notes: ''
      });

    } catch (error) {
      console.error('Error sending request:', error);
      toast.error('Failed to send change request');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Appointment Change</DialogTitle>
          <DialogDescription>
            Submit a request to change your appointment. We'll contact you within 24 hours.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Change *</Label>
            <Select
              value={formData.reason}
              onValueChange={(value) => setFormData({ ...formData, reason: value })}
              disabled={sending}
            >
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Schedule Conflict">Schedule Conflict</SelectItem>
                <SelectItem value="Illness">Illness</SelectItem>
                <SelectItem value="Transportation Issue">Transportation Issue</SelectItem>
                <SelectItem value="Work Commitment">Work Commitment</SelectItem>
                <SelectItem value="Family Emergency">Family Emergency</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Preferred New Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !formData.preferredDate && 'text-muted-foreground'
                  )}
                  disabled={sending}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.preferredDate ? (
                    format(formData.preferredDate, 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.preferredDate}
                  onSelect={(date) => setFormData({ ...formData, preferredDate: date })}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional information..."
              rows={4}
              disabled={sending}
            />
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Your request will be sent to your clinician. They will contact you within 24 hours to schedule a new appointment time.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
              Cancel
            </Button>
            <Button type="submit" disabled={sending}>
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
