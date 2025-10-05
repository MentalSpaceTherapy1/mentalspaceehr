import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentUserRoles } from '@/hooks/useUserRoles';
import { Loader2 } from 'lucide-react';

interface ClientPortalRouteProps {
  children: React.ReactNode;
}

export const ClientPortalRoute = ({ children }: ClientPortalRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { roles, loading: rolesLoading } = useCurrentUserRoles();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !rolesLoading) {
      if (!user) {
        navigate('/auth');
      } else if (!roles.includes('client_user')) {
        // If user is not a client, redirect to main dashboard
        navigate('/dashboard');
      }
    }
  }, [user, roles, authLoading, rolesLoading, navigate]);

  if (authLoading || rolesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !roles.includes('client_user')) {
    return null;
  }

  return <>{children}</>;
};
