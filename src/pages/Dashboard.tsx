import { useCurrentUserRoles } from '@/hooks/useUserRoles';
import { AdminDashboard } from '@/components/dashboards/AdminDashboard';
import { TherapistDashboard } from '@/components/dashboards/TherapistDashboard';
import { SupervisorDashboard } from '@/components/dashboards/SupervisorDashboard';
import { BillingDashboard } from '@/components/dashboards/BillingDashboard';
import { FrontDeskDashboard } from '@/components/dashboards/FrontDeskDashboard';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';

export default function Dashboard() {
  const { user } = useAuth();
  const { roles } = useCurrentUserRoles();

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
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">{getDashboardTitle()}</h2>
          <p className="text-muted-foreground">
            Welcome back, {user?.email?.split('@')[0]}
          </p>
        </div>

        {/* Role-based dashboard content */}
        {getDashboardComponent()}
      </div>
    </DashboardLayout>
  );
}
