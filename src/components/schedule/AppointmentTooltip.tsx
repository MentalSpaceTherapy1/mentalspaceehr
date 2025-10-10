import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface AppointmentTooltipProps {
  appointment: {
    client_name?: string;
    appointment_type: string;
    start_time: string;
    end_time: string;
    duration?: number;
    status: string;
    service_location: string;
  };
}

export function AppointmentTooltip({ appointment }: AppointmentTooltipProps) {
  return (
    <div className="bg-popover border rounded-md shadow-lg p-3 text-sm min-w-[250px]">
      <div className="font-semibold mb-2">{appointment.client_name || 'Client'}</div>
      <div className="space-y-1 text-muted-foreground">
        <div className="flex justify-between">
          <span>Type:</span>
          <span className="font-medium">{appointment.appointment_type}</span>
        </div>
        <div className="flex justify-between">
          <span>Time:</span>
          <span className="font-medium">
            {appointment.start_time} - {appointment.end_time}
          </span>
        </div>
        {appointment.duration && (
          <div className="flex justify-between">
            <span>Duration:</span>
            <span className="font-medium">{appointment.duration} min</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span>Status:</span>
          <Badge variant={
            appointment.status === 'Completed' ? 'default' :
            appointment.status === 'Cancelled' ? 'destructive' :
            appointment.status === 'No Show' ? 'destructive' :
            'secondary'
          }>
            {appointment.status}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span>Location:</span>
          <span className="font-medium">{appointment.service_location}</span>
        </div>
      </div>
    </div>
  );
}
