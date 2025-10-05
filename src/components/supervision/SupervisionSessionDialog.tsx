import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Calendar, Clock, Users } from "lucide-react";
import { format } from "date-fns";

interface SupervisionSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relationshipId: string;
  supervisorId: string;
  superviseeId: string;
  onSuccess?: () => void;
}

export function SupervisionSessionDialog({
  open,
  onOpenChange,
  relationshipId,
  supervisorId,
  superviseeId,
  onSuccess
}: SupervisionSessionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    session_date: format(new Date(), 'yyyy-MM-dd'),
    session_duration_minutes: 60,
    session_type: 'Direct',
    topics_covered: [] as string[],
    notes: '',
    supervisor_signature: '',
    supervisee_signature: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.session_date || !formData.session_duration_minutes) {
        toast.error("Please fill in session date and duration");
        return;
      }

      if (!formData.supervisor_signature || !formData.supervisee_signature) {
        toast.error("Both supervisor and supervisee signatures are required");
        return;
      }

      const { error } = await supabase.from('supervision_sessions').insert({
        relationship_id: relationshipId,
        session_date: formData.session_date,
        session_duration_minutes: formData.session_duration_minutes,
        session_type: formData.session_type,
        topics_covered: formData.topics_covered.length > 0 ? formData.topics_covered : null,
        notes: formData.notes || null,
        supervisor_signature: formData.supervisor_signature,
        supervisee_signature: formData.supervisee_signature
      });

      if (error) throw error;

      toast.success("Supervision session logged successfully");
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setFormData({
        session_date: format(new Date(), 'yyyy-MM-dd'),
        session_duration_minutes: 60,
        session_type: 'Direct',
        topics_covered: [],
        notes: '',
        supervisor_signature: '',
        supervisee_signature: ''
      });
    } catch (error: any) {
      console.error('Error logging session:', error);
      toast.error(error.message || "Failed to log supervision session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Log Supervision Session
          </DialogTitle>
          <DialogDescription>
            Record a supervision session with signatures from both parties
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Session Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="session_date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Session Date
                </Label>
                <Input
                  id="session_date"
                  type="date"
                  value={formData.session_date}
                  onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Duration (minutes)
                </Label>
                <Input
                  id="duration"
                  type="number"
                  min="15"
                  step="15"
                  value={formData.session_duration_minutes}
                  onChange={(e) => setFormData({ ...formData, session_duration_minutes: parseInt(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="session_type" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Session Type
              </Label>
              <Select
                value={formData.session_type}
                onValueChange={(value) => setFormData({ ...formData, session_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Direct">Direct Clinical Supervision</SelectItem>
                  <SelectItem value="Indirect">Indirect/Administrative</SelectItem>
                  <SelectItem value="Group">Group Supervision</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topics">Topics Covered (one per line)</Label>
              <Textarea
                id="topics"
                placeholder="Enter topics discussed, one per line"
                rows={3}
                value={formData.topics_covered.join('\n')}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  topics_covered: e.target.value.split('\n').filter(t => t.trim()) 
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Session Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about this supervision session"
                rows={4}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          {/* Signatures */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-semibold">Signatures (Required)</h4>
            
            <div className="space-y-2">
              <Label htmlFor="supervisor_sig">Supervisor Signature</Label>
              <Input
                id="supervisor_sig"
                placeholder="Type full name to sign"
                value={formData.supervisor_signature}
                onChange={(e) => setFormData({ ...formData, supervisor_signature: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                By signing, the supervisor confirms this session occurred as documented
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supervisee_sig">Supervisee Signature</Label>
              <Input
                id="supervisee_sig"
                placeholder="Type full name to sign"
                value={formData.supervisee_signature}
                onChange={(e) => setFormData({ ...formData, supervisee_signature: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                By signing, the supervisee confirms this session occurred as documented
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log Session
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}