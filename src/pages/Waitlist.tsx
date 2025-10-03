import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { WaitlistManagement } from '@/components/schedule/WaitlistManagement';

export default function Waitlist() {
  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Appointment Waitlist</h1>
          <p className="text-muted-foreground">
            Manage clients waiting for available appointment slots
          </p>
        </div>

        <WaitlistManagement />
      </div>
    </DashboardLayout>
  );
}
