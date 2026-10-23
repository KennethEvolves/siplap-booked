'use client';

import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { 
  Users, 
  CalendarCheck, 
  CalendarDays, 
  ShieldCheck, 
  LogOut 
} from 'lucide-react';

interface DashboardContentProps {
  user: {
    name?: string | null;
    email?: string | null;
    roles?: string[];
    permissions?: string[];
  };
}

export default function DashboardContent({ user }: DashboardContentProps) {
  const roles: string[] = user?.roles ?? [];

  const isSuperUser = roles.some((r) =>
    ['SUPERUSUARIO', 'SUPER_ADMIN', 'ADMIN', 'RESERVATION_MANAGER'].includes(
      r.toUpperCase()
    )
  );

  const permissions: string[] = isSuperUser
    ? [
        'manage:all',
        'users:create',
        'users:read',
        'users:update',
        'users:delete',
        'activity:manage',
        'activity:view_all',
        'activity:approve_all',
        'activity:update_all',
        'activity:create_own',
        'activity:view_own',
        'activity:update_own',
        'reservation:manage',
        'reservation:create_own',
        'reservation:view_own',
        'reservation:view_all',
        'reservation:update_own',
        'reservation:delete_own',
      ]
    : (user?.permissions ?? []);

  const hasPermission = (slug: string): boolean => {
    if (permissions.includes('manage:all')) return true;
    return permissions.includes(slug);
  };

  const canAccessUsers = isSuperUser || hasPermission('users:read');

  const canAccessActivities =
    isSuperUser ||
    hasPermission('activity:manage') ||
    hasPermission('activity:view_all') ||
    hasPermission('activity:view_own') ||
    hasPermission('activity:create_own');

  const canAccessReservations =
    isSuperUser ||
    hasPermission('reservation:manage') ||
    hasPermission('reservation:view_all') ||
    hasPermission('reservation:view_own') ||
    hasPermission('reservation:create_own');

  // Cantidad de módulos visibles
  const hasAnyModule = canAccessUsers || canAccessActivities || canAccessReservations;

  return (
    <div className="flex min-h-screen bg-secondary/40">
      {/* Barra de Navegación Lateral */}
      <Sidebar />

      {/* Contenido Principal */}
      <main className="flex-1 min-w-0 p-4 pt-16 md:p-6 md:pt-16 lg:p-10 lg:pt-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">

          {/* Encabezado */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 md:p-6 rounded-2xl border border-border shadow-sm">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-md">
                  Panel Central
                </span>
                {isSuperUser && (
                  <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-uno-negro bg-uno-mostaza/30 px-2.5 py-1 rounded-md border border-uno-mostaza">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Acceso Total
                  </span>
                )}
              </div>
              <h1 className="text-xl md:text-2xl font-extrabold text-foreground mt-2 break-words">
                Bienvenido, {user.name || user.email}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Roles activos: {roles.join(', ') || 'Sin rol asignado'}
              </p>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] text-sm font-semibold text-primary bg-card hover:bg-secondary px-4 py-2.5 rounded-xl transition-colors border border-primary"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </header>

          {/* Módulos principales: solo se renderizan a los que tiene acceso */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Módulos principales</h2>

            {!hasAnyModule ? (
              <div className="bg-card rounded-2xl border border-border p-8 text-center text-muted-foreground text-sm">
                No cuentas con módulos asignados a tus permisos actuales.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">

                {/* Tarjeta 1: Usuarios y Roles */}
                {canAccessUsers && (
                  <Link
                    href="/admin"
                    className="group p-5 md:p-6 bg-card rounded-2xl border border-border shadow-sm hover:border-primary hover:ring-2 hover:ring-primary/10 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Users className="h-6 w-6" />
                      </div>
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                        Gestión de Usuarios y Roles
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Administra las cuentas del personal, define asignaciones de roles institucionales y configura la matriz de permisos.
                      </p>
                    </div>
                    <div className="pt-2 flex items-center gap-1.5 text-xs font-bold text-primary">
                      <span>Acceder al panel</span>
                      <span className="transition-transform group-hover:translate-x-1">→</span>
                    </div>
                  </Link>
                )}

                {/* Tarjeta 2: Actividades */}
                {canAccessActivities && (
                  <Link
                    href="/activities"
                    className="group p-5 md:p-6 bg-card rounded-2xl border border-border shadow-sm hover:border-uno-olivo hover:ring-2 hover:ring-uno-olivo/20 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="h-12 w-12 rounded-xl bg-uno-verde text-uno-olivo flex items-center justify-center group-hover:scale-105 transition-transform">
                        <CalendarCheck className="h-6 w-6" />
                      </div>
                      <h3 className="text-base font-bold text-foreground group-hover:text-uno-olivo transition-colors">
                        Gestión de Actividades
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Revisa las actividades institucionales, programa eventos, solicita espacios y gestiona el flujo de aprobaciones.
                      </p>
                    </div>
                    <div className="pt-2 flex items-center gap-1.5 text-xs font-bold text-uno-olivo">
                      <span>Acceder al módulo</span>
                      <span className="transition-transform group-hover:translate-x-1">→</span>
                    </div>
                  </Link>
                )}

                {/* Tarjeta 3: Reservaciones */}
                {canAccessReservations && (
                  <Link
                    href="/reservations"
                    className="group p-5 md:p-6 bg-card rounded-2xl border border-border shadow-sm hover:border-primary hover:ring-2 hover:ring-primary/20 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                        <CalendarDays className="h-6 w-6" />
                      </div>
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                        Gestión de Reservaciones
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Consulta la agenda institucional, solicita aulas y espacios físicos, y gestiona el estatus de tus reservaciones.
                      </p>
                    </div>
                    <div className="pt-2 flex items-center gap-1.5 text-xs font-bold text-primary">
                      <span>Acceder al módulo</span>
                      <span className="transition-transform group-hover:translate-x-1">→</span>
                    </div>
                  </Link>
                )}

              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
}