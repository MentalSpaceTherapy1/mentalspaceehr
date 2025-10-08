import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUserRoles, AppRole } from '@/hooks/useUserRoles';
import { AdminDashboard } from '@/components/dashboards/AdminDashboard';
import { TherapistDashboard } from '@/components/dashboards/TherapistDashboard';
import { SupervisorDashboard } from '@/components/dashboards/SupervisorDashboard';
import { BillingDashboard } from '@/components/dashboards/BillingDashboard';
import { FrontDeskDashboard } from '@/components/dashboards/FrontDeskDashboard';
import { AssociateDashboard } from '@/components/dashboards/AssociateDashboard';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardSwitcher } from '@/components/dashboards/DashboardSwitcher';
import { useAuth } from '@/hooks/useAuth';

export default function Dashboard() {
  const { user } = useAuth();
  const { roles, loading } = useCurrentUserRoles();
  const navigate = useNavigate();

  console.log('[Dashboard] Rendering with roles:', roles, 'loading:', loading);

  // Redirect client users to portal
  useEffect(() => {
    if (!loading && roles.length > 0) {
      // If user only has client_user role, redirect to portal
      if (roles.length === 1 && roles[0] === 'client_user') {
        navigate('/portal');
      }
    }
  }, [roles, loading, navigate]);

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

  // Update selected role when roles change
  useEffect(() => {
    if (roles.length > 0 && !roles.includes(selectedRole)) {
      setSelectedRole(getDefaultRole());
    }
  }, [roles]);

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
        return <TherapistDashboard />;
      case 'associate_trainee':
        return <AssociateDashboard />;
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
