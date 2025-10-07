import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ClipboardList, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface AssignAssessmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onAssigned?: () => void;
}

export const AssignAssessmentDialog = ({
  open,
  onOpenChange,
  clientId,
  onAssigned,
}: AssignAssessmentDialogProps) => {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [assignViaPortal, setAssignViaPortal] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchAssessments();
    }
  }, [open]);

  const fetchAssessments = async () => {
    const { data } = await supabase
      .from('clinical_assessments')
      .select('id, assessment_name')
      .eq('is_active', true)
      .order('assessment_name');

    if (data) {
      setAssessments(data);
    }
  };

  const handleAssign = async () => {
    if (!selectedAssessmentId) return;

    setIsSubmitting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('assessment_administrations')
        .insert({
          assessment_id: selectedAssessmentId,
          client_id: clientId,
          administered_by: user.user.id,
          assigned_via_portal: assignViaPortal,
          portal_assigned_date: assignViaPortal ? new Date().toISOString() : null,
          portal_due_date: dueDate || null,
          completion_status: 'In Progress',
          responses: {},
        });

      if (error) throw error;

      toast({
        title: 'Assessment assigned successfully',
        description: assignViaPortal
          ? 'Client will be notified to complete via portal'
          : 'Ready for in-session administration',
      });

      onOpenChange(false);
      onAssigned?.();
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Error assigning assessment',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedAssessmentId('');
    setAssignViaPortal(false);
    setDueDate('');
    setInstructions('');
  };

  const selectedAssessment = assessments.find((a) => a.id === selectedAssessmentId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Assign Assessment
          </DialogTitle>
          <DialogDescription>
            Assign an assessment for the client to complete
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Assessment</Label>
            <Select value={selectedAssessmentId} onValueChange={setSelectedAssessmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select assessment" />
              </SelectTrigger>
              <SelectContent>
                {assessments.map((assessment) => (
                  <SelectItem key={assessment.id} value={assessment.id}>
                    {assessment.assessment_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="portal"
              checked={assignViaPortal}
              onCheckedChange={(checked) => setAssignViaPortal(checked as boolean)}
            />
            <Label htmlFor="portal" className="text-sm">
              Assign via client portal
            </Label>
          </div>

          {assignViaPortal && (
            <>
              <div>
                <Label htmlFor="dueDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Due Date (Optional)
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="instructions">Instructions (Optional)</Label>
                <Textarea
                  id="instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Any special instructions for the client..."
                  rows={3}
                  className="mt-2"
                />
              </div>
            </>
          )}

          {selectedAssessment && (
            <div className="text-sm text-muted-foreground p-3 bg-muted rounded">
              <p className="font-medium">{selectedAssessment.assessment_name}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={isSubmitting || !selectedAssessmentId}>
            {isSubmitting ? 'Assigning...' : 'Assign Assessment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
