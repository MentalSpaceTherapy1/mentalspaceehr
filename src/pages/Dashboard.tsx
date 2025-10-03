import { useAuth } from '@/hooks/useAuth';
import { useCurrentUserRoles } from '@/hooks/useUserRoles';
import { isAdmin } from '@/lib/roleUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Calendar, FileText, Users, LogOut, Settings, Shield } from 'lucide-react';
import { RoleBadge } from '@/components/admin/RoleBadge';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/mentalspace-logo.png';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { roles } = useCurrentUserRoles();
  const navigate = useNavigate();
  const userIsAdmin = isAdmin(roles);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="MentalSpace" className="h-10" />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user?.email}
              </span>
              <div className="flex gap-1">
                {roles.map(role => (
                  <RoleBadge key={role} role={role} showTooltip={false} />
                ))}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/profile')}>
              <Settings className="h-4 w-4 mr-2" />
              Profile
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/mfa-setup')}>
              <Shield className="h-4 w-4 mr-2" />
              MFA
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome to Your Dashboard</h2>
          <p className="text-muted-foreground">
            Quick overview of your practice
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today's Appointments
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                No appointments scheduled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Patients
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                No active patients yet
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Notes
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                All caught up!
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Supervision Hours
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0 / 0</div>
              <p className="text-xs text-muted-foreground">
                Hours completed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Appointment</CardTitle>
              <CardDescription>
                Book a new patient appointment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                New Appointment
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Document Session</CardTitle>
              <CardDescription>
                Create a new clinical note
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                New Note
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Patient Management</CardTitle>
              <CardDescription>
                View and manage patient records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                <Users className="h-4 w-4 mr-2" />
                View Patients
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Admin Panel - Only visible to administrators */}
        {userIsAdmin && (
          <Card className="mt-8 p-6 border-primary/20 bg-primary/5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Admin Panel</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Manage users, roles, and system settings
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => navigate('/admin/users')}>
                  <Users className="mr-2 h-4 w-4" />
                  Manage Users
                </Button>
                <Button variant="outline" onClick={() => navigate('/admin/practice-settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Practice Settings
                </Button>
              </div>
            </div>
          </Card>
        )}

      </main>
    </div>
  );
}
