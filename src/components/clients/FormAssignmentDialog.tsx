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
  templates: FormTemplate[];
  clientId: string;
  onSuccess: () => void;
}

export const FormAssignmentDialog = ({
  open,
  onOpenChange,
  templates,
  clientId,
  onSuccess,
}: FormAssignmentDialogProps) => {
  const [dueDate, setDueDate] = useState<Date>();
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [instructions, setInstructions] = useState('');
  const [sendNotification, setSendNotification] = useState(true);

  const { assignForm, bulkAssignForms } = usePortalFormTemplates();
  
  const isBulk = templates.length > 1;

  const handleSubmit = async () => {
    if (isBulk) {
      bulkAssignForms.mutate({
        templateIds: templates.map(t => t.id),
        clientId,
        dueDate: dueDate?.toISOString(),
        priority,
        instructions: instructions || undefined,
        sendNotification,
      });
    } else {
      assignForm.mutate({
        template_id: templates[0].id,
        client_id: clientId,
        due_date: dueDate?.toISOString(),
        priority,
        instructions: instructions || undefined,
        saved_to_chart: false,
        status: 'assigned',
        sendNotification,
      });
    }
    
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isBulk ? `Assign ${templates.length} Forms to Client` : 'Assign Form to Client'}
          </DialogTitle>
          <DialogDescription>
            {isBulk 
              ? `Assign ${templates.length} forms for the client to complete via their portal`
              : `Assign "${templates[0].title}" for the client to complete via their portal`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isBulk ? (
            <div className="space-y-2">
              <Label>Forms to Assign ({templates.length})</Label>
              <div className="p-3 bg-muted rounded-md max-h-40 overflow-y-auto space-y-2">
                {templates.map(t => (
                  <div key={t.id} className="text-sm">
                    <p className="font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.form_type}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Form Template</Label>
              <div className="p-3 bg-muted rounded-md">
                <p className="font-medium">{templates[0].title}</p>
                <p className="text-sm text-muted-foreground">{templates[0].form_type}</p>
                {templates[0].estimated_minutes && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Estimated time: ~{templates[0].estimated_minutes} minutes
                  </p>
                )}
              </div>
            </div>
          )}

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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={assignForm.isPending || bulkAssignForms.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={assignForm.isPending || bulkAssignForms.isPending}>
            {(assignForm.isPending || bulkAssignForms.isPending) ? 'Assigning...' : `Assign ${isBulk ? 'Forms' : 'Form'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
