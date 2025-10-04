import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WaitlistConvertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: any;
  clientInfo: any;
  clinicianInfo: any;
  onSuccess: () => void;
}

export function WaitlistConvertDialog({ 
  open, 
  onOpenChange, 
  entry, 
  clientInfo,
  clinicianInfo,
  onSuccess 
}: WaitlistConvertDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('50');

  useEffect(() => {
    if (open) {
      // Reset form
      setDate(undefined);
      setStartTime('');
      setDuration('50');
    }
  }, [open]);

  const handleConvert = async () => {
    if (!date || !startTime || !user) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Calculate end time
      const [hours, minutes] = startTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + parseInt(duration);
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}:00`;

      // Create appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert([{
          client_id: entry.client_id,
          clinician_id: entry.clinician_id,
          appointment_date: format(date, 'yyyy-MM-dd'),
          start_time: `${startTime}:00`,
          end_time: endTime,
          duration: parseInt(duration),
          appointment_type: entry.appointment_type,
          service_location: 'Office',
          status: 'Scheduled',
          created_by: user.id,
          timezone: 'America/New_York'
        }])
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Update waitlist entry status
      const { error: waitlistError } = await supabase
        .from('appointment_waitlist')
        .update({
          status: 'Scheduled',
          scheduled_appointment_id: appointment.id,
          removed_date: new Date().toISOString(),
          removed_reason: 'Converted to scheduled appointment'
        })
        .eq('id', entry.id);

      if (waitlistError) throw waitlistError;

      toast.success('Waitlist entry converted to appointment');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error converting waitlist:', error);
      toast.error('Failed to convert to appointment');
    } finally {
      setLoading(false);
    }
  };

  if (!entry) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Convert to Appointment</DialogTitle>
          <DialogDescription>
            Schedule an appointment for {clientInfo?.first_name} {clientInfo?.last_name} with{' '}
            {clinicianInfo?.first_name} {clinicianInfo?.last_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Appointment Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (min) *</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="50">50 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
            <div><span className="font-medium">Type:</span> {entry?.appointment_type}</div>
            {entry?.preferred_days && entry.preferred_days.length > 0 && (
              <div><span className="font-medium">Preferred Days:</span> {entry.preferred_days.map((d: string) => 
                ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][parseInt(d)]
              ).join(', ')}</div>
            )}
            {entry?.preferred_times && entry.preferred_times.length > 0 && (
              <div><span className="font-medium">Preferred Times:</span> {entry.preferred_times.join(', ')}</div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConvert} disabled={loading}>
            {loading ? 'Converting...' : 'Create Appointment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}