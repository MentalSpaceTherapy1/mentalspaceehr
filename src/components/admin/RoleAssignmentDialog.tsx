import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AppRole } from '@/hooks/useUserRoles';
import { roleDisplayNames, roleDescriptions } from '@/lib/roleUtils';
import { assignRole, removeRole, checkIsLastAdmin } from '@/lib/api/userRoles';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface RoleAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentRoles: AppRole[];
  onRolesUpdated: () => void;
}

const allRoles: AppRole[] = ['administrator', 'supervisor', 'therapist', 'billing_staff', 'front_desk', 'associate_trainee'];

export const RoleAssignmentDialog = ({ 
  open, 
  onOpenChange, 
  userId, 
  userName, 
  currentRoles,
  onRolesUpdated 
}: RoleAssignmentDialogProps) => {
  const { user } = useAuth();
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>(currentRoles);
  const [loading, setLoading] = useState(false);
  const [showAdminWarning, setShowAdminWarning] = useState(false);

  const handleRoleToggle = (role: AppRole, checked: boolean) => {
    if (checked) {
      setSelectedRoles([...selectedRoles, role]);
    } else {
      if (role === 'administrator') {
        // Check if this is the last admin
        checkIsLastAdmin(userId).then(isLast => {
          if (isLast) {
            setShowAdminWarning(true);
            return;
          }
          setSelectedRoles(selectedRoles.filter(r => r !== role));
        });
      } else {
        setSelectedRoles(selectedRoles.filter(r => r !== role));
      }
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Find roles to add and remove
      const rolesToAdd = selectedRoles.filter(r => !currentRoles.includes(r));
      const rolesToRemove = currentRoles.filter(r => !selectedRoles.includes(r));

      // Add new roles
      for (const role of rolesToAdd) {
        await assignRole(userId, role, user.id);
      }

      // Remove roles
      for (const role of rolesToRemove) {
        await removeRole(userId, role);
      }

      toast({
        title: 'Success',
        description: `Roles updated for ${userName}`,
      });

      onRolesUpdated();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update roles',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Manage Roles</DialogTitle>
            <DialogDescription>
              Assign roles to {userName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {allRoles.map(role => (
              <div key={role} className="flex items-start space-x-3">
                <Checkbox
                  id={role}
                  checked={selectedRoles.includes(role)}
                  onCheckedChange={(checked) => handleRoleToggle(role, checked as boolean)}
                />
                <div className="space-y-1">
                  <Label htmlFor={role} className="text-sm font-medium cursor-pointer">
                    {roleDisplayNames[role]}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {roleDescriptions[role]}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showAdminWarning} onOpenChange={setShowAdminWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cannot Remove Last Administrator</AlertDialogTitle>
            <AlertDialogDescription>
              This user is the only administrator in the system. At least one administrator must remain to manage the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowAdminWarning(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
