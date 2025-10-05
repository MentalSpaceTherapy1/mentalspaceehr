import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function CreateUser() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sendInvitation, setSendInvitation] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    title: '',
    license_number: '',
    license_state: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-12) + 'Aa1!';

      // Create user via edge function
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email,
          password: tempPassword,
          profile: formData,
        },
      });

      if (error) throw error;

      // Send invitation email if requested
      if (sendInvitation && data?.user?.id) {
        try {
          const { error: inviteError } = await supabase.functions.invoke('send-staff-invitation', {
            body: {
              userId: data.user.id,
              tempPassword: tempPassword,
            },
          });

          if (inviteError) {
            console.error('Failed to send invitation:', inviteError);
            toast({
              title: 'User Created',
              description: `User created successfully but invitation email failed to send. Temporary password: ${tempPassword}`,
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Success',
              description: 'User created and invitation email sent successfully!',
            });
          }
        } catch (inviteError) {
          console.error('Invitation error:', inviteError);
          toast({
            title: 'User Created',
            description: `User created. Temporary password: ${tempPassword}. Email invitation failed.`,
          });
        }
      } else {
        toast({
          title: 'Success',
          description: `User created. Temporary password: ${tempPassword}`,
        });
      }

      navigate('/admin/users');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create user',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-8 max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/users')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-6">Create New User</h1>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="PhD, PsyD, LCSW, etc."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="license_number">License Number</Label>
                <Input
                  id="license_number"
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="license_state">License State</Label>
                <Input
                  id="license_state"
                  placeholder="CA, NY, etc."
                  value={formData.license_state}
                  onChange={(e) => setFormData({ ...formData, license_state: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-4 pb-2">
              <Checkbox
                id="send_invitation"
                checked={sendInvitation}
                onCheckedChange={(checked) => setSendInvitation(checked as boolean)}
              />
              <Label htmlFor="send_invitation" className="text-sm font-normal cursor-pointer">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Send invitation email with login credentials
                </div>
              </Label>
            </div>

            <div className="flex gap-4 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create User'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/admin/users')}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
