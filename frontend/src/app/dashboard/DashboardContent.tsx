'use client';

import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { Users, CalendarCheck, ShieldCheck, LogOut } from 'lucide-react';

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
    ['SUPERUSUARIO', 'SUPER_ADMIN', 'ADMIN'].includes(r.toUpperCase()),
  );

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
    : (user?.permissions ?? []);

  const hasPermission = (slug: string): boolean => {
    if (permissions.includes('manage:all')) return true;
    return permissions.includes(slug);
  };

  const canAccessUsers = isSuperUser || hasPermission('users:read');
  const canAccessActivities = isSuperUser || hasPermission('activities:read');

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Barra de Navegación Lateral */}
      <Sidebar />

      {/* Contenido Principal */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* Encabezado */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                  Panel Central
                </span>
                {isSuperUser && (
                  <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Superusuario
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 mt-2">
                Bienvenido, {user.name || user.email}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Roles activos: {roles.join(', ') || 'Sin rol asignado'}
              </p>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 px-4 py-2.5 rounded-xl transition-colors border border-rose-100"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </header>

          {/* Sección de Módulos Principales (Criterio RBAC-04) */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Módulos principales</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Tarjeta 1: Usuarios y Roles */}
              {canAccessUsers ? (
                <Link
                  href="/admin"
                  className="group p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:border-blue-500 hover:ring-2 hover:ring-blue-500/10 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Users className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      Gestión de Usuarios y Roles
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Administra las cuentas del personal, define asignaciones de roles institucionales y configura la matriz de permisos.
                    </p>
                  </div>
                  <div className="pt-2 flex items-center gap-1.5 text-xs font-bold text-blue-600">
                    <span>Acceder al panel</span>
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </div>
                </Link>
              ) : (
                <div className="p-6 bg-slate-100/60 rounded-2xl border border-slate-200 opacity-60 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="h-12 w-12 rounded-xl bg-slate-200 text-slate-400 flex items-center justify-center">
                      <Users className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-700">Gestión de Usuarios</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Acceso restringido. Requiere permisos administrativos de usuarios.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">Sin acceso</span>
                </div>
              )}

              {/* Tarjeta 2: Actividades */}
              {canAccessActivities ? (
                <Link
                  href="/activities"
                  className="group p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:border-emerald-500 hover:ring-2 hover:ring-emerald-500/10 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <CalendarCheck className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                      Gestión de Actividades
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Revisa las actividades institucionales, programa eventos, solicita espacios y gestiona el flujo de aprobaciones.
                    </p>
                  </div>
                  <div className="pt-2 flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                    <span>Acceder al módulo</span>
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </div>
                </Link>
              ) : (
                <div className="p-6 bg-slate-100/60 rounded-2xl border border-slate-200 opacity-60 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="h-12 w-12 rounded-xl bg-slate-200 text-slate-400 flex items-center justify-center">
                      <CalendarCheck className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-700">Gestión de Actividades</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Acceso restringido. Requiere permisos de consulta o creación de actividades.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">Sin acceso</span>
                </div>
              )}

            </div>
          </section>

        </div>
      </main>
    </div>
  );
}