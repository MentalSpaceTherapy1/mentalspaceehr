import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CalendarIcon, ClipboardCheck } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface SupervisionRelationshipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  supervisorId: string;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export function SupervisionRelationshipDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  supervisorId 
}: SupervisionRelationshipDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  
  const [formData, setFormData] = useState({
    supervisee_id: '',
    relationship_type: 'Clinical Supervision' as const,
    start_date: new Date().toISOString().split('T')[0],
    required_supervision_hours: 100,
    required_direct_hours: 50,
    required_indirect_hours: 30,
    required_group_hours: 20,
    supervision_frequency: 'Weekly' as const,
    scheduled_day_time: '',
    requires_note_cosign: true,
    can_bill_incident_to: false,
    incident_to_start_date: null as Date | null,
    verification_notes: '',
  });

  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      
      // Get users with associate_trainee role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'associate_trainee');

      if (!roles || roles.length === 0) {
        setUsers([]);
        return;
      }

      const userIds = roles.map(r => r.user_id);
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds)
        .order('last_name');

      if (error) throw error;
      setUsers(profiles || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supervisee_id) {
      toast.error('Please select a supervisee');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('supervision_relationships')
        .insert({
          supervisor_id: supervisorId,
          supervisee_id: formData.supervisee_id,
          relationship_type: formData.relationship_type,
          start_date: formData.start_date,
          required_supervision_hours: formData.required_supervision_hours,
          required_direct_hours: formData.required_direct_hours,
          required_indirect_hours: formData.required_indirect_hours,
          required_group_hours: formData.required_group_hours,
          supervision_frequency: formData.supervision_frequency,
          scheduled_day_time: formData.scheduled_day_time || null,
          requires_note_cosign: formData.requires_note_cosign,
          can_bill_incident_to: formData.can_bill_incident_to,
          incident_to_start_date: formData.incident_to_start_date?.toISOString().split('T')[0] || null,
          incident_to_requirements_verified: formData.can_bill_incident_to ? {
            verifiedBy: user?.id,
            verifiedDate: new Date().toISOString(),
            verificationNotes: formData.verification_notes
          } : null,
        });

      if (error) throw error;

      toast.success('Supervision relationship created successfully');
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        supervisee_id: '',
        relationship_type: 'Clinical Supervision',
        start_date: new Date().toISOString().split('T')[0],
        required_supervision_hours: 100,
        required_direct_hours: 50,
        required_indirect_hours: 30,
        required_group_hours: 20,
        supervision_frequency: 'Weekly',
        scheduled_day_time: '',
        requires_note_cosign: true,
        can_bill_incident_to: false,
        incident_to_start_date: null,
        verification_notes: '',
      });
    } catch (error) {
      console.error('Error creating relationship:', error);
      toast.error('Failed to create supervision relationship');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Supervision Relationship</DialogTitle>
          <DialogDescription>
            Create a new supervision relationship with a supervisee
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supervisee">Supervisee *</Label>
            {loadingUsers ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <Select
                value={formData.supervisee_id}
                onValueChange={(value) => setFormData({ ...formData, supervisee_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supervisee" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="relationship_type">Relationship Type</Label>
            <Select
              value={formData.relationship_type}
              onValueChange={(value: any) => setFormData({ ...formData, relationship_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Clinical Supervision">Clinical Supervision</SelectItem>
                <SelectItem value="Administrative Supervision">Administrative Supervision</SelectItem>
                <SelectItem value="Training">Training</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supervision_frequency">Frequency</Label>
              <Select
                value={formData.supervision_frequency}
                onValueChange={(value: any) => setFormData({ ...formData, supervision_frequency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Biweekly">Biweekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="As Needed">As Needed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduled_day_time">Scheduled Day/Time (Optional)</Label>
            <Input
              id="scheduled_day_time"
              placeholder="e.g., Mondays at 2:00 PM"
              value={formData.scheduled_day_time}
              onChange={(e) => setFormData({ ...formData, scheduled_day_time: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="required_supervision_hours">Total Required Hours</Label>
              <Input
                id="required_supervision_hours"
                type="number"
                value={formData.required_supervision_hours}
                onChange={(e) => setFormData({ ...formData, required_supervision_hours: parseInt(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="required_direct_hours">Required Direct Hours</Label>
              <Input
                id="required_direct_hours"
                type="number"
                value={formData.required_direct_hours}
                onChange={(e) => setFormData({ ...formData, required_direct_hours: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="required_indirect_hours">Required Indirect Hours</Label>
              <Input
                id="required_indirect_hours"
                type="number"
                value={formData.required_indirect_hours}
                onChange={(e) => setFormData({ ...formData, required_indirect_hours: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="required_group_hours">Required Group Hours</Label>
              <Input
                id="required_group_hours"
                type="number"
                value={formData.required_group_hours}
                onChange={(e) => setFormData({ ...formData, required_group_hours: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requires_note_cosign"
                checked={formData.requires_note_cosign}
                onCheckedChange={(checked) => setFormData({ ...formData, requires_note_cosign: checked as boolean })}
              />
              <Label htmlFor="requires_note_cosign" className="cursor-pointer">
                Require supervisor co-signature on all notes
              </Label>
            </div>
          </div>

          <Separator />

          {/* Incident-to Billing Eligibility */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="can_bill_incident_to"
                checked={formData.can_bill_incident_to}
                onCheckedChange={(checked) => setFormData({ 
                  ...formData, 
                  can_bill_incident_to: checked as boolean,
                  incident_to_start_date: checked ? formData.incident_to_start_date : null,
                  verification_notes: checked ? formData.verification_notes : ''
                })}
              />
              <div className="flex-1">
                <Label htmlFor="can_bill_incident_to" className="cursor-pointer font-semibold flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  Qualified for Incident-to Billing
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Check if this supervisee meets Medicare incident-to billing requirements
                </p>
              </div>
            </div>

            {formData.can_bill_incident_to && (
              <div className="space-y-4 ml-6">
                <div className="space-y-2">
                  <Label htmlFor="incident_to_start_date">Eligibility Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.incident_to_start_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.incident_to_start_date ? (
                          format(formData.incident_to_start_date, 'PPP')
                        ) : (
                          <span>Select date when eligible</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.incident_to_start_date || undefined}
                        onSelect={(date) => setFormData({ ...formData, incident_to_start_date: date || null })}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    Date when supervisee became qualified for incident-to billing
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="verification_notes">Verification Notes</Label>
                  <Textarea
                    id="verification_notes"
                    placeholder="Document how requirements were verified (licenses, credentials, training, etc.)"
                    value={formData.verification_notes}
                    onChange={(e) => setFormData({ ...formData, verification_notes: e.target.value })}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Document verification of incident-to billing qualifications
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Relationship
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
