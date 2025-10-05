import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Mail, Shield, User as UserIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RoleBadge } from '@/components/admin/RoleBadge';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { AppRole } from '@/hooks/useUserRoles';

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  title: string | null;
  license_number: string | null;
  license_state: string | null;
  npi_number: string | null;
  dea_number: string | null;
  licensed_states: string[] | null;
  is_active: boolean;
  last_login_date: string | null;
  account_created_date: string | null;
  roles: AppRole[];
}

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    title: '',
    license_number: '',
    license_state: '',
    npi_number: '',
    dea_number: '',
  });

  useEffect(() => {
    if (id) {
      fetchUserProfile();
    }
  }, [id]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      
      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileError) throw profileError;

      // Fetch user roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', id);

      const roles = rolesData?.map(r => r.role as AppRole) || [];

      const userData: UserProfile = {
        ...profileData,
        roles,
      };

      setProfile(userData);
      setFormData({
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        title: userData.title || '',
        license_number: userData.license_number || '',
        license_state: userData.license_state || '',
        npi_number: userData.npi_number || '',
        dea_number: userData.dea_number || '',
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error('Failed to load user profile');
      navigate('/admin/users');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      fetchUserProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-8 max-w-4xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/users')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {profile.first_name} {profile.last_name}
            </h1>
            <p className="text-muted-foreground mt-1">{profile.email}</p>
          </div>
          <Badge variant={profile.is_active ? 'default' : 'outline'}>
            {profile.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Account Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Account Created</Label>
                <p className="font-medium">
                  {profile.account_created_date 
                    ? new Date(profile.account_created_date).toLocaleDateString()
                    : 'Unknown'}
                </p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Last Login</Label>
                <p className="font-medium">
                  {profile.last_login_date
                    ? formatDistanceToNow(new Date(profile.last_login_date), { addSuffix: true })
                    : 'Never'}
                </p>
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Roles</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {profile.roles.length > 0 ? (
                  profile.roles.map(role => (
                    <RoleBadge key={role} role={role} />
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No roles assigned</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              <CardTitle>Basic Information</CardTitle>
            </div>
            <CardDescription>Update user's basic profile information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="PhD, PsyD, LCSW, etc."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Professional Information</CardTitle>
            <CardDescription>License and credential details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="npi_number">NPI Number</Label>
                <Input
                  id="npi_number"
                  value={formData.npi_number}
                  onChange={(e) => setFormData({ ...formData, npi_number: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="dea_number">DEA Number</Label>
                <Input
                  id="dea_number"
                  value={formData.dea_number}
                  onChange={(e) => setFormData({ ...formData, dea_number: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button variant="outline" onClick={() => navigate('/admin/users')}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
