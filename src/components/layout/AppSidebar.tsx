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
  CheckSquare,
  Bell,
  ListOrdered,
  Mail,
  Sparkles,
  Brain,
  FileCheck,
  AlertTriangle,
  GraduationCap,
  Video,
  ChevronDown,
  MessageSquare,
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useCurrentUserRoles } from '@/hooks/useUserRoles';
import { isAdmin } from '@/lib/roleUtils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import logo from '@/assets/mentalspace-logo.png';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useStaffMessages } from '@/hooks/useStaffMessages';

export function AppSidebar() {
  const { open } = useSidebar();
  const collapsed = !open;
  const { roles } = useCurrentUserRoles();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const userIsAdmin = isAdmin(roles);
  const { unreadCount } = useStaffMessages();

  const mainItems = [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, roles: ['all'], color: 'from-primary to-accent' },
    { title: 'Schedule', url: '/schedule', icon: Calendar, roles: ['therapist', 'associate_trainee', 'supervisor', 'front_desk'], color: 'from-secondary to-primary' },
    { title: 'Clients', url: '/clients', icon: Users, roles: ['therapist', 'associate_trainee', 'supervisor', 'front_desk'], color: 'from-accent to-primary' },
    { title: 'Billing', url: '/billing', icon: DollarSign, roles: ['therapist', 'associate_trainee', 'supervisor', 'front_desk'], color: 'from-success to-primary' },
    { title: 'Messages', url: '/messages', icon: MessageSquare, roles: ['therapist', 'associate_trainee', 'supervisor'], color: 'from-blue-400 to-cyan-400', badge: unreadCount },
    { title: 'Waitlist', url: '/waitlist', icon: ListOrdered, roles: ['therapist', 'associate_trainee', 'supervisor', 'front_desk'], color: 'from-purple-400 to-pink-400' },
    { title: 'Clinical Notes', url: '/notes', icon: FileText, roles: ['therapist', 'associate_trainee', 'supervisor'], color: 'from-warning to-accent' },
    { title: 'Tasks', url: '/tasks', icon: CheckSquare, roles: ['all'], color: 'from-blue-400 to-purple-400' },
    
    { title: 'Front Desk', url: '/front-desk', icon: ClipboardList, roles: ['front_desk'], color: 'from-primary to-secondary' },
  ];

  const adminCategories = [
    {
      title: 'System & Users',
      icon: UserCog,
      items: [
        { title: 'User Management', url: '/admin/users', icon: UserCog, color: 'from-secondary to-accent' },
        { title: 'Practice Settings', url: '/admin/practice-settings', icon: Building2, color: 'from-primary to-success' },
        { title: 'BAA Management', url: '/admin/baa-management', icon: Shield, color: 'from-green-400 to-emerald-400' },
        { title: 'Insurance Claims', url: '/admin/insurance-claims', icon: FileText, color: 'from-cyan-400 to-blue-400' },
        { title: 'Client Statements', url: '/admin/client-statements', icon: FileText, color: 'from-blue-400 to-indigo-400' },
      ]
    },
    {
      title: 'Client Services',
      icon: Users,
      items: [
        { title: 'Client Portal', url: '/admin/portal-management', icon: Users, color: 'from-violet-400 to-purple-400' },
        { title: 'Service Codes', url: '/admin/service-codes', icon: DollarSign, color: 'from-success to-primary' },
        { title: 'Locations', url: '/admin/locations', icon: MapPin, color: 'from-accent to-secondary' },
      ]
    },
    {
      title: 'Clinical Operations',
      icon: GraduationCap,
      items: [
        { title: 'Supervision Management', url: '/admin/supervision-management', icon: GraduationCap, color: 'from-indigo-400 to-purple-400' },
        { title: 'AI Clinical Notes', url: '/admin/ai-notes', icon: Sparkles, color: 'from-cyan-400 to-blue-400' },
        { title: 'AI Quality Metrics', url: '/admin/ai-quality-metrics', icon: Brain, color: 'from-blue-400 to-cyan-400' },
      ]
    },
    {
      title: 'Compliance & Security',
      icon: AlertTriangle,
      items: [
        { title: 'Compliance Dashboard', url: '/admin/compliance-dashboard', icon: AlertTriangle, color: 'from-red-400 to-orange-400' },
        { title: 'Compliance Rules', url: '/admin/compliance-rules', icon: FileCheck, color: 'from-orange-400 to-amber-400' },
      ]
    },
    {
      title: 'Communications',
      icon: Bell,
      items: [
        { title: 'Reminder Settings', url: '/admin/reminder-settings', icon: Bell, color: 'from-blue-400 to-purple-400' },
        { title: 'Appointment Notifications', url: '/admin/appointment-notifications', icon: Mail, color: 'from-purple-400 to-pink-400' },
      ]
    },
    {
      title: 'Telehealth',
      icon: Video,
      items: [
        { title: 'Telehealth Settings', url: '/admin/telehealth-settings', icon: Video, color: 'from-blue-400 to-teal-400' },
        { title: 'Telehealth Consents', url: '/admin/telehealth-consents', icon: Shield, color: 'from-teal-400 to-cyan-400' },
      ]
    },
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
      : 'hover:bg-gradient-to-r hover:from-sidebar-accent/50 hover:to-sidebar-accent/30 transition-all duration-200 hover:border-l-4 hover:border-l-primary/40 text-foreground';

  const getCategoryHeaderCls = (isExpanded: boolean) =>
    isExpanded
      ? 'bg-gradient-to-r from-primary/20 to-accent/20 text-foreground font-semibold border-l-4 border-l-primary shadow-sm'
      : 'hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/10 text-foreground font-medium';

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
                          <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-foreground'}`} />
                          {!collapsed && (
                            <div className="flex items-center justify-between flex-1">
                              <span className={isActive ? "text-white font-semibold" : "text-foreground font-medium"}>{item.title}</span>
                              {item.badge && item.badge > 0 && (
                                <Badge variant={isActive ? "secondary" : "default"} className="ml-auto text-xs">
                                  {item.badge}
                                </Badge>
                              )}
                            </div>
                          )}
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
              <SidebarGroupLabel className="text-foreground font-semibold text-sm bg-gradient-to-r from-primary/10 to-accent/10 px-3 py-2 rounded-md">
                <Shield className="h-4 w-4 mr-2 inline text-primary" />
                {!collapsed && 'Administration'}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminCategories.map((category) => (
                    <Collapsible key={category.title} defaultOpen className="group/collapsible">
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton className={`${getCategoryHeaderCls(false)} transition-all duration-200 my-1`}>
                            <div className="flex items-center gap-2 w-full">
                              <div className="p-1 rounded-md bg-gradient-to-br from-primary/20 to-accent/20">
                                <category.icon className="h-4 w-4 shrink-0 text-primary" />
                              </div>
                              {!collapsed && (
                                <>
                                  <span className="font-semibold text-sm">{category.title}</span>
                                  <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180 text-primary" />
                                </>
                              )}
                            </div>
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub className="ml-1 border-l-2 border-primary/20 pl-1 space-y-1">
                            {category.items.map((item) => (
                              <SidebarMenuSubItem key={item.title}>
                                <SidebarMenuSubButton asChild>
                                  <NavLink to={item.url}>
                                    {({ isActive }) => (
                                      <div className={`flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md transition-all duration-200 ${getNavCls(isActive, item.color)}`}>
                                        <div className={`p-0.5 rounded flex-shrink-0 ${isActive ? 'bg-white/20' : 'bg-gradient-to-br ' + item.color.replace('from-', 'from-') + '/20'}`}>
                                          <item.icon className={`h-3 w-3 ${isActive ? 'text-white' : 'text-foreground'}`} />
                                        </div>
                                        {!collapsed && <span className={`${isActive ? "text-white font-semibold" : "text-foreground font-medium"} text-xs leading-tight`}>{item.title}</span>}
                                      </div>
                                    )}
                                  </NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
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
                          <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-foreground'}`} />
                          {!collapsed && <span className={isActive ? "text-white font-semibold" : "text-foreground font-medium"}>{item.title}</span>}
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
