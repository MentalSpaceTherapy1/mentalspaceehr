import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { NotificationBell } from './NotificationBell';
import { PasswordExpirationWarning } from '@/components/PasswordExpirationWarning';
import { 
  Calendar, 
  FileText, 
  CreditCard, 
  TrendingUp, 
  MessageSquare, 
  User, 
  BookOpen,
  LogOut,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';
import logo from '@/assets/mentalspace-logo.png';

interface PortalLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Home', href: '/portal', icon: Home },
  { name: 'Appointments', href: '/portal/appointments', icon: Calendar },
  { name: 'Documents', href: '/portal/documents', icon: FileText },
  { name: 'Billing', href: '/portal/billing', icon: CreditCard },
  { name: 'Progress', href: '/portal/progress', icon: TrendingUp },
  { name: 'Messages', href: '/portal/messages', icon: MessageSquare },
  { name: 'Resources', href: '/portal/resources', icon: BookOpen },
  { name: 'Profile', href: '/portal/profile', icon: User },
];

export const PortalLayout = ({ children }: PortalLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      <PasswordExpirationWarning />
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="MentalSpace" className="h-8" />
            <span className="text-lg font-semibold">Client Portal</span>
          </div>
          
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container flex gap-6 py-6">
        {/* Sidebar Navigation */}
        <aside className="w-64 shrink-0">
          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Button
                  key={item.name}
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start',
                    isActive && 'bg-secondary'
                  )}
                  onClick={() => navigate(item.href)}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.name}
                </Button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
};
