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
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { checkRateLimit } from '@/lib/rateLimit';

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

    // SECURITY: Rate limit user creation to 10 per hour
    const rateLimit = await checkRateLimit(user.id, 'create_user', 10, 60);
    if (rateLimit.isLimited) {
      toast({
        title: 'Rate Limit Exceeded',
        description: `Too many user creation attempts. Please try again after ${rateLimit.resetTime?.toLocaleTimeString()}`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-12) + 'Aa1!';

      // HARDCODED for now to bypass environment variable caching issues
      const apiEndpoint = 'https://cyf1w472y8.execute-api.us-east-1.amazonaws.com';

      console.log('[CreateUser] Creating user via AWS API:', formData.email);

      // Create user via AWS Lambda
      const response = await fetch(`${apiEndpoint}/users/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: tempPassword,
          profile: formData,
        }),
      });

      console.log('[CreateUser] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CreateUser] Error response:', errorText);
        throw new Error(`Failed to create user: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[CreateUser] Result:', result);

      // TODO: Send invitation email if requested
      // For now, just show success message with temp password
      if (sendInvitation) {
        toast({
          title: 'User Created',
          description: `User created successfully. Temporary password: ${tempPassword}. (Email invitation not yet implemented)`,
        });
      } else {
        toast({
          title: 'Success',
          description: `User created. Temporary password: ${tempPassword}`,
        });
      }

      navigate('/admin/users');
    } catch (error) {
      console.error('[CreateUser] Caught error:', error);
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
