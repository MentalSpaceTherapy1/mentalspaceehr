import { useState, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addDays, subDays } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppointments, Appointment } from '@/hooks/useAppointments';
import { AppointmentDialog } from '@/components/schedule/AppointmentDialog';
import { useCurrentUserRoles } from '@/hooks/useUserRoles';
import { useAuth } from '@/hooks/useAuth';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function Schedule() {
  const { user } = useAuth();
  const { roles } = useCurrentUserRoles();
  const [view, setView] = useState<View>('week');
  const [date, setDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date>();
  
  // Calculate date range for fetching appointments
  const dateRange = useMemo(() => {
    const start = subDays(date, 30);
    const end = addDays(date, 60);
    return { start, end };
  }, [date]);

  const {
    appointments,
    loading,
    createAppointment,
    updateAppointment,
  } = useAppointments(dateRange.start, dateRange.end);

  // Convert appointments to calendar events
  const events = useMemo(() => {
    return appointments.map((apt) => ({
      id: apt.id,
      title: `${apt.appointment_type}`,
      start: new Date(`${apt.appointment_date}T${apt.start_time}`),
      end: new Date(`${apt.appointment_date}T${apt.end_time}`),
      resource: apt,
    }));
  }, [appointments]);

  const handleSelectSlot = useCallback(({ start }: { start: Date }) => {
    setDefaultDate(start);
    setSelectedAppointment(null);
    setDialogOpen(true);
  }, []);

  const handleSelectEvent = useCallback((event: any) => {
    setSelectedAppointment(event.resource);
    setDialogOpen(true);
  }, []);

  const handleSaveAppointment = async (data: Partial<Appointment>) => {
    if (selectedAppointment) {
      await updateAppointment(selectedAppointment.id, data);
    } else {
      await createAppointment(data);
    }
  };

  const handleNavigate = (newDate: Date) => {
    setDate(newDate);
  };

  const handleViewChange = (newView: View) => {
    setView(newView);
  };

  const eventStyleGetter = (event: any) => {
    const appointment = event.resource as Appointment;
    let backgroundColor = 'hsl(var(--primary))';
    
    switch (appointment.status) {
      case 'Confirmed':
        backgroundColor = 'hsl(var(--primary))';
        break;
      case 'Checked In':
        backgroundColor = 'hsl(142, 71%, 45%)'; // green
        break;
      case 'In Session':
        backgroundColor = 'hsl(262, 83%, 58%)'; // purple
        break;
      case 'Completed':
        backgroundColor = 'hsl(221, 83%, 53%)'; // blue
        break;
      case 'No Show':
        backgroundColor = 'hsl(0, 84%, 60%)'; // red
        break;
      case 'Cancelled':
        backgroundColor = 'hsl(0, 0%, 60%)'; // gray
        break;
      default:
        backgroundColor = 'hsl(var(--primary))';
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  };

  const canCreateAppointments = roles.some(role => 
    ['administrator', 'front_desk', 'therapist'].includes(role)
  );

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Schedule</h1>
            <p className="text-muted-foreground">
              Manage appointments and view your calendar
            </p>
          </div>
          {canCreateAppointments && (
            <Button onClick={() => {
              setDefaultDate(new Date());
              setSelectedAppointment(null);
              setDialogOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              New Appointment
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Calendar View</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[700px]">
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                view={view}
                onView={handleViewChange}
                date={date}
                onNavigate={handleNavigate}
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                selectable={canCreateAppointments}
                eventPropGetter={eventStyleGetter}
                step={15}
                timeslots={4}
                defaultView="week"
                views={['month', 'week', 'day']}
                min={new Date(0, 0, 0, 8, 0, 0)}
                max={new Date(0, 0, 0, 19, 0, 0)}
                style={{ height: '100%' }}
              />
            </div>
          </CardContent>
        </Card>

        {canCreateAppointments && (
          <AppointmentDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            appointment={selectedAppointment}
            defaultDate={defaultDate}
            defaultClinicianId={user?.id}
            onSave={handleSaveAppointment}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
