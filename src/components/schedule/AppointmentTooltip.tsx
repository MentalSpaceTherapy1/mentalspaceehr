import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Calendar, Clock, MapPin, User, FileText, Cake } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const statusColors = {
    'Completed': 'bg-green-500/10 text-green-600 border-green-500/20',
    'Cancelled': 'bg-red-500/10 text-red-600 border-red-500/20',
    'No Show': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    'Checked In': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    'Scheduled': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  };

  const statusColor = statusColors[appointment.status as keyof typeof statusColors] || 'bg-gray-500/10 text-gray-600 border-gray-500/20';

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-0 text-sm min-w-[320px] max-w-[360px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-primary/90 to-primary p-4 text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <User className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-lg">{clientName}</div>
            <div className="text-xs text-primary-foreground/80 font-medium">MRN: {mrn}</div>
          </div>
        </div>
      </div>


      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Date of Birth */}
        <div className="flex items-center gap-3 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
          <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Cake className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Date of Birth</div>
            <div className="font-semibold text-foreground">{dob}</div>
          </div>
        </div>

        {/* Appointment Type */}
        <div className="flex items-center gap-3 p-2 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900">
          <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center">
            <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-purple-600 dark:text-purple-400">Appointment Type</div>
            <div className="font-semibold text-foreground">{appointment.appointment_type}</div>
          </div>
        </div>

        {/* Time */}
        <div className="flex items-center gap-3 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900">
          <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Time</div>
            <div className="font-semibold text-foreground">
              {appointment.start_time.substring(0, 5)} - {appointment.end_time.substring(0, 5)}
              {appointment.duration && <span className="text-muted-foreground ml-1">({appointment.duration} min)</span>}
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-3 p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900">
          <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
            <MapPin className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-orange-600 dark:text-orange-400">Location</div>
            <div className="font-semibold text-foreground">{appointment.service_location}</div>
          </div>
        </div>

        {/* Status */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
          <div className={cn(
            "inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border",
            statusColor
          )}>
            <div className={cn(
              "h-2 w-2 rounded-full mr-2",
              appointment.status === 'Completed' && "bg-green-600",
              appointment.status === 'Cancelled' && "bg-red-600",
              appointment.status === 'No Show' && "bg-orange-600",
              appointment.status === 'Checked In' && "bg-blue-600 animate-pulse",
              appointment.status === 'Scheduled' && "bg-purple-600",
            )} />
            {appointment.status}
          </div>
        </div>

        {/* Notes */}
        {appointment.appointment_notes && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Notes</div>
            <div className="text-xs text-foreground bg-slate-100 dark:bg-slate-800 p-2 rounded-md line-clamp-2">
              {appointment.appointment_notes}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
