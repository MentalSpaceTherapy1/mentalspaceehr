import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Shield } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load profile',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(profile)
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">My Profile</h1>
          </div>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList>
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="professional">Professional</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <Card className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={profile.first_name || ''}
                    onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={profile.last_name || ''}
                    onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="middle_name">Middle Name</Label>
                  <Input
                    id="middle_name"
                    value={profile.middle_name || ''}
                    onChange={(e) => setProfile({ ...profile, middle_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="suffix">Suffix</Label>
                  <Input
                    id="suffix"
                    placeholder="Jr., Sr., III"
                    value={profile.suffix || ''}
                    onChange={(e) => setProfile({ ...profile, suffix: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="preferred_name">Preferred Name</Label>
                  <Input
                    id="preferred_name"
                    value={profile.preferred_name || ''}
                    onChange={(e) => setProfile({ ...profile, preferred_name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile.email} disabled />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="professional">
            <Card className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="PhD, PsyD, LCSW, etc."
                    value={profile.title || ''}
                    onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="license_number">License Number</Label>
                  <Input
                    id="license_number"
                    value={profile.license_number || ''}
                    onChange={(e) => setProfile({ ...profile, license_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="license_state">License State</Label>
                  <Input
                    id="license_state"
                    value={profile.license_state || ''}
                    onChange={(e) => setProfile({ ...profile, license_state: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="npi_number">NPI Number</Label>
                  <Input
                    id="npi_number"
                    value={profile.npi_number || ''}
                    onChange={(e) => setProfile({ ...profile, npi_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dea_number">DEA Number</Label>
                  <Input
                    id="dea_number"
                    value={profile.dea_number || ''}
                    onChange={(e) => setProfile({ ...profile, dea_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="taxonomy_code">Taxonomy Code</Label>
                  <Input
                    id="taxonomy_code"
                    value={profile.taxonomy_code || ''}
                    onChange={(e) => setProfile({ ...profile, taxonomy_code: e.target.value })}
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="contact">
            <Card className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <Input
                    id="phone_number"
                    type="tel"
                    value={profile.phone_number || ''}
                    onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="office_extension">Office Extension</Label>
                  <Input
                    id="office_extension"
                    value={profile.office_extension || ''}
                    onChange={(e) => setProfile({ ...profile, office_extension: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="personal_email">Personal Email</Label>
                <Input
                  id="personal_email"
                  type="email"
                  value={profile.personal_email || ''}
                  onChange={(e) => setProfile({ ...profile, personal_email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                  <Input
                    id="emergency_contact_name"
                    value={profile.emergency_contact_name || ''}
                    onChange={(e) => setProfile({ ...profile, emergency_contact_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                  <Input
                    id="emergency_contact_phone"
                    type="tel"
                    value={profile.emergency_contact_phone || ''}
                    onChange={(e) => setProfile({ ...profile, emergency_contact_phone: e.target.value })}
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Security</h3>
                <div className="space-y-4">
                  <Button variant="outline" onClick={() => navigate('/mfa-setup')}>
                    <Shield className="h-4 w-4 mr-2" />
                    Configure MFA
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/trusted-devices')} className="ml-2">
                    Manage Trusted Devices
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email_notifications">Email Notifications</Label>
                    <Switch
                      id="email_notifications"
                      checked={profile.notification_preferences?.emailNotifications ?? true}
                      onCheckedChange={(checked) =>
                        setProfile({
                          ...profile,
                          notification_preferences: {
                            ...profile.notification_preferences,
                            emailNotifications: checked,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="appointment_reminders">Appointment Reminders</Label>
                    <Switch
                      id="appointment_reminders"
                      checked={profile.notification_preferences?.appointmentReminders ?? true}
                      onCheckedChange={(checked) =>
                        setProfile({
                          ...profile,
                          notification_preferences: {
                            ...profile.notification_preferences,
                            appointmentReminders: checked,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="note_reminders">Note Reminders</Label>
                    <Switch
                      id="note_reminders"
                      checked={profile.notification_preferences?.noteReminders ?? true}
                      onCheckedChange={(checked) =>
                        setProfile({
                          ...profile,
                          notification_preferences: {
                            ...profile.notification_preferences,
                            noteReminders: checked,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Available for Scheduling</Label>
                  <p className="text-sm text-muted-foreground">Allow new appointments to be scheduled</p>
                </div>
                <Switch
                  checked={profile.available_for_scheduling ?? true}
                  onCheckedChange={(checked) =>
                    setProfile({ ...profile, available_for_scheduling: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Accepting New Patients</Label>
                  <p className="text-sm text-muted-foreground">Accept new patient assignments</p>
                </div>
                <Switch
                  checked={profile.accepts_new_patients ?? true}
                  onCheckedChange={(checked) =>
                    setProfile({ ...profile, accepts_new_patients: checked })
                  }
                />
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
