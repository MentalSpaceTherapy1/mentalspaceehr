import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ReleaseMetricsDashboard } from '@/components/admin/ReleaseMetricsDashboard';

const ReleaseMetrics = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Release Metrics & Reviews</h1>
          <p className="text-muted-foreground mt-2">
            Automated metrics collection and post-release review tracking
          </p>
        </div>
        
        <ReleaseMetricsDashboard />
      </div>
    </DashboardLayout>
  );
};

export default ReleaseMetrics;
