import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { usePortalFormTemplates } from '@/hooks/usePortalFormTemplates';
import { FormTemplate } from '@/types/forms';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: FormTemplate;
  clientId: string;
  onSuccess: () => void;
}

export const FormAssignmentDialog = ({
  open,
  onOpenChange,
  template,
  clientId,
  onSuccess,
}: FormAssignmentDialogProps) => {
  const [dueDate, setDueDate] = useState<Date>();
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [instructions, setInstructions] = useState('');
  const [sendNotification, setSendNotification] = useState(true);

  const { assignForm } = usePortalFormTemplates();

  const handleSubmit = async () => {
    assignForm.mutate({
      template_id: template.id,
      client_id: clientId,
      due_date: dueDate?.toISOString(),
      priority,
      instructions: instructions || undefined,
      saved_to_chart: false,
      status: 'assigned',
    });
    
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Form to Client</DialogTitle>
          <DialogDescription>
            Assign "{template.title}" for the client to complete via their portal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Form Template</Label>
            <div className="p-3 bg-muted rounded-md">
              <p className="font-medium">{template.title}</p>
              <p className="text-sm text-muted-foreground">{template.form_type}</p>
              {template.estimated_minutes && (
                <p className="text-sm text-muted-foreground mt-1">
                  Estimated time: ~{template.estimated_minutes} minutes
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due-date">Due Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dueDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, 'PPP') : <span>Pick a due date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                  className="pointer-events-auto"
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions for Client (Optional)</Label>
            <Textarea
              id="instructions"
              placeholder="Add any special instructions for completing this form..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="send-notification"
              checked={sendNotification}
              onCheckedChange={(checked) => setSendNotification(checked as boolean)}
            />
            <Label
              htmlFor="send-notification"
              className="text-sm font-normal cursor-pointer"
            >
              Send email notification to client
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={assignForm.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={assignForm.isPending}>
            {assignForm.isPending ? 'Assigning...' : 'Assign Form'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
