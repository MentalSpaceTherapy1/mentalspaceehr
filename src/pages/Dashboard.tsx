import { useState, useMemo } from 'react';
import { useCurrentUserRoles, AppRole } from '@/hooks/useUserRoles';
import { AdminDashboard } from '@/components/dashboards/AdminDashboard';
import { TherapistDashboard } from '@/components/dashboards/TherapistDashboard';
import { SupervisorDashboard } from '@/components/dashboards/SupervisorDashboard';
import { BillingDashboard } from '@/components/dashboards/BillingDashboard';
import { FrontDeskDashboard } from '@/components/dashboards/FrontDeskDashboard';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardSwitcher } from '@/components/dashboards/DashboardSwitcher';
import { useAuth } from '@/hooks/useAuth';

export default function Dashboard() {
  const { user } = useAuth();
  const { roles } = useCurrentUserRoles();

  // Determine default dashboard based on role priority
  const getDefaultRole = (): AppRole => {
    if (roles.includes('administrator')) return 'administrator';
    if (roles.includes('supervisor')) return 'supervisor';
    if (roles.includes('billing_staff')) return 'billing_staff';
    if (roles.includes('front_desk')) return 'front_desk';
    if (roles.includes('therapist')) return 'therapist';
    if (roles.includes('associate_trainee')) return 'associate_trainee';
    return 'therapist';
  };

  const [selectedRole, setSelectedRole] = useState<AppRole>(getDefaultRole());

  // Get the dashboard component based on selected role
  const getDashboardComponent = () => {
    switch (selectedRole) {
      case 'administrator':
        return <AdminDashboard />;
      case 'supervisor':
        return <SupervisorDashboard />;
      case 'billing_staff':
        return <BillingDashboard />;
      case 'front_desk':
        return <FrontDeskDashboard />;
      case 'therapist':
      case 'associate_trainee':
        return <TherapistDashboard />;
      default:
        return <TherapistDashboard />;
    }
  };

  const dashboardSwitcher = (
    <DashboardSwitcher
      availableRoles={roles}
      selectedRole={selectedRole}
      onRoleChange={setSelectedRole}
    />
  );

  return (
    <DashboardLayout dashboardSwitcher={dashboardSwitcher}>
      <div className="container mx-auto px-4 py-8">
        {getDashboardComponent()}
      </div>
    </DashboardLayout>
  );
}
