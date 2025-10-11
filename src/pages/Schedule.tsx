import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
import { Plus, Clock, Users, Calendar as CalendarIcon, Repeat, Settings } from 'lucide-react';
import { useAppointments, Appointment } from '@/hooks/useAppointments';
import { useBlockedTimes } from '@/hooks/useBlockedTimes';
import { AppointmentDialog } from '@/components/schedule/AppointmentDialog';
import { AppointmentStatusDialog } from '@/components/schedule/AppointmentStatusDialog';
import { CancellationDialog } from '@/components/schedule/CancellationDialog';
import { BlockedTimesDialog } from '@/components/schedule/BlockedTimesDialog';
import { RecurringEditDialog } from '@/components/schedule/RecurringEditDialog';
import { ClinicianSelectorDialog } from '@/components/schedule/ClinicianSelectorDialog';
import { AppointmentTooltip } from '@/components/schedule/AppointmentTooltip';
import { useCurrentUserRoles } from '@/hooks/useUserRoles';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { isRecurringAppointment } from '@/lib/recurringAppointments';
import { isClinicianAvailable, getDayName, parseTime } from '@/lib/scheduleUtils';
import { WeeklySchedule } from '@/hooks/useClinicianSchedule';
import { useSearchParams } from 'react-router-dom';

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
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<View>('week');
  const [date, setDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date>();
  const [defaultClientId, setDefaultClientId] = useState<string>();
  const [colorBy, setColorBy] = useState<ColorBy>('status');
  const [selectedClinicians, setSelectedClinicians] = useState<Set<string>>(new Set());
  const [clinicians, setClinicians] = useState<Array<{ id: string; first_name: string; last_name: string; color: string }>>([]);
  const [clinicianSchedules, setClinicianSchedules] = useState<Record<string, WeeklySchedule>>({});
  const [clinicianSelectorOpen, setClinicianSelectorOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusAction, setStatusAction] = useState<StatusAction>('check-in');
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false);
  const [blockedTimeDialogOpen, setBlockedTimeDialogOpen] = useState(false);
  const [selectedBlockedTime, setSelectedBlockedTime] = useState<any>(null);
  const [recurringEditDialogOpen, setRecurringEditDialogOpen] = useState(false);
  const [recurringEditAction, setRecurringEditAction] = useState<'edit' | 'cancel'>('edit');
  const [pendingRecurringAction, setPendingRecurringAction] = useState<(() => void) | null>(null);
  const [isEditingSeries, setIsEditingSeries] = useState(false);

  // Read clientId from URL query parameters on mount
  useEffect(() => {
    const clientId = searchParams.get('clientId');
    if (clientId) {
      setDefaultClientId(clientId);
      setDialogOpen(true);
    }
  }, []);
  
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
    refreshAppointments,
  } = useAppointments(dateRange.start, dateRange.end, undefined);

  const { blockedTimes, createBlockedTime, updateBlockedTime, deleteBlockedTime } = useBlockedTimes(undefined);

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

  // Fetch clinicians with assigned colors and their schedules
  useEffect(() => {
    const fetchClinicians = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('is_active', true)
        .eq('available_for_scheduling', true);
      
      if (data) {
        // Use a predefined color palette for better distinction
        const colorPalette = [
          'hsl(0, 70%, 50%)',    // Red
          'hsl(30, 70%, 50%)',   // Orange
          'hsl(60, 70%, 50%)',   // Yellow
          'hsl(120, 70%, 50%)',  // Green
          'hsl(180, 70%, 50%)',  // Cyan
          'hsl(210, 70%, 50%)',  // Blue
          'hsl(270, 70%, 50%)',  // Purple
          'hsl(300, 70%, 50%)',  // Magenta
          'hsl(15, 70%, 50%)',   // Red-Orange
          'hsl(45, 70%, 50%)',   // Gold
          'hsl(90, 70%, 50%)',   // Lime
          'hsl(150, 70%, 50%)',  // Teal
          'hsl(195, 70%, 50%)',  // Sky Blue
          'hsl(240, 70%, 50%)',  // Indigo
          'hsl(285, 70%, 50%)',  // Violet
          'hsl(330, 70%, 50%)',  // Pink
        ];
        
        // Assign colors using hash for consistency, but from palette
        const cliniciansWithColors = data.map((c) => {
          const hash = c.id.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
          const colorIndex = hash % colorPalette.length;
          return {
            ...c,
            color: colorPalette[colorIndex],
          };
        });
        setClinicians(cliniciansWithColors);
        // Select all by default
        setSelectedClinicians(new Set(cliniciansWithColors.map(c => c.id)));

        // Fetch schedules for all clinicians
        const { data: schedules } = await supabase
          .from('clinician_schedules')
          .select('*')
          .in('clinician_id', cliniciansWithColors.map(c => c.id))
          .order('effective_start_date', { ascending: false });

        if (schedules) {
          const schedulesMap: Record<string, WeeklySchedule> = {};
          schedules.forEach((schedule) => {
            if (!schedulesMap[schedule.clinician_id]) {
              schedulesMap[schedule.clinician_id] = schedule.weekly_schedule as unknown as WeeklySchedule;
            }
          });
          setClinicianSchedules(schedulesMap);
        }
      }
    };
    fetchClinicians();
  }, []);

  const events = useMemo(() => {
    // Filter appointments by selected clinicians
    const filteredAppointments = appointments.filter(apt => 
      selectedClinicians.size === 0 || selectedClinicians.has(apt.clinician_id)
    );

    // Add appointments as events
    const appointmentEvents = filteredAppointments.map((apt) => {
      const incidentToBadge = apt.is_incident_to ? ' 💼' : '';
      return {
        id: apt.id,
        title: `${apt.appointment_type}${isRecurringAppointment(apt) ? ' 🔁' : ''}${incidentToBadge}`,
        start: new Date(`${apt.appointment_date}T${apt.start_time}`),
        end: new Date(`${apt.appointment_date}T${apt.end_time}`),
        resource: { type: 'appointment', data: apt },
      };
    });

    // Add blocked times as gray events
    const blockedEvents = blockedTimes
      .filter(bt => selectedClinicians.size === 0 || selectedClinicians.has(bt.clinician_id))
      .flatMap((bt) => {
        const events = [];
        const start = new Date(bt.start_date);
        const end = new Date(bt.end_date);
        
        // Generate events for each day in the range
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          events.push({
            id: `blocked-${bt.id}-${d.toISOString()}`,
            title: bt.title || 'Blocked',
            start: new Date(`${format(d, 'yyyy-MM-dd')}T${bt.start_time}`),
            end: new Date(`${format(d, 'yyyy-MM-dd')}T${bt.end_time}`),
            resource: { type: 'blocked', data: bt },
          });
        }
        return events;
      });

    return [...appointmentEvents, ...blockedEvents];
  }, [appointments, blockedTimes, selectedClinicians]);

  const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
    setDefaultDate(start);
    setDefaultClientId(undefined);
    setSelectedAppointment(null);
    // Store the selected time slot for pre-filling the dialog
    (window as any).__selectedTimeSlot = {
      startTime: format(start, 'HH:mm'),
      endTime: format(end, 'HH:mm')
    };
    setDialogOpen(true);
  }, []);

  const handleSelectEvent = useCallback((event: any) => {
    const resource = event.resource;
    
    // Check if it's a blocked time
    if (resource.type === 'blocked') {
      setSelectedBlockedTime(resource.data);
      setBlockedTimeDialogOpen(true);
      return;
    }
    
    // Handle appointment
    const appointment = resource.data as Appointment;
    
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
    try {
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
      // Manually refresh to ensure immediate update
      await refreshAppointments();
    } catch (error) {
      console.error('Error saving appointment:', error);
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
      const appointment = event.resource.data as Appointment;
      const newDate = format(start, 'yyyy-MM-dd');
      const newStartTime = format(start, 'HH:mm');
      const newEndTime = format(end, 'HH:mm');

      await updateAppointment(appointment.id, {
        appointment_date: newDate,
        start_time: newStartTime,
        end_time: newEndTime,
      });

      // Manually refresh to ensure immediate update
      await refreshAppointments();

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
    try {
      if (data.id) {
        await updateBlockedTime(data.id, data);
      } else {
        await createBlockedTime(data);
      }
      // Manually refresh to ensure immediate update
      await refreshAppointments();
    } catch (error) {
      console.error('Error saving blocked time:', error);
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

  const slotPropGetter = useCallback((date: Date) => {
    // If no clinicians selected, show all slots as available
    if (selectedClinicians.size === 0) {
      return {};
    }

    const dayName = getDayName(date);
    const timeString = format(date, 'HH:mm');
    const timeMinutes = parseTime(timeString);

    // Check if ANY selected clinician is available at this time
    let anyAvailable = false;
    let isBreakTime = false;

    for (const clinicianId of selectedClinicians) {
      const schedule = clinicianSchedules[clinicianId];
      if (!schedule) continue;

      const daySchedule = schedule[dayName];
      if (!daySchedule || !daySchedule.isWorkingDay) continue;

      // Check if time is within any shift
      const inShift = daySchedule.shifts.some(shift => {
        const shiftStart = parseTime(shift.startTime);
        const shiftEnd = parseTime(shift.endTime);
        return timeMinutes >= shiftStart && timeMinutes < shiftEnd;
      });

      if (inShift) {
        // Check if it's break time
        const inBreak = daySchedule.breakTimes.some(breakTime => {
          const breakStart = parseTime(breakTime.startTime);
          const breakEnd = parseTime(breakTime.endTime);
          return timeMinutes >= breakStart && timeMinutes < breakEnd;
        });

        if (inBreak) {
          isBreakTime = true;
        } else {
          anyAvailable = true;
          break; // At least one clinician is available
        }
      }
    }

    // If it's break time for all selected clinicians who work this time
    if (isBreakTime && !anyAvailable) {
      return {
        style: {
          backgroundColor: 'hsl(25, 95%, 85%)', // Light orange for break
          border: '1px solid hsl(25, 95%, 70%)',
        },
      };
    }

    // If no clinician is available (non-working hours)
    if (!anyAvailable) {
      return {
        style: {
          backgroundColor: 'hsl(0, 0%, 95%)', // Light gray for non-working
          pointerEvents: 'none' as const,
        },
      };
    }

    // Working hours - default styling
    return {};
  }, [selectedClinicians, clinicianSchedules]);

  const eventStyleGetter = (event: any) => {
    const resource = event.resource;
    
    // Blocked time - always gray
    if (resource.type === 'blocked') {
      return {
        style: {
          backgroundColor: 'hsl(0, 0%, 75%)',
          borderRadius: '4px',
          opacity: 0.6,
          color: 'white',
          border: '1px dashed hsl(0, 0%, 60%)',
          display: 'block',
        },
      };
    }
    
    // Appointment styling
    const appointment = resource.data as Appointment;
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
      // Use the pre-assigned color from clinicians array
      const clinician = clinicians.find(c => c.id === appointment.clinician_id);
      backgroundColor = clinician?.color || 'hsl(var(--primary))';
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

  const [hoveredAppointment, setHoveredAppointment] = useState<Appointment | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hide tooltip on scroll or resize
  useEffect(() => {
    const hideTooltip = () => {
      setHoveredAppointment(null);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    };

    window.addEventListener('scroll', hideTooltip, true);
    window.addEventListener('resize', hideTooltip);

    return () => {
      window.removeEventListener('scroll', hideTooltip, true);
      window.removeEventListener('resize', hideTooltip);
    };
  }, []);

  // Custom event wrapper that handles hover at the wrapper level
  const CustomEventWrapper = ({ event, children }: any) => {
    const resource = event.resource;

    // Only attach hover for appointments, not blocked times
    if (resource.type !== 'appointment') {
      return <div>{children}</div>;
    }

    const appointment = resource.data as Appointment;

    return (
      <div
        onMouseEnter={(e) => {
          // Clear any existing timeout
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
          }

          const targetElement = e.currentTarget;

          // Set tooltip with reduced delay
          hoverTimeoutRef.current = setTimeout(() => {
            if (!targetElement || !appointment) return;

            const rect = targetElement.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const tooltipWidth = 360;
            const tooltipHeight = 250; // Approximate tooltip height

            // Position to the right by default
            let xPos = rect.right + 10;
            
            // If it goes off screen to the right, show on left
            if (xPos + tooltipWidth > viewportWidth - 10) {
              xPos = rect.left - tooltipWidth - 10;
            }
            
            // Clamp to viewport
            xPos = Math.max(10, Math.min(xPos, viewportWidth - tooltipWidth - 10));

            // Vertical positioning - try to center on event
            let yPos = rect.top + (rect.height / 2) - (tooltipHeight / 2);
            
            // Clamp to viewport vertically
            yPos = Math.max(10, Math.min(yPos, viewportHeight - tooltipHeight - 10));

            setTooltipPosition({ x: xPos, y: yPos });
            setHoveredAppointment(appointment);
          }, 120); // 120ms delay
        }}
        onMouseLeave={() => {
          // Clear timeout and hide tooltip
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
          }
          setHoveredAppointment(null);
        }}
      >
        {children}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6 relative">
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
                <span className="text-sm font-semibold">Clinicians:</span>
                <Button
                  variant="outline"
                  className="border-2 border-primary/20 hover:border-primary/40 transition-colors"
                  onClick={() => setClinicianSelectorOpen(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {selectedClinicians.size === 0 
                    ? 'None Selected' 
                    : selectedClinicians.size === clinicians.length 
                    ? 'All Clinicians'
                    : `${selectedClinicians.size} Selected`}
                </Button>
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
                <Badge className="bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-md">
                  Cancelled
                </Badge>
                <Badge variant="outline" className="shadow-md flex items-center gap-1 border-gray-400">
                  <div className="w-3 h-3 bg-gray-400 rounded" />
                  Blocked Time
                </Badge>
                <Badge variant="secondary" className="shadow-md flex items-center gap-1">
                  <span>💼</span>
                  Incident-to
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
                slotPropGetter={slotPropGetter}
                components={{
                  eventWrapper: CustomEventWrapper,
                }}
                popup={true}
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
              defaultClientId={defaultClientId}
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
                await refreshAppointments();
              }}
              isSeries={isEditingSeries}
              onCancelSeries={async (parentId, reason, notes, applyFee) => {
                await cancelRecurringSeries(parentId, reason, notes, applyFee);
                await refreshAppointments();
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

        <ClinicianSelectorDialog
          open={clinicianSelectorOpen}
          onOpenChange={setClinicianSelectorOpen}
          clinicians={clinicians}
          selectedClinicians={selectedClinicians}
          onApply={setSelectedClinicians}
        />

        {/* Floating tooltip for hovered appointments - rendered via portal */}
        {hoveredAppointment && createPortal(
          <div 
            className="fixed z-[9999] pointer-events-none"
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y}px`,
            }}
          >
            <AppointmentTooltip appointment={hoveredAppointment} />
          </div>,
          document.body
        )}
      </div>
    </DashboardLayout>
  );
}
