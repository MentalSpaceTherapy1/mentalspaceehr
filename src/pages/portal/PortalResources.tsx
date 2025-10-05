import { PortalLayout } from '@/components/portal/PortalLayout';

export default function PortalResources() {
  return (
    <PortalLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Educational Resources</h1>
        <p className="text-muted-foreground">Access helpful materials and resources</p>
        {/* TODO: Implement resources library */}
      </div>
    </PortalLayout>
  );
}
