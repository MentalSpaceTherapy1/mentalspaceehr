import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, Video, MapPin, User, FileText } from 'lucide-react';
import { format, parseISO, parse } from 'date-fns';

interface AppointmentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: any;
}

export const AppointmentDetailsDialog = ({ open, onOpenChange, appointment }: AppointmentDetailsDialogProps) => {
  if (!appointment) return null;

  const formatTime12Hour = (time?: string) => {
    if (!time) return '';
    try {
      const parsed = parse(time, 'HH:mm:ss', new Date());
      return format(parsed, 'h:mm a');
    } catch {
      return time;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled':
      case 'Confirmed':
        return 'default';
      case 'Cancelled':
      case 'No Show':
        return 'destructive';
      case 'Completed':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Appointment Details</DialogTitle>
          <DialogDescription>
            Complete information about your appointment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Type */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Badge variant={getStatusColor(appointment.status)}>
                {appointment.status}
              </Badge>
              <h3 className="text-xl font-semibold">{appointment.appointment_type}</h3>
            </div>
          </div>

          <Separator />

          {/* Date and Time */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                <span>Date</span>
              </div>
              <p className="text-lg">
                {format(parseISO(appointment.appointment_date), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4" />
                <span>Time</span>
              </div>
              <p className="text-lg">
                {formatTime12Hour(appointment.start_time)} - {formatTime12Hour(appointment.end_time)}
              </p>
              <p className="text-sm text-muted-foreground">
                Duration: {appointment.duration} minutes
              </p>
            </div>
          </div>

          <Separator />

          {/* Location */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              {appointment.service_location === 'Telehealth' ? (
                <Video className="h-4 w-4" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              <span>Location</span>
            </div>
            <p className="text-lg">{appointment.service_location}</p>
            {appointment.room && (
              <p className="text-sm text-muted-foreground">Room: {appointment.room}</p>
            )}
          </div>

          <Separator />

          {/* Clinician */}
          {appointment.clinician && (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4" />
                  <span>Clinician</span>
                </div>
                <p className="text-lg">
                  {appointment.clinician.first_name} {appointment.clinician.last_name}
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Notes */}
          {appointment.appointment_notes && (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4" />
                  <span>Notes</span>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {appointment.appointment_notes}
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Confirmation */}
          {appointment.reminder_confirmed && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm">
                ✓ Confirmed on {format(new Date(appointment.reminder_confirmed_at), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
