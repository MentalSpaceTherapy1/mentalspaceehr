import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  DollarSign, 
  Settings, 
  Building2,
  UserCog,
  Shield,
  ClipboardList,
  MapPin,
  Clock,
  LogOut
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { useCurrentUserRoles } from '@/hooks/useUserRoles';
import { isAdmin } from '@/lib/roleUtils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import logo from '@/assets/mentalspace-logo.png';
import { Separator } from '@/components/ui/separator';

export function AppSidebar() {
  const { open } = useSidebar();
  const collapsed = !open;
  const { roles } = useCurrentUserRoles();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const userIsAdmin = isAdmin(roles);

  const mainItems = [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, roles: ['all'] },
    { title: 'Schedule', url: '/schedule', icon: Calendar, roles: ['therapist', 'associate_trainee', 'supervisor', 'front_desk'] },
    { title: 'Patients', url: '/patients', icon: Users, roles: ['therapist', 'associate_trainee', 'supervisor', 'front_desk'] },
    { title: 'Clinical Notes', url: '/notes', icon: FileText, roles: ['therapist', 'associate_trainee', 'supervisor'] },
    { title: 'Billing', url: '/billing', icon: DollarSign, roles: ['billing_staff', 'administrator'] },
    { title: 'Front Desk', url: '/front-desk', icon: ClipboardList, roles: ['front_desk'] },
  ];

  const adminItems = [
    { title: 'User Management', url: '/admin/users', icon: UserCog },
    { title: 'Practice Settings', url: '/admin/practice-settings', icon: Building2 },
    { title: 'Locations', url: '/admin/locations', icon: MapPin },
  ];

  const hasAccess = (itemRoles: string[]) => {
    if (itemRoles.includes('all')) return true;
    if (userIsAdmin) return true;
    return roles.some(role => itemRoles.includes(role));
  };

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground' : 'hover:bg-accent';

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <img src={logo} alt="MentalSpace" className={collapsed ? "h-8" : "h-8"} />
          {!collapsed && (
            <span className="font-semibold text-lg">MentalSpace</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.filter(item => hasAccess(item.roles)).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        {userIsAdmin && (
          <>
            <Separator className="my-2" />
            <SidebarGroup>
              <SidebarGroupLabel>
                <Shield className="h-4 w-4 mr-2 inline" />
                {!collapsed && 'Administration'}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} className={getNavCls}>
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* Settings Section */}
        <Separator className="my-2" />
        <SidebarGroup>
          <SidebarGroupLabel>{!collapsed && 'Settings'}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/profile" className={getNavCls}>
                    <Settings className="h-4 w-4" />
                    {!collapsed && <span>Profile</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/mfa-setup" className={getNavCls}>
                    <Shield className="h-4 w-4" />
                    {!collapsed && <span>Security (MFA)</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <Button 
          variant="ghost" 
          className="w-full justify-start" 
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
