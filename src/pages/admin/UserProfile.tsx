import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Mail, Shield, User as UserIcon, UserCog, GraduationCap, Send, Key, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RoleBadge } from '@/components/admin/RoleBadge';
import { RoleAssignmentDialog } from '@/components/admin/RoleAssignmentDialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';
import { AppRole } from '@/hooks/useUserRoles';
import { toggleUserActive } from '@/lib/api/users';
import { checkRateLimit } from '@/lib/rateLimit';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

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
  const [sendingInvite, setSendingInvite] = useState(false);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [showPasswordResetDialog, setShowPasswordResetDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [supervisors, setSupervisors] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>('');
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
      fetchSupervisors();
    }
  }, [id]);

  const fetchSupervisors = async () => {
    try {
      // Fetch users with supervisor role
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, profiles!user_roles_user_id_fkey(id, first_name, last_name)')
        .eq('role', 'supervisor');

      if (error) throw error;

      const supervisorList = data
        ?.filter(item => item.profiles)
        .map(item => ({
          id: (item.profiles as any).id,
          name: `${(item.profiles as any).first_name} ${(item.profiles as any).last_name}`,
        })) || [];

      setSupervisors(supervisorList);
    } catch (error) {
      console.error('Error fetching supervisors:', error);
    }
  };

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

      // Fetch supervisor relationship if exists
      const { data: supervisionData } = await supabase
        .from('supervision_relationships')
        .select('supervisor_id')
        .eq('supervisee_id', id)
        .eq('status', 'Active')
        .maybeSingle();

      if (supervisionData) {
        setSelectedSupervisor(supervisionData.supervisor_id);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error('Failed to load user profile');
      navigate('/admin/users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!id || !profile) return;

    try {
      await toggleUserActive(id, !profile.is_active);
      toast.success(`User ${profile.is_active ? 'deactivated' : 'activated'} successfully`);
      fetchUserProfile();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const handleSendInvite = async () => {
    if (!id || !profile) return;

    // SECURITY: Rate limit invitation sending to 10 per hour
    const rateLimit = checkRateLimit(profile.id, 'send_invitation', 10, 60 * 60 * 1000);
    if (rateLimit.isLimited) {
      toast.error(`Too many invitation attempts. Please try again after ${rateLimit.resetTime?.toLocaleTimeString()}`);
      return;
    }

    setSendingInvite(true);
    try {
      // Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-12) + 'Aa1!';

      const { error } = await supabase.functions.invoke('send-staff-invitation', {
        body: {
          userId: id,
          tempPassword: tempPassword,
        },
      });

      if (error) throw error;

      toast.success('Invitation email sent successfully!');
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation email');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleSendPasswordResetEmail = async () => {
    if (!id || !profile) return;

    // SECURITY: Rate limit password reset requests to 5 per hour
    const rateLimit = checkRateLimit(profile.id, 'password_reset_email', 5, 60 * 60 * 1000);
    if (rateLimit.isLimited) {
      toast.error(`Too many password reset attempts. Please try again after ${rateLimit.resetTime?.toLocaleTimeString()}`);
      return;
    }

    setSendingPasswordReset(true);
    try {
      // Generate password reset link using Supabase Auth
      const { data, error } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: profile.email,
      });

      if (error) throw error;

      if (!data.properties?.action_link) {
        throw new Error('Failed to generate reset link');
      }

      // Send email with the reset link
      const { error: emailError } = await supabase.functions.invoke('send-password-reset', {
        body: {
          email: profile.email,
          resetUrl: data.properties.action_link,
          firstName: profile.first_name,
        },
      });

      if (emailError) throw emailError;

      toast.success('Password reset email sent successfully!');
    } catch (error) {
      console.error('Error sending password reset email:', error);
      toast.error('Failed to send password reset email');
    } finally {
      setSendingPasswordReset(false);
    }
  };

  const handleManualPasswordReset = async () => {
    if (!id || !profile || !newPassword) return;

    // Validate password complexity
    if (newPassword.length < 12) {
      toast.error('Password must be at least 12 characters long');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      toast.error('Password must contain at least one uppercase letter');
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      toast.error('Password must contain at least one lowercase letter');
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      toast.error('Password must contain at least one number');
      return;
    }
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      toast.error('Password must contain at least one special character');
      return;
    }

    setResettingPassword(true);
    try {
      // Update user password using admin API
      const { error } = await supabase.auth.admin.updateUserById(id, {
        password: newPassword,
      });

      if (error) throw error;

      toast.success('Password reset successfully!');
      setShowPasswordResetDialog(false);
      setNewPassword('');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Failed to reset password');
    } finally {
      setResettingPassword(false);
    }
  };

  const generateStrongPassword = () => {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one of each required character type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
    
    // Fill the rest
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  const handleAssignSupervisor = async () => {
    if (!id || !selectedSupervisor) return;

    try {
      // SECURITY: Validate supervisor qualifications before assignment
      const { data: supervisorProfile, error: supervisorError } = await supabase
        .from('profiles')
        .select('is_active, license_number, licensed_states')
        .eq('id', selectedSupervisor)
        .single();

      if (supervisorError) throw supervisorError;

      // Verify supervisor is active
      if (!supervisorProfile.is_active) {
        toast.error('Cannot assign inactive supervisor');
        return;
      }

      // Verify supervisor has required license
      if (!supervisorProfile.license_number) {
        toast.error('Supervisor must have a valid license number');
        return;
      }

      // Check supervisor capacity (max 10 supervisees)
      const { count: superviseeCount } = await supabase
        .from('supervision_relationships')
        .select('*', { count: 'exact', head: true })
        .eq('supervisor_id', selectedSupervisor)
        .eq('status', 'Active');

      if (superviseeCount && superviseeCount >= 10) {
        toast.error('Supervisor has reached maximum capacity (10 supervisees)');
        return;
      }

      // Check if relationship already exists
      const { data: existing } = await supabase
        .from('supervision_relationships')
        .select('id')
        .eq('supervisee_id', id)
        .eq('supervisor_id', selectedSupervisor)
        .maybeSingle();

      if (existing) {
        // Update existing relationship to active
        const { error } = await supabase
          .from('supervision_relationships')
          .update({ status: 'Active' })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new relationship
        const { error } = await supabase
          .from('supervision_relationships')
          .insert({
            supervisor_id: selectedSupervisor,
            supervisee_id: id,
            status: 'Active',
            start_date: new Date().toISOString().split('T')[0],
          });

        if (error) throw error;
      }

      toast.success('Supervisor assigned successfully');
      fetchUserProfile();
    } catch (error) {
      console.error('Error assigning supervisor:', error);
      toast.error('Failed to assign supervisor');
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
          <div className="flex items-center gap-3">
            <Badge variant={profile.is_active ? 'default' : 'outline'}>
              {profile.is_active ? 'Active' : 'Inactive'}
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSendInvite}
              disabled={sendingInvite}
            >
              <Send className="h-4 w-4 mr-2" />
              {sendingInvite ? 'Sending...' : 'Send Invite'}
            </Button>
          </div>
        </div>

        {/* Account Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <CardTitle>Account Management</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Account Status</Label>
                <p className="text-sm text-muted-foreground">
                  Enable or disable user access to the system
                </p>
              </div>
              <Switch
                checked={profile.is_active}
                onCheckedChange={handleToggleActive}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
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

            <div className="pt-4 border-t space-y-3">
              <Label className="text-sm font-semibold">Password Management</Label>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPasswordResetDialog(true)}
                  className="flex-1"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Reset Password
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendPasswordResetEmail}
                  disabled={sendingPasswordReset}
                  className="flex-1"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {sendingPasswordReset ? 'Sending...' : 'Send Reset Email'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Reset passwords manually or send a secure reset link via email
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Roles Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                <CardTitle>Roles & Permissions</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRoleDialogOpen(true)}
              >
                <UserCog className="h-4 w-4 mr-2" />
                Manage Roles
              </Button>
            </div>
            <CardDescription>Assign system roles to control user permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {profile.roles.length > 0 ? (
                profile.roles.map(role => (
                  <RoleBadge key={role} role={role} />
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No roles assigned</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Supervision Assignment */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              <CardTitle>Supervision</CardTitle>
            </div>
            <CardDescription>Assign a supervisor for clinical oversight</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="supervisor">Supervisor</Label>
                <Select value={selectedSupervisor} onValueChange={setSelectedSupervisor}>
                  <SelectTrigger id="supervisor">
                    <SelectValue placeholder="Select a supervisor" />
                  </SelectTrigger>
                  <SelectContent>
                    {supervisors.map(supervisor => (
                      <SelectItem key={supervisor.id} value={supervisor.id}>
                        {supervisor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-6">
                <Button
                  variant="secondary"
                  onClick={handleAssignSupervisor}
                  disabled={!selectedSupervisor}
                >
                  Assign Supervisor
                </Button>
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

        {/* Role Assignment Dialog */}
        {profile && (
          <RoleAssignmentDialog
            open={roleDialogOpen}
            onOpenChange={setRoleDialogOpen}
            userId={profile.id}
            userName={`${profile.first_name} ${profile.last_name}`}
            currentRoles={profile.roles}
            onRolesUpdated={fetchUserProfile}
          />
        )}

        {/* Password Reset Dialog */}
        <AlertDialog open={showPasswordResetDialog} onOpenChange={setShowPasswordResetDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Reset Password for {profile?.first_name} {profile?.last_name}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Set a new password for this user. The password must meet security requirements.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="flex gap-2">
                  <Input
                    id="new-password"
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setNewPassword(generateStrongPassword())}
                    title="Generate strong password"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Requirements: min 12 characters, uppercase, lowercase, number, special character
                </p>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleManualPasswordReset}
                disabled={!newPassword || resettingPassword}
              >
                {resettingPassword ? 'Resetting...' : 'Reset Password'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
