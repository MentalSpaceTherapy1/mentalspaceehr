import { useAuth } from '@/hooks/useAuth';
import { useCurrentUserRoles } from '@/hooks/useUserRoles';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, Shield } from 'lucide-react';
import { RoleBadge } from '@/components/admin/RoleBadge';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/mentalspace-logo.png';
import { AdminDashboard } from '@/components/dashboards/AdminDashboard';
import { TherapistDashboard } from '@/components/dashboards/TherapistDashboard';
import { SupervisorDashboard } from '@/components/dashboards/SupervisorDashboard';
import { BillingDashboard } from '@/components/dashboards/BillingDashboard';
import { FrontDeskDashboard } from '@/components/dashboards/FrontDeskDashboard';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { roles } = useCurrentUserRoles();
  const navigate = useNavigate();

  // Determine which dashboard to show based on primary role
  const getDashboardComponent = () => {
    if (roles.includes('administrator')) return <AdminDashboard />;
    if (roles.includes('supervisor')) return <SupervisorDashboard />;
    if (roles.includes('billing_staff')) return <BillingDashboard />;
    if (roles.includes('front_desk')) return <FrontDeskDashboard />;
    if (roles.includes('therapist') || roles.includes('associate_trainee')) return <TherapistDashboard />;
    
    // Default fallback
    return <TherapistDashboard />;
  };

  const getDashboardTitle = () => {
    if (roles.includes('administrator')) return 'Administrator Dashboard';
    if (roles.includes('supervisor')) return 'Supervisor Dashboard';
    if (roles.includes('billing_staff')) return 'Billing Dashboard';
    if (roles.includes('front_desk')) return 'Front Desk Dashboard';
    if (roles.includes('therapist')) return 'Clinician Dashboard';
    if (roles.includes('associate_trainee')) return 'Associate Dashboard';
    return 'Dashboard';
  };

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
          <h2 className="text-3xl font-bold mb-2">{getDashboardTitle()}</h2>
          <p className="text-muted-foreground">
            Welcome back, {user?.email?.split('@')[0]}
          </p>
        </div>

        {/* Role-based dashboard content */}
        {getDashboardComponent()}
      </main>
    </div>
  );
}
