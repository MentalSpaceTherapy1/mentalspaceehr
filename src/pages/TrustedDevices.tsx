import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { getTrustedDevices, removeTrustedDevice } from '@/lib/api/trustedDevices';
import { ArrowLeft, Trash2, Monitor } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface TrustedDevice {
  id: string;
  device_name: string | null;
  last_used_at: string;
  created_at: string;
  expires_at: string;
}

export default function TrustedDevices() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceToRemove, setDeviceToRemove] = useState<TrustedDevice | null>(null);

  useEffect(() => {
    if (user) {
      fetchDevices();
    }
  }, [user]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const data = await getTrustedDevices(user!.id);
      setDevices(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load trusted devices',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!deviceToRemove) return;

    try {
      await removeTrustedDevice(deviceToRemove.id);
      toast({
        title: 'Success',
        description: 'Device removed successfully',
      });
      fetchDevices();
      setDeviceToRemove(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove device',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-8 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/profile')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold">Trusted Devices</h1>
          <p className="text-muted-foreground mt-2">
            Manage devices that can skip MFA verification for 30 days
          </p>
        </div>

        {devices.length === 0 ? (
          <Card className="p-8 text-center">
            <Monitor className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No trusted devices yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Check "Remember this device" when logging in to add a trusted device
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {devices.map((device) => (
              <Card key={device.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Monitor className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {device.device_name || 'Unknown Device'}
                      </h3>
                      <div className="text-sm text-muted-foreground space-y-1 mt-2">
                        <p>
                          Last used: {formatDistanceToNow(new Date(device.last_used_at), { addSuffix: true })}
                        </p>
                        <p>
                          Added: {formatDistanceToNow(new Date(device.created_at), { addSuffix: true })}
                        </p>
                        <p>
                          Expires: {formatDistanceToNow(new Date(device.expires_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeviceToRemove(device)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <AlertDialog open={!!deviceToRemove} onOpenChange={() => setDeviceToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Trusted Device</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this device? You'll need to enter your MFA code next
                time you log in from this device.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemove}>Remove</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
