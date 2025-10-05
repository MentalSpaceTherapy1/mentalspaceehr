import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

interface SessionTimeoutWarningProps {
  open: boolean;
  minutesRemaining: number;
  onExtend: () => void;
  onEnd: () => void;
}

export const SessionTimeoutWarning = ({
  open,
  minutesRemaining,
  onExtend,
  onEnd
}: SessionTimeoutWarningProps) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Your telehealth session will automatically end in {minutesRemaining} minute{minutesRemaining !== 1 ? 's' : ''} due to the 2-hour time limit.
            {minutesRemaining > 5 && (
              <span className="block mt-2">
                You can continue your session or end it now.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-2">
          <Button onClick={onEnd} variant="outline">
            End Session Now
          </Button>
          <AlertDialogAction onClick={onExtend}>
            Continue Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
