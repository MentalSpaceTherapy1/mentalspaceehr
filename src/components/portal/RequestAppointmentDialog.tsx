import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePortalAccount } from '@/hooks/usePortalAccount';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface RequestAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RequestAppointmentDialog = ({ open, onOpenChange }: RequestAppointmentDialogProps) => {
  const { portalContext } = usePortalAccount();
  const [submitting, setSubmitting] = useState(false);
  const [clinicians, setClinicians] = useState<any[]>([]);
  const [loadingClinicians, setLoadingClinicians] = useState(true);
  const [formData, setFormData] = useState({
    clinicianId: '',
    appointmentType: '',
    preferredDays: [] as string[],
    preferredTimes: [] as string[],
    notes: ''
  });

  useEffect(() => {
    if (open) {
      loadClinicians();
    }
  }, [open]);

  const loadClinicians = async () => {
    try {
      setLoadingClinicians(true);

      if (!portalContext?.account.clientId) {
        setClinicians([]);
        return;
      }

      // Load only the clinicians assigned to this client (primary therapist, psychiatrist, case manager)
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('primary_therapist_id, psychiatrist_id, case_manager_id')
        .eq('id', portalContext.account.clientId)
        .maybeSingle();

      if (clientError) throw clientError;

      const assignedIds = [client?.primary_therapist_id, client?.psychiatrist_id, client?.case_manager_id]
        .filter(Boolean) as string[];

      if (assignedIds.length === 0) {
        setClinicians([]);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', assignedIds)
        .order('last_name');

      if (error) throw error;
      setClinicians(data || []);
    } catch (error) {
      toast.error('Failed to load clinicians');
    } finally {
      setLoadingClinicians(false);
    }
  };

  const appointmentTypes = [
    'Initial Consultation',
    'Individual Therapy',
    'Couples Therapy',
    'Family Therapy',
    'Medication Management',
    'Follow-up'
  ];

  const daysOfWeek = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'
  ];

  const timesOfDay = [
    'Morning (8am-12pm)',
    'Afternoon (12pm-5pm)',
    'Evening (5pm-8pm)'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!portalContext?.client.id) {
      toast.error('Unable to submit request');
      return;
    }

    if (!formData.clinicianId) {
      toast.error('Please select a clinician');
      return;
    }

    if (!formData.appointmentType) {
      toast.error('Please select an appointment type');
      return;
    }

    try {
      setSubmitting(true);

      // Send as a message to the selected clinician
      const { error } = await supabase
        .from('client_portal_messages')
        .insert({
          client_id: portalContext.client.id,
          sender_id: portalContext.account.portalUserId,
          clinician_id: formData.clinicianId,
          subject: 'Appointment Request',
          message: `Appointment Type: ${formData.appointmentType}\n\nPreferred Days: ${formData.preferredDays.join(', ') || 'Any'}\nPreferred Times: ${formData.preferredTimes.join(', ') || 'Any'}\n\nAdditional Notes:\n${formData.notes || 'None'}`,
          priority: 'normal',
          requires_response: true
        });

      if (error) throw error;

      toast.success('Appointment request sent successfully! Your clinician will contact you soon.');
      onOpenChange(false);
      
      // Reset form
      setFormData({
        clinicianId: '',
        appointmentType: '',
        preferredDays: [],
        preferredTimes: [],
        notes: ''
      });

    } catch (error) {
      toast.error('Failed to submit appointment request');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      preferredDays: prev.preferredDays.includes(day)
        ? prev.preferredDays.filter(d => d !== day)
        : [...prev.preferredDays, day]
    }));
  };

  const toggleTime = (time: string) => {
    setFormData(prev => ({
      ...prev,
      preferredTimes: prev.preferredTimes.includes(time)
        ? prev.preferredTimes.filter(t => t !== time)
        : [...prev.preferredTimes, time]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Request an Appointment
          </DialogTitle>
          <DialogDescription>
            Submit a request for a new appointment. Your clinician will review and contact you to schedule.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clinician">Clinician *</Label>
            <Select
              value={formData.clinicianId}
              onValueChange={(value) => setFormData({ ...formData, clinicianId: value })}
              disabled={submitting || loadingClinicians}
            >
              <SelectTrigger id="clinician">
                <SelectValue placeholder="Select a clinician" />
              </SelectTrigger>
              <SelectContent>
                {clinicians.map((clinician) => (
                  <SelectItem key={clinician.id} value={clinician.id}>
                    {clinician.first_name} {clinician.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="appointment-type">Appointment Type *</Label>
            <Select
              value={formData.appointmentType}
              onValueChange={(value) => setFormData({ ...formData, appointmentType: value })}
              disabled={submitting}
            >
              <SelectTrigger id="appointment-type">
                <SelectValue placeholder="Select appointment type" />
              </SelectTrigger>
              <SelectContent>
                {appointmentTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Preferred Days (select all that apply)</Label>
            <div className="flex flex-wrap gap-2">
              {daysOfWeek.map((day) => (
                <Button
                  key={day}
                  type="button"
                  variant={formData.preferredDays.includes(day) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleDay(day)}
                  disabled={submitting}
                >
                  {day}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Preferred Times (select all that apply)</Label>
            <div className="flex flex-wrap gap-2">
              {timesOfDay.map((time) => (
                <Button
                  key={time}
                  type="button"
                  variant={formData.preferredTimes.includes(time) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleTime(time)}
                  disabled={submitting}
                >
                  {time}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any specific requests or information your clinician should know..."
              className="min-h-[100px]"
              maxLength={1000}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              {formData.notes.length}/1000 characters
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
