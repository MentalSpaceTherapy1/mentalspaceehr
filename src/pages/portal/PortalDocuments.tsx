import { PortalLayout } from '@/components/portal/PortalLayout';

export default function PortalDocuments() {
  return (
    <PortalLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Documents</h1>
        <p className="text-muted-foreground">View and sign your documents</p>
        {/* TODO: Implement documents view */}
      </div>
    </PortalLayout>
  );
}
