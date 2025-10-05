import { PortalLayout } from '@/components/portal/PortalLayout';

export default function PortalAppointments() {
  return (
    <PortalLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Appointments</h1>
        <p className="text-muted-foreground">View and manage your appointments</p>
        {/* TODO: Implement appointments view */}
      </div>
    </PortalLayout>
  );
}
