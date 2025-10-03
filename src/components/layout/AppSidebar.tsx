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
  LogOut,
  CheckSquare
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
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, roles: ['all'], color: 'from-primary to-accent' },
    { title: 'Schedule', url: '/schedule', icon: Calendar, roles: ['therapist', 'associate_trainee', 'supervisor', 'front_desk'], color: 'from-secondary to-primary' },
    { title: 'Patients', url: '/patients', icon: Users, roles: ['therapist', 'associate_trainee', 'supervisor', 'front_desk'], color: 'from-accent to-primary' },
    { title: 'Clinical Notes', url: '/notes', icon: FileText, roles: ['therapist', 'associate_trainee', 'supervisor'], color: 'from-warning to-accent' },
    { title: 'Tasks', url: '/tasks', icon: CheckSquare, roles: ['all'], color: 'from-blue-400 to-purple-400' },
    { title: 'Billing', url: '/billing', icon: DollarSign, roles: ['billing_staff', 'administrator'], color: 'from-success to-accent' },
    { title: 'Front Desk', url: '/front-desk', icon: ClipboardList, roles: ['front_desk'], color: 'from-primary to-secondary' },
  ];

  const adminItems = [
    { title: 'User Management', url: '/admin/users', icon: UserCog, color: 'from-secondary to-accent' },
    { title: 'Practice Settings', url: '/admin/practice-settings', icon: Building2, color: 'from-primary to-success' },
    { title: 'Locations', url: '/admin/locations', icon: MapPin, color: 'from-accent to-secondary' },
  ];

  const settingsItems = [
    { title: 'Profile', url: '/profile', icon: Settings, color: 'from-primary to-accent' },
    { title: 'Security (MFA)', url: '/mfa-setup', icon: Shield, color: 'from-secondary to-primary' },
  ];

  const hasAccess = (itemRoles: string[]) => {
    if (itemRoles.includes('all')) return true;
    if (userIsAdmin) return true;
    return roles.some(role => itemRoles.includes(role));
  };

  const getNavCls = (isActive: boolean, colorGradient: string) =>
    isActive 
      ? `bg-gradient-to-r ${colorGradient} text-white hover:opacity-90 shadow-md border-l-4 border-l-white/50` 
      : 'hover:bg-sidebar-accent transition-all duration-200 hover:border-l-4 hover:border-l-sidebar-primary/30';

  return (
    <Sidebar collapsible="icon" className="border-r shadow-lg">
      <SidebarHeader className="border-b p-4 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="flex items-center gap-2">
          <img src={logo} alt="MentalSpace" className={collapsed ? "h-8" : "h-8"} />
          {!collapsed && (
            <span className="font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">MentalSpace</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-foreground font-semibold text-sm">Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.filter(item => hasAccess(item.roles)).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end>
                      {({ isActive }) => (
                        <div className={`flex items-center gap-3 w-full px-3 py-2 rounded-md ${getNavCls(isActive, item.color)}`}>
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span className={isActive ? "text-white font-semibold" : "text-sidebar-foreground font-medium"}>{item.title}</span>}
                        </div>
                      )}
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
              <SidebarGroupLabel className="text-foreground font-semibold text-sm">
                <Shield className="h-4 w-4 mr-2 inline text-primary" />
                {!collapsed && 'Administration'}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url}>
                          {({ isActive }) => (
                            <div className={`flex items-center gap-3 w-full px-3 py-2 rounded-md ${getNavCls(isActive, item.color)}`}>
                              <item.icon className="h-4 w-4 shrink-0" />
                              {!collapsed && <span className={isActive ? "text-white font-semibold" : "text-sidebar-foreground font-medium"}>{item.title}</span>}
                            </div>
                          )}
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
          <SidebarGroupLabel className="text-foreground font-semibold text-sm">{!collapsed && 'Settings'}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url}>
                      {({ isActive }) => (
                        <div className={`flex items-center gap-3 w-full px-3 py-2 rounded-md ${getNavCls(isActive, item.color)}`}>
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span className={isActive ? "text-white font-semibold" : "text-sidebar-foreground font-medium"}>{item.title}</span>}
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground" 
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2 font-medium">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
