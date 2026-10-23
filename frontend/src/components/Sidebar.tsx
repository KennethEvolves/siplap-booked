'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  MapPin,
  Box,
  Clock,
  FileText,
  HelpCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  User,
} from 'lucide-react';

const ADMIN_ROLES = ['superuser', 'reservation_manager'];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const { data: session } = useSession();
  const user = session?.user as any;
  const userRole: string | undefined = user?.role;
  const permissions: string[] = (user?.permissions as string[]) || [];

  const isSuperUser = useMemo(() => {
    return (
      permissions.includes('manage:all') ||
      (userRole && ADMIN_ROLES.includes(userRole.toLowerCase()))
    );
  }, [permissions, userRole]);

  // Evaluaciones granulares de visibilidad por módulo
  const canSeeUsers = useMemo(() => {
    return isSuperUser || permissions.some((p) => p.startsWith('users:'));
  }, [isSuperUser, permissions]);

  const canSeeActivities = useMemo(() => {
    return isSuperUser || permissions.some((p) => p.startsWith('activity:'));
  }, [isSuperUser, permissions]);

  const canSeeSpaces = useMemo(() => {
    return isSuperUser || permissions.some((p) => p.startsWith('space:'));
  }, [isSuperUser, permissions]);

  const canSeeResources = useMemo(() => {
    return isSuperUser || permissions.some((p) => p.startsWith('resource:'));
  }, [isSuperUser, permissions]);

  const canSeeReservations = useMemo(() => {
    return isSuperUser || permissions.some((p) => p.startsWith('reservation:'));
  }, [isSuperUser, permissions]);

  const canSeeReports = useMemo(() => {
    return isSuperUser || permissions.some((p) => p.startsWith('report:'));
  }, [isSuperUser, permissions]);

  // Lista de elementos con su condición de visibilidad
  const menuItems = useMemo(() => {
    const items = [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, visible: true },
      { name: 'Mi Perfil', href: '/perfil', icon: User, visible: true },
      { 
        name: 'Usuarios y Roles', 
        href: '/admin', 
        icon: Users,
        visible: canSeeUsers
      },
      { 
        name: 'Actividades', 
        href: '/activities', 
        icon: CalendarCheck,
        visible: canSeeActivities 
      },
      { 
        name: 'Espacios', 
        href: '/spaces', 
        icon: MapPin,
        visible: canSeeSpaces 
      },
      { 
        name: 'Recursos', 
        href: '/resources', 
        icon: Box,
        visible: canSeeResources 
      },
      { 
        name: 'Reservaciones', 
        href: '/reservations', 
        icon: Clock,
        visible: canSeeReservations 
      },
      { 
        name: 'Reportes', 
        href: '/reports', 
        icon: FileText,
        visible: canSeeReports 
      },
    ];

    // Desaparece por completo cualquier módulo sin permiso
    return items.filter((item) => item.visible);
  }, [
    canSeeUsers,
    canSeeActivities,
    canSeeSpaces,
    canSeeResources,
    canSeeReservations,
    canSeeReports,
  ]);

  const isActive = (path: string) =>
    pathname === path || pathname?.startsWith(`${path}/`);

  const hideLabel = collapsed ? 'lg:hidden' : '';

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 px-3.5 py-3 rounded-2xl font-medium text-sm transition-all min-h-[44px] ${
      collapsed ? 'lg:justify-center lg:px-0' : ''
    } ${
      active
        ? 'bg-white text-primary font-semibold shadow-sm'
        : 'text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-foreground'
    }`;

  return (
    <>
      {/* Botón hamburguesa: solo en móvil y tablet */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-40 h-11 w-11 flex items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md"
        aria-label="Abrir menú"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Fondo oscuro detrás del menú en móvil */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`bg-sidebar text-sidebar-foreground flex flex-col justify-between
          h-screen p-3 select-none shadow-lg
          fixed inset-y-0 left-0 z-50 w-64
          transition-all duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:sticky lg:top-0 lg:z-auto
          ${collapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        <div>
          {/* Encabezado: logo oficial */}
          <div
            className={`flex items-center justify-between px-2 py-4 mb-4 ${
              collapsed ? 'lg:justify-center' : ''
            }`}
          >
            <div className={`flex flex-col gap-1.5 overflow-hidden ${hideLabel}`}>
              <Image
                src="/logo-uno-blanco.png"
                alt="Universidad de Oriente, Valladolid, Yucatán"
                width={150}
                height={62}
                priority
                className="h-auto w-[150px] brightness-0 invert"
              />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/70">
                SIPLAP · Gestión Institucional
              </span>
            </div>

            {/* Colapsar/expandir: solo escritorio */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-2 rounded-xl hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground transition-colors items-center justify-center"
              title={collapsed ? 'Expandir menú' : 'Minimizar menú'}
            >
              {collapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </button>

            {/* Cerrar: solo móvil */}
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-2 rounded-xl hover:bg-sidebar-accent text-sidebar-foreground"
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Módulos filtrados según los permisos reales */}
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={linkClass(isActive(item.href))}
                  title={item.name}
                >
                  <Icon className="h-4 w-4 min-w-[16px]" />
                  <span className={`truncate ${hideLabel}`}>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Soporte */}
        <div className="space-y-1.5 pt-4 border-t border-sidebar-border">
          <Link
            href="/ayuda"
            onClick={() => setMobileOpen(false)}
            className={linkClass(isActive('/ayuda'))}
            title="Ayuda"
          >
            <HelpCircle className="h-4 w-4 min-w-[16px]" />
            <span className={`truncate ${hideLabel}`}>Ayuda</span>
          </Link>

          <Link
            href="/informacion"
            onClick={() => setMobileOpen(false)}
            className={linkClass(isActive('/informacion'))}
            title="Información"
          >
            <Info className="h-4 w-4 min-w-[16px]" />
            <span className={`truncate ${hideLabel}`}>Información</span>
          </Link>
        </div>
      </aside>
    </>
  );
}