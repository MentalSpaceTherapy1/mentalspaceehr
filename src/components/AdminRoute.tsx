import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUserRoles } from '@/hooks/useUserRoles';
import { isAdmin } from '@/lib/roleUtils';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { roles, loading: rolesLoading } = useCurrentUserRoles();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !rolesLoading) {
      if (!user) {
        navigate('/auth');
      } else if (!isAdmin(roles)) {
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

  if (!user || !isAdmin(roles)) {
    return null;
  }

  return <>{children}</>;
};
