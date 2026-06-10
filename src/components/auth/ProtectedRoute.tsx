import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // COO has full admin-equivalent access: allow wherever admin is allowed.
  const effectiveRole = role === 'coo' && allowedRoles?.includes('admin') ? 'admin' : role;

  if (allowedRoles && effectiveRole && !allowedRoles.includes(effectiveRole)) {
    const roleRoutes: Record<string, string> = {
      admin: '/admin',
      coo: '/admin',
      editor: '/editor',
      designer: '/designer',
      writer: '/writer',
      camera_operator: '/camera',
      social_executive: '/social',
      client: '/client',
    };
    return <Navigate to={roleRoutes[role || ''] || '/'} replace />;
  }

  return <>{children}</>;
}
