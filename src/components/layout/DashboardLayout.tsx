import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { RoleBadge } from '@/components/admin/RoleBadge';
import { useCurrentUserRoles } from '@/hooks/useUserRoles';

interface DashboardLayoutProps {
  children: React.ReactNode;
  dashboardSwitcher?: React.ReactNode;
}

export function DashboardLayout({ children, dashboardSwitcher }: DashboardLayoutProps) {
  const { user } = useAuth();
  const { roles } = useCurrentUserRoles();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col w-full">
          {/* Top Header */}
          <header className="sticky top-0 z-10 border-b bg-gradient-to-r from-card/95 to-primary/5 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-sm">
            <div className="flex h-14 items-center gap-4 px-4">
              <SidebarTrigger />
              
              {dashboardSwitcher && (
                <div className="flex-1 flex justify-center">
                  {dashboardSwitcher}
                </div>
              )}
              {!dashboardSwitcher && <div className="flex-1" />}
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {user?.email}
                </span>
                <div className="flex gap-1">
                  {roles.map(role => (
                    <RoleBadge key={role} role={role} showTooltip={false} />
                  ))}
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
