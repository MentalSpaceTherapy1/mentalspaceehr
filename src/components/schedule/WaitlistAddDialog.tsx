import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const APPOINTMENT_TYPES = [
  'Initial Evaluation',
  'Individual Therapy',
  'Couples Therapy',
  'Family Therapy',
  'Group Therapy',
  'Medication Management',
  'Testing',
  'Consultation',
  'Crisis',
  'Other'
];

const DAYS_OF_WEEK = ['0', '1', '2', '3', '4', '5', '6']; // Sunday = 0
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIMES_OF_DAY = ['Morning', 'Afternoon', 'Evening'];

interface WaitlistAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function WaitlistAddDialog({ open, onOpenChange, onSuccess }: WaitlistAddDialogProps) {
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [clinicians, setClinicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    client_id: '',
    clinician_id: '',
    alternate_clinician_ids: [] as string[],
    appointment_type: '',
    preferred_days: [] as string[],
    preferred_times: [] as string[],
    priority: 'Normal',
    notes: ''
  });

  useEffect(() => {
    if (open) {
      fetchClients();
      fetchClinicians();
    }
  }, [open]);

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, first_name, last_name, medical_record_number')
      .eq('status', 'Active')
      .order('last_name');
    if (data) setClients(data);
  };

  const fetchClinicians = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('is_active', true)
      .eq('available_for_scheduling', true)
      .order('last_name');
    if (data) setClinicians(data);
  };

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      preferred_days: prev.preferred_days.includes(day)
        ? prev.preferred_days.filter(d => d !== day)
        : [...prev.preferred_days, day]
    }));
  };

  const handleTimeToggle = (time: string) => {
    setFormData(prev => ({
      ...prev,
      preferred_times: prev.preferred_times.includes(time)
        ? prev.preferred_times.filter(t => t !== time)
        : [...prev.preferred_times, time]
    }));
  };

  const handleAlternateClinicianToggle = (clinicianId: string) => {
    setFormData(prev => ({
      ...prev,
      alternate_clinician_ids: prev.alternate_clinician_ids.includes(clinicianId)
        ? prev.alternate_clinician_ids.filter(id => id !== clinicianId)
        : [...prev.alternate_clinician_ids, clinicianId]
    }));
  };

  const handleSubmit = async () => {
    if (!user || !formData.client_id || !formData.clinician_id || !formData.appointment_type) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('appointment_waitlist')
        .insert([{
          client_id: formData.client_id,
          clinician_id: formData.clinician_id,
          alternate_clinician_ids: formData.alternate_clinician_ids.length > 0 
            ? formData.alternate_clinician_ids 
            : null,
          appointment_type: formData.appointment_type,
          preferred_days: formData.preferred_days.length > 0 ? formData.preferred_days : null,
          preferred_times: formData.preferred_times.length > 0 ? formData.preferred_times : null,
          priority: formData.priority,
          notes: formData.notes || null,
          added_by: user.id,
          status: 'Active'
        }]);

      if (error) throw error;

      toast.success('Client added to waitlist');
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        client_id: '',
        clinician_id: '',
        alternate_clinician_ids: [],
        appointment_type: '',
        preferred_days: [],
        preferred_times: [],
        priority: 'Normal',
        notes: ''
      });
    } catch (error) {
      console.error('Error adding to waitlist:', error);
      toast.error('Failed to add to waitlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add to Waitlist</DialogTitle>
          <DialogDescription>
            Add a client to the appointment waitlist with their preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              <Select value={formData.client_id} onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.last_name}, {client.first_name} ({client.medical_record_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clinician">Primary Clinician *</Label>
              <Select value={formData.clinician_id} onValueChange={(value) => setFormData(prev => ({ ...prev, clinician_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select clinician" />
                </SelectTrigger>
                <SelectContent>
                  {clinicians.map(clinician => (
                    <SelectItem key={clinician.id} value={clinician.id}>
                      {clinician.last_name}, {clinician.first_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Appointment Type *</Label>
              <Select value={formData.appointment_type} onValueChange={(value) => setFormData(prev => ({ ...prev, appointment_type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Alternate Clinicians (Optional)</Label>
            <div className="border rounded-md p-3 space-y-2 max-h-32 overflow-y-auto">
              {clinicians.filter(c => c.id !== formData.clinician_id).map(clinician => (
                <div key={clinician.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`alt-${clinician.id}`}
                    checked={formData.alternate_clinician_ids.includes(clinician.id)}
                    onCheckedChange={() => handleAlternateClinicianToggle(clinician.id)}
                  />
                  <label htmlFor={`alt-${clinician.id}`} className="text-sm cursor-pointer">
                    {clinician.last_name}, {clinician.first_name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Preferred Days</Label>
            <div className="grid grid-cols-4 gap-2">
              {DAYS_OF_WEEK.map((day, index) => (
                <div key={day} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${day}`}
                    checked={formData.preferred_days.includes(day)}
                    onCheckedChange={() => handleDayToggle(day)}
                  />
                  <label htmlFor={`day-${day}`} className="text-sm cursor-pointer">
                    {DAY_NAMES[index]}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Preferred Times</Label>
            <div className="grid grid-cols-3 gap-2">
              {TIMES_OF_DAY.map(time => (
                <div key={time} className="flex items-center space-x-2">
                  <Checkbox
                    id={`time-${time}`}
                    checked={formData.preferred_times.includes(time)}
                    onCheckedChange={() => handleTimeToggle(time)}
                  />
                  <label htmlFor={`time-${time}`} className="text-sm cursor-pointer">
                    {time}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional information or special requests..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Adding...' : 'Add to Waitlist'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}