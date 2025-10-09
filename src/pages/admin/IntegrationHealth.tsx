import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { IntegrationHealthDashboard } from '@/components/admin/IntegrationHealthDashboard';

export default function IntegrationHealth() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Integration Health Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time monitoring of system integrations and service health
          </p>
        </div>

        <IntegrationHealthDashboard />
      </div>
    </DashboardLayout>
  );
}
