import { useSession } from 'next-auth/react';
import { useMemo } from 'react';

export interface RbacContext {
  roles: string[];
  permissions: string[];
  isSuperUser: boolean;
  canAccessUsers: boolean;
  canAccessActivities: boolean;
  hasPermission: (slug: string) => boolean;
  hasRole: (role: string) => boolean;
  isLoading: boolean;
}

export function useRbac(): RbacContext {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';

  return useMemo(() => {
    const sessionUser = session?.user as any;
    const roles: string[] = sessionUser?.roles ?? [];
    
    // En el backend RBAC estandarizado, SUPERUSUARIO o manage:all tienen control total
    const isSuperUser = roles.some((r) =>
      ['SUPERUSUARIO', 'SUPER_ADMIN', 'ADMIN'].includes(r.toUpperCase()),
    );

    // Permisos mapeados del usuario o concedidos por el rol maestro
    const permissions: string[] = isSuperUser
      ? [
          'manage:all',
          'users:create',
          'users:read',
          'users:update',
          'users:delete',
          'activities:create',
          'activities:read',
          'activities:update',
          'activities:delete',
        ]
      : (sessionUser?.permissions ?? []);

    const hasPermission = (slug: string): boolean => {
      if (permissions.includes('manage:all')) return true;
      return permissions.includes(slug);
    };

    const hasRole = (roleName: string): boolean => {
      return roles.some((r) => r.toUpperCase() === roleName.toUpperCase());
    };

    return {
      roles,
      permissions,
      isSuperUser,
      canAccessUsers: hasPermission('manage:all') || hasPermission('users:read'),
      canAccessActivities: hasPermission('manage:all') || hasPermission('activities:read'),
      hasPermission,
      hasRole,
      isLoading,
    };
  }, [session, status]);
}