import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Calendar, Clock, MapPin, User, FileText } from 'lucide-react';

interface AppointmentTooltipProps {
  appointment: {
    client?: {
      first_name: string;
      last_name: string;
      preferred_name?: string;
      date_of_birth: string;
      medical_record_number: string;
    };
    appointment_type: string;
    start_time: string;
    end_time: string;
    duration?: number;
    status: string;
    service_location: string;
    appointment_notes?: string;
  };
}

export function AppointmentTooltip({ appointment }: AppointmentTooltipProps) {
  const clientName = appointment.client 
    ? `${appointment.client.last_name}, ${appointment.client.preferred_name || appointment.client.first_name}`
    : 'Unknown Client';
  
  const dob = appointment.client?.date_of_birth 
    ? format(new Date(appointment.client.date_of_birth), 'MM/dd/yyyy')
    : 'N/A';

  const mrn = appointment.client?.medical_record_number || 'N/A';

  return (
    <div className="bg-popover border border-border rounded-lg shadow-xl p-4 text-sm min-w-[280px] max-w-[320px]">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
        <User className="h-4 w-4 text-primary" />
        <div>
          <div className="font-semibold text-foreground">{clientName}</div>
          <div className="text-xs text-muted-foreground">MRN: {mrn}</div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Date of Birth</div>
            <div className="font-medium text-foreground">{dob}</div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Appointment Type</div>
            <div className="font-medium text-foreground">{appointment.appointment_type}</div>
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Time</div>
            <div className="font-medium text-foreground">
              {appointment.start_time.substring(0, 5)} - {appointment.end_time.substring(0, 5)}
              {appointment.duration && <span className="text-muted-foreground ml-1">({appointment.duration} min)</span>}
            </div>
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Location</div>
            <div className="font-medium text-foreground">{appointment.service_location}</div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">Status</span>
          <Badge variant={
            appointment.status === 'Completed' ? 'default' :
            appointment.status === 'Cancelled' ? 'destructive' :
            appointment.status === 'No Show' ? 'destructive' :
            appointment.status === 'Checked In' ? 'default' :
            'secondary'
          }>
            {appointment.status}
          </Badge>
        </div>

        {appointment.appointment_notes && (
          <div className="pt-2 border-t border-border">
            <div className="text-xs text-muted-foreground mb-1">Notes</div>
            <div className="text-xs text-foreground line-clamp-2">{appointment.appointment_notes}</div>
          </div>
        )}
      </div>
    </div>
  );
}
