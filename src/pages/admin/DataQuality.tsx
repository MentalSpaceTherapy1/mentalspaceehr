import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataQualityDashboard } from '@/components/admin/DataQualityDashboard';

const DataQuality = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Data Quality Monitoring</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and maintain data quality across critical system tables
          </p>
        </div>
        
        <DataQualityDashboard />
      </div>
    </DashboardLayout>
  );
};

export default DataQuality;
