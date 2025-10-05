import { PortalLayout } from '@/components/portal/PortalLayout';

export default function PortalMessages() {
  return (
    <PortalLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Messages</h1>
        <p className="text-muted-foreground">Secure messaging with your care team</p>
        {/* TODO: Implement messaging */}
      </div>
    </PortalLayout>
  );
}
