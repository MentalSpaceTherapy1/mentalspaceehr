import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, isToday, isPast } from 'date-fns';
import { Calendar as CalendarIcon, Sparkles, Repeat, Video, DollarSign, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TimeSlotPicker } from './TimeSlotPicker';
import { RecurringAppointmentForm } from './RecurringAppointmentForm';
import { GroupSessionParticipants } from './GroupSessionParticipants';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAvailableSlots } from '@/hooks/useAvailableSlots';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Appointment } from '@/hooks/useAppointments';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const appointmentSchema = z.object({
  client_id: z.string().min(1, 'Client is required'),
  clinician_id: z.string().min(1, 'Clinician is required'),
  appointment_date: z.date(),
  start_time: z.string().min(1, 'Start time is required').regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  duration: z.number().min(15).max(480),
  appointment_type: z.string().min(1, 'Appointment type is required'),
  service_location: z.string().min(1, 'Service location is required'),
  office_location_id: z.string().optional().nullable(),
  room: z.string().optional().nullable(),
  appointment_notes: z.string().optional().nullable(),
  client_notes: z.string().optional().nullable(),
  telehealth_platform: z.string().optional(),
  telehealth_link: z.string().optional(),
  cpt_code: z.string().optional(),
  icd_codes: z.array(z.string()).optional(),
  is_recurring: z.boolean().optional(),
  recurrence_pattern: z.any().optional(),
  is_incident_to: z.boolean().optional(),
  billed_under_provider_id: z.string().optional().nullable(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  defaultDate?: Date;
  defaultClinicianId?: string;
  defaultClientId?: string;
  onSave: (data: Partial<Appointment>, editSeries?: boolean) => Promise<void>;
  editSeries?: boolean;
  onRequestCancel?: () => void;
}

export function AppointmentDialog({
  open,
  onOpenChange,
  appointment,
  defaultDate,
  defaultClinicianId,
  defaultClientId,
  onSave,
  editSeries = false,
  onRequestCancel,
}: AppointmentDialogProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [clinicians, setClinicians] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [serviceCodes, setServiceCodes] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState({
    frequency: 'Weekly',
    interval: 1,
    daysOfWeek: [] as string[],
    numberOfOccurrences: 10,
  });
  const [isGroupSession, setIsGroupSession] = useState(false);
  const [groupParticipants, setGroupParticipants] = useState<string[]>([]);
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [isIncidentTo, setIsIncidentTo] = useState(false);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Watch form values for schedule integration - need to define form first
  const [capacityInfo, setCapacityInfo] = useState<{ current: number; max?: number } | null>(null);

  const getMaxDays = (frequency: string) => {
    if (frequency === 'Weekly') return 1;
    if (frequency === 'TwiceWeekly') return 2;
    return 7; // For Biweekly
  };

  const isValidDaySelection = () => {
    if (!isRecurring) return true;
    
    const currentDays = recurrencePattern.daysOfWeek || [];
    const { frequency } = recurrencePattern;
    
    if (frequency === 'Weekly') {
      return currentDays.length === 1;
    }
    if (frequency === 'TwiceWeekly') {
      return currentDays.length === 2;
    }
    return true; // Biweekly and others can have any number
  };

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      client_id: defaultClientId || '',
      appointment_date: defaultDate || new Date(),
      clinician_id: defaultClinicianId || '',
      duration: 50,
      service_location: 'Office',
      appointment_type: 'Therapy Session',
      is_recurring: false,
      telehealth_platform: 'Internal',
      icd_codes: [],
      start_time: '09:00', // Add default start time
    },
  });

  // Watch form values for schedule integration
  const selectedClinicianId = form.watch('clinician_id');
  const selectedDate = form.watch('appointment_date');
  const selectedDuration = form.watch('duration');

  // Fetch available slots based on clinician, date, and duration
  const { availableSlots, loading: slotsLoading } = useAvailableSlots(
    selectedClinicianId,
    selectedDate,
    selectedDuration || 50
  );

  useEffect(() => {
    if (appointment) {
      // Normalize time format from HH:mm:ss to HH:mm
      const normalizedStartTime = appointment.start_time 
        ? appointment.start_time.substring(0, 5)
        : '09:00';
      
      form.reset({
        client_id: appointment.client_id,
        clinician_id: appointment.clinician_id,
        appointment_date: new Date(appointment.appointment_date),
        start_time: normalizedStartTime,
        duration: appointment.duration,
        appointment_type: appointment.appointment_type,
        service_location: appointment.service_location,
        office_location_id: appointment.office_location_id ?? undefined,
        room: appointment.room ?? '',
        appointment_notes: appointment.appointment_notes ?? '',
        client_notes: appointment.client_notes ?? '',
        telehealth_platform: appointment.telehealth_platform || 'Internal',
        telehealth_link: appointment.telehealth_link || '',
        cpt_code: appointment.cpt_code || '',
        icd_codes: appointment.icd_codes || [],
      });
      setIsRecurring(editSeries ? true : (appointment.is_recurring || false));
      if (appointment.recurrence_pattern) {
        setRecurrencePattern(appointment.recurrence_pattern);
      }
    } else {
      // Reset form for new appointment with default values
      form.reset({
        client_id: defaultClientId || '',
        appointment_date: defaultDate || new Date(),
        clinician_id: defaultClinicianId || '',
        duration: 50,
        service_location: 'Office',
        appointment_type: 'Therapy Session',
        is_recurring: false,
        telehealth_platform: 'Internal',
        icd_codes: [],
        start_time: '09:00',
      });
      setIsRecurring(false);
      setRecurrencePattern({
        frequency: 'Weekly',
        interval: 1,
        daysOfWeek: [],
        numberOfOccurrences: 10,
      });
    }
  }, [appointment, form, editSeries, defaultClientId, defaultDate, defaultClinicianId]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [clientsRes, cliniciansRes, locationsRes, serviceCodesRes] = await Promise.all([
        supabase.from('clients').select('id, first_name, last_name, medical_record_number').eq('status', 'Active'),
        supabase.from('profiles').select('id, first_name, last_name').eq('is_active', true),
        supabase.from('practice_locations').select('*').eq('is_active', true),
        supabase.from('service_codes').select('*').eq('is_active', true).order('service_type').order('code'),
      ]);

      if (clientsRes.data) setClients(clientsRes.data);
      if (cliniciansRes.data) {
        setClinicians(cliniciansRes.data);
        // Use all clinicians as potential supervisors for simplicity
        setSupervisors(cliniciansRes.data);
      }
      if (locationsRes.data) setLocations(locationsRes.data);
      if (serviceCodesRes.data) setServiceCodes(serviceCodesRes.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load appointment data",
        variant: "destructive"
      });
    }
  };

  // Filter service codes based on selected appointment type
  const selectedAppointmentType = form.watch('appointment_type');
  const filteredServiceCodes = serviceCodes.filter(
    (code) => code.service_type === selectedAppointmentType
  );
  
  // If no codes match, fallback to Therapy Session codes
  const displayServiceCodes = filteredServiceCodes.length > 0 
    ? filteredServiceCodes 
    : serviceCodes.filter((code) => code.service_type === 'Therapy Session');

  const onSubmit = async (data: AppointmentFormData) => {
    try {
      setSaving(true);
      
      const startNormalized = data.start_time.length === 5 ? `${data.start_time}:00` : data.start_time;
      const [hours, minutes] = startNormalized.split(':').map(Number);
      const endTime = new Date();
      endTime.setHours(hours, minutes + data.duration, 0, 0);
      const endNormalized = format(endTime, 'HH:mm:ss');
      
      const appointmentData = {
        ...data,
        start_time: startNormalized,
        appointment_date: format(data.appointment_date, 'yyyy-MM-dd'),
        end_time: endNormalized,
        timezone: 'America/New_York',
        is_recurring: isRecurring,
        recurrence_pattern: isRecurring ? recurrencePattern : undefined,
        is_group_session: isGroupSession,
        max_participants: isGroupSession ? maxParticipants : null,
        current_participants: isGroupSession ? groupParticipants.length : 1,
        is_incident_to: isIncidentTo,
        billed_under_provider_id: isIncidentTo ? data.billed_under_provider_id : null,
        // Ensure room and notes are null instead of undefined if empty
        room: data.room || null,
        appointment_notes: data.appointment_notes || null,
        client_notes: data.client_notes || null,
      } as Partial<Appointment>;
      
      await onSave(appointmentData, editSeries);
      
      onOpenChange(false);
      form.reset();
      setIsRecurring(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save appointment",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            {appointment ? 'Edit Appointment' : 'New Appointment'}
            {appointment?.is_recurring && (
              <Badge variant="outline" className="ml-2 flex items-center gap-1">
                <Repeat className="h-3 w-3" />
                Recurring
              </Badge>
            )}
          </DialogTitle>
          {editSeries && appointment?.is_recurring && (
            <div className="mt-2 p-3 bg-primary/10 border border-primary/20 rounded-md">
              <p className="text-sm font-medium flex items-center gap-2">
                <Repeat className="h-4 w-4 text-primary" />
                Editing all appointments in this series
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Changes will apply to all future occurrences of this recurring appointment.
              </p>
            </div>
          )}
          {capacityInfo && capacityInfo.max && (
            <Alert className="mt-2">
              <Info className="h-4 w-4" />
              <AlertDescription>
                {capacityInfo.current >= capacityInfo.max ? (
                  <span className="text-destructive font-medium">
                    Daily limit reached ({capacityInfo.current}/{capacityInfo.max} appointments)
                  </span>
                ) : (
                  <span>
                    {capacityInfo.current}/{capacityInfo.max} appointments scheduled for this day
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.first_name} {client.last_name} ({client.medical_record_number})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clinician_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clinician</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select clinician" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clinicians.map((clinician) => (
                          <SelectItem key={clinician.id} value={clinician.id}>
                            {clinician.first_name} {clinician.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="appointment_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <TimeSlotPicker
                        value={field.value}
                        onChange={field.onChange}
                        availableSlots={availableSlots}
                        showUnavailable={true}
                      />
                    </FormControl>
                    <FormMessage />
                    {slotsLoading && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Loading available times...
                      </p>
                    )}
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="appointment_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Appointment Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Therapy Intake">Therapy Intake</SelectItem>
                        <SelectItem value="Therapy Session">Therapy Session</SelectItem>
                        <SelectItem value="Group Therapy">Group Therapy</SelectItem>
                        <SelectItem value="Psychological Evaluation">Psychological Evaluation</SelectItem>
                        <SelectItem value="Consultation">Consultation</SelectItem>
                        <SelectItem value="Family Therapy">Family Therapy</SelectItem>
                        <SelectItem value="Couples Therapy">Couples Therapy</SelectItem>
                        <SelectItem value="Psychiatric Evaluation">Psychiatric Evaluation</SelectItem>
                        <SelectItem value="Medication Management">Medication Management</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="50">50 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                        <SelectItem value="90">90 minutes</SelectItem>
                        <SelectItem value="120">120 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="service_location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Location</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Office">Office</SelectItem>
                        <SelectItem value="Telehealth">Telehealth</SelectItem>
                        <SelectItem value="Home Visit">Home Visit</SelectItem>
                        <SelectItem value="School">School</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="room"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Room 101" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="cpt_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPT Code</FormLabel>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select service code" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[300px]">
                          <SelectItem value="none">None</SelectItem>
                          {displayServiceCodes.map((code) => (
                            <SelectItem key={code.id} value={code.code}>
                              <div className="flex items-center gap-2">
                                <span className="font-mono">{code.code}</span>
                                {code.default_modifiers && (
                                  <span className="text-xs text-muted-foreground">({code.default_modifiers})</span>
                                )}
                                <span className="text-sm">- {code.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Or type custom code:
                    </div>
                    <Input
                      placeholder="Enter CPT code manually"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="font-mono"
                    />
                    {filteredServiceCodes.length === 0 && displayServiceCodes.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        No codes found for {selectedAppointmentType}. Showing Therapy Session codes.
                      </p>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('service_location') === 'Telehealth' && (
              <div className="space-y-4 p-4 border border-primary/20 rounded-lg bg-primary/5">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Telehealth Settings</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="telehealth_platform"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Platform</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Clear link if not Internal - let useAppointments handle generation
                            if (value !== 'Internal') {
                              form.setValue('telehealth_link', '');
                            }
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select platform" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Internal">Internal WebRTC</SelectItem>
                            <SelectItem value="Zoom">Zoom</SelectItem>
                            <SelectItem value="Doxy.me">Doxy.me</SelectItem>
                            <SelectItem value="External">External Link</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="telehealth_link"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meeting Link</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder={
                              form.watch('telehealth_platform') === 'Internal' 
                                ? 'Auto-generated' 
                                : 'Enter meeting URL'
                            }
                            disabled={form.watch('telehealth_platform') === 'Internal'}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="appointment_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Appointment Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Internal notes about this appointment..."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!appointment && (
              <GroupSessionParticipants
                participants={groupParticipants}
                onParticipantsChange={setGroupParticipants}
                isGroupSession={isGroupSession}
                onIsGroupSessionChange={setIsGroupSession}
                maxParticipants={maxParticipants}
                onMaxParticipantsChange={setMaxParticipants}
              />
            )}

            {/* Incident-to Billing Section */}
            <div className="space-y-4 p-4 border border-primary/20 rounded-lg bg-primary/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FormLabel className="flex items-center gap-2">
                    <Checkbox
                      checked={isIncidentTo}
                      onCheckedChange={(checked) => setIsIncidentTo(checked as boolean)}
                    />
                    <span>Incident-to Billing</span>
                  </FormLabel>
                </div>
                {isIncidentTo && (
                  <Badge variant="secondary">
                    Medicare Incident-to
                  </Badge>
                )}
              </div>
              
              {isIncidentTo && (
                <FormField
                  control={form.control}
                  name="billed_under_provider_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supervising Provider</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select supervising provider" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {supervisors.map((supervisor) => (
                            <SelectItem key={supervisor.id} value={supervisor.id}>
                              {supervisor.first_name} {supervisor.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Select the provider who will attest to incident-to requirements
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {(!appointment || editSeries) && (
              <RecurringAppointmentForm
                isRecurring={isRecurring}
                onIsRecurringChange={setIsRecurring}
                recurrencePattern={recurrencePattern}
                onRecurrencePatternChange={setRecurrencePattern}
              />
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              {appointment && 
                appointment.service_location === 'Telehealth' && 
                appointment.telehealth_platform === 'Internal' &&
                (appointment.status === 'Scheduled' || appointment.status === 'Confirmed') &&
                (isToday(new Date(appointment.appointment_date)) || isPast(new Date(appointment.appointment_date))) && (
                <Button
                  type="button"
                  variant="default"
                  onClick={async () => {
                    try {
                      const { ensureTelehealthSession } = await import('@/lib/telehealthSession');
                      const sessionId = await ensureTelehealthSession(
                        appointment.id,
                        appointment.clinician_id
                      );
                      navigate(`/telehealth/session/${sessionId}`);
                    } catch (e) {
                      console.error('Failed to join telehealth session', e);
                      toast({
                        title: 'Error',
                        description: 'Unable to join telehealth session.',
                        variant: 'destructive'
                      });
                    }
                  }}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Video className="mr-2 h-4 w-4" />
                  Join Telehealth Session
                </Button>
              )}
              {appointment && onRequestCancel && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => onRequestCancel()}
                >
                  Cancel Appointment
                </Button>
              )}
              <Button type="submit" disabled={saving || !isValidDaySelection()}>
                {saving ? 'Saving...' : 'Save Appointment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
