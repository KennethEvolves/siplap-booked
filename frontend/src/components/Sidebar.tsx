'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  ChevronRight
} from 'lucide-react';

const MENU_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Usuarios y Roles', href: '/admin', icon: Users },
  { name: 'Actividades', href: '/activities', icon: CalendarCheck },
  { name: 'Espacios', href: '/spaces', icon: MapPin },
  { name: 'Recursos', href: '/resources', icon: Box },
  { name: 'Reservaciones', href: '/reservations', icon: Clock },
  { name: 'Reportes', href: '/reports', icon: FileText },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path || pathname?.startsWith(`${path}/`);

  return (
    <aside 
      className={`relative bg-slate-100 text-slate-700 flex flex-col justify-between h-screen border-r border-slate-200 p-3 transition-all duration-300 ease-in-out select-none shadow-sm sticky top-0 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div>
        {/* Logo / Encabezado del Sistema */}
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-2 py-4 mb-4`}>
          {!collapsed && (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-9 w-9 min-w-[36px] rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-black text-sm">
                S
              </div>
              <div className="flex flex-col">
                <span className="text-base font-extrabold tracking-tight text-slate-900 truncate leading-none">
                  SIPLAP
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">
                  Gestión Institucional
                </span>
              </div>
            </div>
          )}

          {/* Alternar tamaño */}
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center"
            title={collapsed ? "Expandir menú" : "Minimizar menú"}
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>

        {/* Módulos Institucionales */}
        <nav className="space-y-1.5">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl font-medium text-sm transition-all shadow-sm ${
                  active
                    ? 'bg-white text-blue-600 font-semibold shadow-slate-200 border border-slate-200/60'
                    : 'hover:bg-white/60 text-slate-600 hover:text-slate-900'
                }`}
                title={item.name}
              >
                <Icon className="h-4 w-4 min-w-[16px]" />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Soporte */}
      <div className="space-y-1.5 pt-4 border-t border-slate-200/80">
        <Link
          href="/ayuda"
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
            isActive('/ayuda')
              ? 'bg-white text-blue-600 font-semibold shadow-sm'
              : 'hover:bg-white/50 text-slate-600 hover:text-slate-900'
          }`}
          title="Ayuda"
        >
          <HelpCircle className="h-4 w-4 min-w-[16px]" />
          {!collapsed && <span className="truncate">Ayuda</span>}
        </Link>

        <Link
          href="/informacion"
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
            isActive('/informacion')
              ? 'bg-white text-blue-600 font-semibold shadow-sm'
              : 'hover:bg-white/50 text-slate-600 hover:text-slate-900'
          }`}
          title="Información"
        >
          <Info className="h-4 w-4 min-w-[16px]" />
          {!collapsed && <span className="truncate">Información</span>}
        </Link>
      </div>
    </aside>
  );
}