import { PortalLayout } from '@/components/portal/PortalLayout';

export default function PortalBilling() {
  return (
    <PortalLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Billing & Payments</h1>
        <p className="text-muted-foreground">View your bills and payment history</p>
        {/* TODO: Implement billing view */}
      </div>
    </PortalLayout>
  );
}
