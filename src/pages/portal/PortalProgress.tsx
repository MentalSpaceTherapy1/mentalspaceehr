import { PortalLayout } from '@/components/portal/PortalLayout';

export default function PortalProgress() {
  return (
    <PortalLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Progress Tracking</h1>
        <p className="text-muted-foreground">Track your symptoms and progress</p>
        {/* TODO: Implement progress tracking */}
      </div>
    </PortalLayout>
  );
}
