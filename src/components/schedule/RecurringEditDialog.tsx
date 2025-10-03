import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Repeat } from 'lucide-react';

interface RecurringEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditSingle: () => void;
  onEditSeries: () => void;
  action: 'edit' | 'delete';
}

export function RecurringEditDialog({
  open,
  onOpenChange,
  onEditSingle,
  onEditSeries,
  action,
}: RecurringEditDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-primary" />
            {action === 'edit' ? 'Edit' : 'Delete'} Recurring Appointment
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-2">
            <p>This is a recurring appointment. Would you like to:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>
                <strong>This occurrence only:</strong> {action === 'edit' ? 'Changes' : 'Deletion'}{' '}
                will only affect this single appointment
              </li>
              <li>
                <strong>All occurrences:</strong> {action === 'edit' ? 'Changes' : 'Deletion'}{' '}
                will affect all appointments in this series
              </li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onEditSingle}
            className="border-2 border-primary/40 bg-background text-foreground hover:bg-muted"
          >
            This Occurrence Only
          </AlertDialogAction>
          <AlertDialogAction onClick={onEditSeries} className="bg-primary">
            All Occurrences
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
