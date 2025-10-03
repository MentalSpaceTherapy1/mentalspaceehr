import { useState, useMemo, useCallback, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, addDays, subDays } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Clock, Users, Calendar as CalendarIcon, Repeat } from 'lucide-react';
import { useAppointments, Appointment } from '@/hooks/useAppointments';
import { useBlockedTimes } from '@/hooks/useBlockedTimes';
import { AppointmentDialog } from '@/components/schedule/AppointmentDialog';
import { AppointmentStatusDialog } from '@/components/schedule/AppointmentStatusDialog';
import { CancellationDialog } from '@/components/schedule/CancellationDialog';
import { BlockedTimesDialog } from '@/components/schedule/BlockedTimesDialog';
import { RecurringEditDialog } from '@/components/schedule/RecurringEditDialog';
import { useCurrentUserRoles } from '@/hooks/useUserRoles';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { isRecurringAppointment } from '@/lib/recurringAppointments';

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

const DnDCalendar = withDragAndDrop(Calendar);

type ColorBy = 'status' | 'type' | 'clinician';
type StatusAction = 'check-in' | 'check-out' | 'no-show' | 'complete';

export default function Schedule() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { roles } = useCurrentUserRoles();
  const [view, setView] = useState<View>('week');
  const [date, setDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date>();
  const [colorBy, setColorBy] = useState<ColorBy>('status');
  const [selectedClinician, setSelectedClinician] = useState<string>('all');
  const [clinicians, setClinicians] = useState<any[]>([]);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusAction, setStatusAction] = useState<StatusAction>('check-in');
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false);
  const [blockedTimeDialogOpen, setBlockedTimeDialogOpen] = useState(false);
  const [selectedBlockedTime, setSelectedBlockedTime] = useState<any>(null);
  const [recurringEditDialogOpen, setRecurringEditDialogOpen] = useState(false);
  const [recurringEditAction, setRecurringEditAction] = useState<'edit' | 'cancel'>('edit');
  const [pendingRecurringAction, setPendingRecurringAction] = useState<(() => void) | null>(null);
  const [isEditingSeries, setIsEditingSeries] = useState(false);
  
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
    cancelAppointment,
    cancelRecurringSeries,
    updateRecurringSeries,
  } = useAppointments(dateRange.start, dateRange.end, selectedClinician === 'all' ? undefined : selectedClinician);

  const { blockedTimes, createBlockedTime, updateBlockedTime, deleteBlockedTime } = useBlockedTimes(
    selectedClinician === 'all' ? undefined : selectedClinician
  );

  // Auto-scroll to business hours (8 AM) on mount
  useEffect(() => {
    const scrollToBusinessHours = () => {
      const timeContent = document.querySelector('.rbc-time-content');
      if (timeContent) {
        // Scroll to 8 AM (approximately 33% down for 24-hour view)
        const scrollPosition = (timeContent.scrollHeight * 8) / 24;
        timeContent.scrollTop = scrollPosition;
      }
    };
    
    // Delay to ensure calendar is rendered
    setTimeout(scrollToBusinessHours, 100);
  }, [view]); // Re-scroll when view changes

  // Fetch clinicians
  useMemo(() => {
    const fetchClinicians = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('is_active', true)
        .eq('available_for_scheduling', true);
      if (data) setClinicians(data);
    };
    fetchClinicians();
  }, []);

  // Convert appointments to calendar events
  const events = useMemo(() => {
    return appointments.map((apt) => ({
      id: apt.id,
      title: `${apt.appointment_type}${isRecurringAppointment(apt) ? ' 🔁' : ''}`,
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
    const appointment = event.resource as Appointment;
    
    // Check if this is a recurring appointment and we're trying to edit
    if (isRecurringAppointment(appointment)) {
      setSelectedAppointment(appointment);
      setRecurringEditAction('edit');
      setRecurringEditDialogOpen(true);
    } else {
      setSelectedAppointment(appointment);
      setDialogOpen(true);
    }
  }, []);

  const handleSaveAppointment = async (data: Partial<Appointment>, editSeries?: boolean) => {
    if (selectedAppointment) {
      if (editSeries && isRecurringAppointment(selectedAppointment)) {
        const parentId = selectedAppointment.parent_recurrence_id || selectedAppointment.id;
        await updateRecurringSeries(parentId, data);
      } else {
        await updateAppointment(selectedAppointment.id, data);
      }
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

  const handleEventDrop = async ({ event, start, end }: any) => {
    try {
      const appointment = event.resource as Appointment;
      const newDate = format(start, 'yyyy-MM-dd');
      const newStartTime = format(start, 'HH:mm');
      const newEndTime = format(end, 'HH:mm');

      await updateAppointment(appointment.id, {
        appointment_date: newDate,
        start_time: newStartTime,
        end_time: newEndTime,
      });

      toast({
        title: 'Success',
        description: 'Appointment rescheduled successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reschedule appointment. Time slot may be unavailable.',
        variant: 'destructive',
      });
    }
  };

  const handleStatusAction = (appointment: Appointment, action: StatusAction) => {
    setSelectedAppointment(appointment);
    setStatusAction(action);
    setStatusDialogOpen(true);
  };

  const handleCancelClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setCancellationDialogOpen(true);
  };

  const handleSaveBlockedTime = async (data: any) => {
    if (data.id) {
      await updateBlockedTime(data.id, data);
    } else {
      await createBlockedTime(data);
    }
  };

  const handleRecurringEditSingle = () => {
    setRecurringEditDialogOpen(false);
    setIsEditingSeries(false);
    if (recurringEditAction === 'edit') {
      setDialogOpen(true);
    } else if (recurringEditAction === 'cancel' && selectedAppointment) {
      setCancellationDialogOpen(true);
    }
  };

  const handleRecurringEditSeries = async () => {
    setRecurringEditDialogOpen(false);
    setIsEditingSeries(true);
    if (recurringEditAction === 'cancel' && selectedAppointment) {
      // For cancel series, open cancellation dialog with series flag
      setCancellationDialogOpen(true);
    } else {
      // For edit series, open the dialog in series edit mode
      setDialogOpen(true);
    }
  };

  const eventStyleGetter = (event: any) => {
    const appointment = event.resource as Appointment;
    let backgroundColor = 'hsl(var(--primary))';
    
    if (colorBy === 'status') {
      switch (appointment.status) {
        case 'Confirmed':
          backgroundColor = 'hsl(var(--primary))';
          break;
        case 'Checked In':
          backgroundColor = 'hsl(142, 71%, 45%)';
          break;
        case 'In Session':
          backgroundColor = 'hsl(262, 83%, 58%)';
          break;
        case 'Completed':
          backgroundColor = 'hsl(221, 83%, 53%)';
          break;
        case 'No Show':
          backgroundColor = 'hsl(0, 84%, 60%)';
          break;
        case 'Cancelled':
          backgroundColor = 'hsl(0, 0%, 60%)';
          break;
        default:
          backgroundColor = 'hsl(var(--primary))';
      }
    } else if (colorBy === 'type') {
      const typeColors: Record<string, string> = {
        'Initial Evaluation': 'hsl(262, 83%, 58%)',
        'Individual Therapy': 'hsl(221, 83%, 53%)',
        'Couples Therapy': 'hsl(340, 82%, 52%)',
        'Family Therapy': 'hsl(142, 71%, 45%)',
        'Group Therapy': 'hsl(47, 96%, 53%)',
        'Medication Management': 'hsl(280, 87%, 65%)',
        'Testing': 'hsl(200, 98%, 39%)',
        'Crisis': 'hsl(0, 84%, 60%)',
      };
      backgroundColor = typeColors[appointment.appointment_type] || 'hsl(var(--primary))';
    } else if (colorBy === 'clinician') {
      const hash = appointment.clinician_id.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
      const hue = hash % 360;
      backgroundColor = `hsl(${hue}, 70%, 50%)`;
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
          <div className="flex gap-3">
            {canCreateAppointments && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedBlockedTime(null);
                    setBlockedTimeDialogOpen(true);
                  }}
                  className="border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all shadow-sm"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Block Time
                </Button>
                <Button 
                  onClick={() => {
                    setDefaultDate(new Date());
                    setSelectedAppointment(null);
                    setDialogOpen(true);
                  }}
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Appointment
                </Button>
              </>
            )}
          </div>
        </div>

        <Card className="border-2 shadow-md bg-gradient-to-r from-background via-muted/20 to-background">
          <CardContent className="pt-6">
            <div className="flex gap-4 items-center flex-wrap">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Clinician:</span>
                <Select value={selectedClinician} onValueChange={setSelectedClinician}>
                  <SelectTrigger className="w-[200px] border-2 border-primary/20 hover:border-primary/40 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clinicians</SelectItem>
                    {clinicians.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.first_name} {c.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-gradient-to-br from-primary to-primary/60" />
                <span className="text-sm font-semibold">Color by:</span>
                <Select value={colorBy} onValueChange={(v) => setColorBy(v as ColorBy)}>
                  <SelectTrigger className="w-[150px] border-2 border-primary/20 hover:border-primary/40 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="type">Type</SelectItem>
                    <SelectItem value="clinician">Clinician</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 flex-wrap ml-auto">
                <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md">
                  Scheduled
                </Badge>
                <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md">
                  Checked In
                </Badge>
                <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md">
                  Completed
                </Badge>
                <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md">
                  No Show
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 shadow-lg bg-gradient-to-br from-background via-background to-primary/5">
          <CardHeader className="border-b-2 border-primary/10 bg-gradient-to-r from-background via-muted/30 to-background">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <CalendarIcon className="h-6 w-6 text-primary" />
              Calendar View
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[1200px]">
              <DnDCalendar
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
                onEventDrop={handleEventDrop}
                onEventResize={handleEventDrop}
                resizable
                selectable={canCreateAppointments}
                eventPropGetter={eventStyleGetter}
                step={15}
                timeslots={4}
                defaultView="week"
                views={['month', 'week', 'day']}
                min={new Date(0, 0, 0, 0, 0, 0)}
                max={new Date(0, 0, 0, 23, 59, 59)}
                style={{ height: '100%' }}
              />
            </div>
          </CardContent>
        </Card>

        {canCreateAppointments && (
          <>
            <AppointmentDialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) setIsEditingSeries(false);
              }}
              appointment={selectedAppointment}
              defaultDate={defaultDate}
              defaultClinicianId={user?.id}
              onSave={handleSaveAppointment}
              editSeries={isEditingSeries}
              onRequestCancel={() => {
                if (!selectedAppointment) return;
                if (isRecurringAppointment(selectedAppointment)) {
                  setRecurringEditAction('cancel');
                  setRecurringEditDialogOpen(true);
                } else {
                  setIsEditingSeries(false);
                  setCancellationDialogOpen(true);
                }
              }}
            />

            <AppointmentStatusDialog
              open={statusDialogOpen}
              onOpenChange={setStatusDialogOpen}
              appointment={selectedAppointment}
              action={statusAction}
              onStatusUpdate={async (id, updates) => {
                await updateAppointment(id, updates);
              }}
            />

            <CancellationDialog
              open={cancellationDialogOpen}
              onOpenChange={setCancellationDialogOpen}
              appointment={selectedAppointment}
              onCancel={async (id, reason, notes, applyFee) => {
                await cancelAppointment(id, reason, notes, applyFee);
              }}
              isSeries={isEditingSeries}
              onCancelSeries={async (parentId, reason, notes, applyFee) => {
                await cancelRecurringSeries(parentId, reason, notes, applyFee);
                setSelectedAppointment(null);
                setIsEditingSeries(false);
              }}
            />

            <BlockedTimesDialog
              open={blockedTimeDialogOpen}
              onOpenChange={setBlockedTimeDialogOpen}
              clinicianId={user?.id || ''}
              onSave={handleSaveBlockedTime}
              blockedTime={selectedBlockedTime}
            />

            <RecurringEditDialog
              open={recurringEditDialogOpen}
              onOpenChange={setRecurringEditDialogOpen}
              onEditSingle={handleRecurringEditSingle}
              onEditSeries={handleRecurringEditSeries}
              action={recurringEditAction}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
