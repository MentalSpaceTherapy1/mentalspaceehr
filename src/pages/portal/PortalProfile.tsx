import { PortalLayout } from '@/components/portal/PortalLayout';

export default function PortalProfile() {
  return (
    <PortalLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Manage your profile and preferences</p>
        {/* TODO: Implement profile management */}
      </div>
    </PortalLayout>
  );
}
