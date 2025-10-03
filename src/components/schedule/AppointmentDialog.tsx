import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Sparkles, Repeat } from 'lucide-react';
import { TimeSlotPicker } from './TimeSlotPicker';
import { RecurringAppointmentForm } from './RecurringAppointmentForm';
import { GroupSessionParticipants } from './GroupSessionParticipants';
import { Badge } from '@/components/ui/badge';
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
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
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
  recurrence_pattern: z.object({
    frequency: z.string(),
    interval: z.number(),
    daysOfWeek: z.array(z.string()).optional(),
    endDate: z.date().optional(),
    numberOfOccurrences: z.number().optional(),
  }).optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  defaultDate?: Date;
  defaultClinicianId?: string;
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
  onSave,
  editSeries = false,
  onRequestCancel,
}: AppointmentDialogProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [clinicians, setClinicians] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
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
  const { toast } = useToast();

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
      appointment_date: defaultDate || new Date(),
      clinician_id: defaultClinicianId || '',
      duration: 50,
      service_location: 'Office',
      appointment_type: 'Individual Therapy',
      is_recurring: false,
      telehealth_platform: 'Internal',
      icd_codes: [],
      start_time: '09:00', // Add default start time
    },
  });

  useEffect(() => {
    if (appointment) {
      form.reset({
        client_id: appointment.client_id,
        clinician_id: appointment.clinician_id,
        appointment_date: new Date(appointment.appointment_date),
        start_time: appointment.start_time || '09:00',
        duration: appointment.duration,
        appointment_type: appointment.appointment_type,
        service_location: appointment.service_location,
        office_location_id: appointment.office_location_id ?? undefined,
        room: appointment.room ?? '',
        appointment_notes: appointment.appointment_notes ?? '',
        client_notes: appointment.client_notes ?? '',
        telehealth_platform: appointment.telehealth_platform || 'Internal',
        telehealth_link: appointment.telehealth_link || '',
      });
      setIsRecurring(editSeries ? true : (appointment.is_recurring || false));
      if (appointment.recurrence_pattern) {
        setRecurrencePattern(appointment.recurrence_pattern);
      }
    } else {
      setIsRecurring(false);
      setRecurrencePattern({
        frequency: 'Weekly',
        interval: 1,
        daysOfWeek: [],
        numberOfOccurrences: 10,
      });
    }
  }, [appointment, form, editSeries]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [clientsRes, cliniciansRes, locationsRes] = await Promise.all([
      supabase.from('clients').select('id, first_name, last_name, medical_record_number').eq('status', 'Active'),
      supabase.from('profiles').select('id, first_name, last_name').eq('is_active', true),
      supabase.from('practice_locations').select('*').eq('is_active', true),
    ]);

    if (clientsRes.data) setClients(clientsRes.data);
    if (cliniciansRes.data) setClinicians(cliniciansRes.data);
    if (locationsRes.data) setLocations(locationsRes.data);
  };

  const onSubmit = async (data: AppointmentFormData) => {
    try {
      setSaving(true);
      console.log('Form data being submitted:', data);
      
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
        // Ensure room and notes are null instead of undefined if empty
        room: data.room || null,
        appointment_notes: data.appointment_notes || null,
        client_notes: data.client_notes || null,
      } as Partial<Appointment>;

      console.log('Processed appointment data:', appointmentData);
      
      await onSave(appointmentData, editSeries);
      
      onOpenChange(false);
      form.reset();
      setIsRecurring(false);
    } catch (error) {
      console.error('Error saving appointment:', error);
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
                      />
                    </FormControl>
                    <FormMessage />
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
                        <SelectItem value="Initial Evaluation">Initial Evaluation</SelectItem>
                        <SelectItem value="Individual Therapy">Individual Therapy</SelectItem>
                        <SelectItem value="Couples Therapy">Couples Therapy</SelectItem>
                        <SelectItem value="Family Therapy">Family Therapy</SelectItem>
                        <SelectItem value="Group Therapy">Group Therapy</SelectItem>
                        <SelectItem value="Medication Management">Medication Management</SelectItem>
                        <SelectItem value="Testing">Testing</SelectItem>
                        <SelectItem value="Consultation">Consultation</SelectItem>
                        <SelectItem value="Crisis">Crisis</SelectItem>
                        <SelectItem value="Telehealth">Telehealth</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
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
                            // Auto-generate link for Internal platform
                            if (value === 'Internal' && !appointment) {
                              const sessionId = crypto.randomUUID();
                              form.setValue('telehealth_link', `/telehealth/session/${sessionId}`);
                            } else if (value !== 'Internal') {
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
