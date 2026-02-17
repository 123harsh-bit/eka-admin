import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

// Redirects authenticated users to their role-based dashboard
export function RoleRedirect() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const roleRoutes: Record<string, string> = {
    admin: '/admin',
    editor: '/editor',
    designer: '/designer',
    writer: '/writer',
    client: '/client',
  };

  return <Navigate to={role ? roleRoutes[role] || '/login' : '/login'} replace />;
}
