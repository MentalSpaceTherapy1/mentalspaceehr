import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePasswordExpiration } from '@/hooks/usePasswordExpiration';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

export function PasswordExpirationWarning() {
  const { daysUntilExpiration, isExpired, showWarning, loading } = usePasswordExpiration();
  const navigate = useNavigate();

  if (loading) return null;

  if (isExpired) {
    return (
      <AlertDialog open={true}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-6 w-6" />
              <AlertDialogTitle>Password Expired</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base">
              Your password has expired for security reasons. You must change your password to
              continue using the portal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => navigate('/profile?tab=security')}>
              Change Password Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  if (showWarning) {
    return (
      <AlertDialog open={true}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 text-amber-600">
              <AlertCircle className="h-6 w-6" />
              <AlertDialogTitle>Password Expiring Soon</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base">
              Your password will expire in {daysUntilExpiration} day
              {daysUntilExpiration !== 1 ? 's' : ''}. Please change your password to avoid losing
              access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => navigate('/profile?tab=security')}>
              Change Password
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return null;
}
