import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { GroupSessionParticipantEditor } from './GroupSessionParticipantEditor';

type StatusAction = 'check-in' | 'check-out' | 'no-show' | 'complete';

interface AppointmentStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: any;
  action: StatusAction;
  onStatusUpdate: (id: string, updates: any) => Promise<void>;
}

export function AppointmentStatusDialog({
  open,
  onOpenChange,
  appointment,
  action,
  onStatusUpdate
}: AppointmentStatusDialogProps) {
  const [notes, setNotes] = useState('');
  const [applyFee, setApplyFee] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const getTitle = () => {
    switch (action) {
      case 'check-in': return 'Check In Appointment';
      case 'check-out': return 'Check Out Appointment';
      case 'no-show': return 'Mark as No Show';
      case 'complete': return 'Complete Appointment';
      default: return 'Update Appointment';
    }
  };

  const getDescription = () => {
    if (!appointment) return '';
    return `${format(new Date(appointment.appointment_date), 'MMM d, yyyy')} at ${appointment.start_time}`;
  };

  const handleSubmit = async () => {
    if (!appointment) return;

    setSaving(true);
    try {
      const now = new Date().toISOString();
      let updates: any = {
        last_modified: now,
        last_modified_by: appointment.clinician_id
      };

      switch (action) {
        case 'check-in':
          updates = {
            ...updates,
            status: 'Checked In',
            checked_in_time: now,
            checked_in_by: appointment.clinician_id,
            status_updated_date: now,
            status_updated_by: appointment.clinician_id
          };
          break;
        case 'check-out':
          updates = {
            ...updates,
            status: 'Completed',
            checked_out_time: now,
            checked_out_by: appointment.clinician_id,
            status_updated_date: now,
            status_updated_by: appointment.clinician_id
          };
          if (appointment.checked_in_time) {
            const checkedInTime = new Date(appointment.checked_in_time);
            const duration = Math.round((new Date(now).getTime() - checkedInTime.getTime()) / 60000);
            updates.actual_duration = duration;
          }
          break;
        case 'no-show':
          updates = {
            ...updates,
            status: 'No Show',
            no_show_date: now,
            no_show_fee_applied: applyFee,
            no_show_notes: notes,
            status_updated_date: now,
            status_updated_by: appointment.clinician_id
          };
          break;
        case 'complete':
          updates = {
            ...updates,
            status: 'Completed',
            status_updated_date: now,
            status_updated_by: appointment.clinician_id
          };
          break;
      }

      await onStatusUpdate(appointment.id, updates);
      toast({
        title: 'Success',
        description: `Appointment ${action === 'check-in' ? 'checked in' : action === 'check-out' ? 'checked out' : action === 'no-show' ? 'marked as no show' : 'completed'} successfully.`
      });
      onOpenChange(false);
      setNotes('');
      setApplyFee(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update appointment status.',
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
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {appointment?.is_group_session && (
            <GroupSessionParticipantEditor 
              appointmentId={appointment.id}
              onUpdate={() => {}}
            />
          )}

          {action === 'no-show' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about the no-show..."
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
                  Apply no-show fee
                </Label>
              </div>
            </>
          )}

          {action === 'check-in' && (
            <p className="text-sm text-muted-foreground">
              This will mark the appointment as checked in at {format(new Date(), 'h:mm a')}.
            </p>
          )}

          {action === 'check-out' && (
            <p className="text-sm text-muted-foreground">
              This will mark the appointment as completed and calculate the actual duration.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Updating...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
