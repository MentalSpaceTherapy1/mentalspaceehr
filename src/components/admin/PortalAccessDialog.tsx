import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Loader2, UserCheck, UserX, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { enablePortalAccess, disablePortalAccess, sendPortalInvitation } from '@/lib/portalAccountUtils';

interface PortalAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  currentEmail?: string;
  portalEnabled: boolean;
  portalUserId?: string;
  onUpdate: () => void;
}

export const PortalAccessDialog = ({
  open,
  onOpenChange,
  clientId,
  clientName,
  currentEmail,
  portalEnabled,
  portalUserId,
  onUpdate
}: PortalAccessDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(portalEnabled);
  const [email, setEmail] = useState(currentEmail || '');
  const [sendInvite, setSendInvite] = useState(!portalUserId);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Update portal access
      if (enabled !== portalEnabled) {
        if (enabled) {
          const result = await enablePortalAccess(clientId, 'current-user'); // Replace with actual user ID
          if (!result.success) {
            toast.error(result.error || 'Failed to enable portal access');
            return;
          }
        } else {
          const result = await disablePortalAccess(clientId);
          if (!result.success) {
            toast.error(result.error || 'Failed to disable portal access');
            return;
          }
        }
      }

      // Send invitation if requested and enabling portal
      if (enabled && sendInvite && email) {
        const result = await sendPortalInvitation(clientId, email, 'current-user');
        if (!result.success) {
          toast.error(result.error || 'Failed to send invitation');
          return;
        }
        toast.success('Portal invitation sent successfully');
      }

      toast.success('Portal access updated successfully');
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating portal access:', error);
      toast.error('Failed to update portal access');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Portal Access</DialogTitle>
          <DialogDescription>
            Configure portal access for {clientName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Enable/Disable Portal */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Portal Access</Label>
              <p className="text-sm text-muted-foreground">
                Allow client to access the portal
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          {enabled && (
            <>
              {/* Email for invitation */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@example.com"
                />
                <p className="text-xs text-muted-foreground">
                  Client will receive portal login credentials at this email
                </p>
              </div>

              {/* Send invitation option */}
              {!portalUserId && (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Send Invitation</Label>
                    <p className="text-sm text-muted-foreground">
                      Email portal setup instructions
                    </p>
                  </div>
                  <Switch
                    checked={sendInvite}
                    onCheckedChange={setSendInvite}
                  />
                </div>
              )}

              {/* Account status */}
              {portalUserId && (
                <div className="rounded-md bg-muted p-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium">Portal Account Active</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Client has completed portal setup
                  </p>
                </div>
              )}
            </>
          )}

          {!enabled && portalUserId && (
            <div className="rounded-md bg-destructive/10 p-3">
              <div className="flex items-center gap-2">
                <UserX className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">
                  Disabling Portal Access
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Client will no longer be able to access the portal
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || (enabled && !email)}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
