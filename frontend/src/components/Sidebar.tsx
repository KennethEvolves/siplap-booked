'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Users, 
  Image as ImageIcon, 
  MessageSquare, 
  FileText, 
  UserPlus, 
  HelpCircle, 
  Info,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <aside 
      className={`relative bg-slate-100 text-slate-700 flex flex-col justify-between h-screen border-r border-slate-200 p-3 transition-all duration-300 ease-in-out select-none shadow-sm sticky top-0 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div>
        {/* Logo / Marca y Botón para contraer/expandir */}
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-2 py-4 mb-4`}>
          {!collapsed && (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-9 w-9 min-w-[36px] rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <span className="font-black text-sm tracking-tighter">M</span>
              </div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900 truncate">
                Menu
              </span>
            </div>
          )}

          {/* Botón para alternar el menú */}
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center"
            title={collapsed ? "Expandir menú" : "Minimizar menú"}
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>

        {/* Menú de Navegación Principal */}
        <nav className="space-y-1.5">
          <Link
            href="/admin"
            className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl font-medium text-sm transition-all shadow-sm ${
              isActive('/admin')
                ? 'bg-white text-blue-600 font-semibold shadow-slate-200 border border-slate-200/60'
                : 'hover:bg-white/60 text-slate-600 hover:text-slate-900'
            }`}
            title="Panel Admin"
          >
            <Home className="h-4 w-4 min-w-[16px]" />
            {!collapsed && <span className="truncate">Panel Admin</span>}
          </Link>

          <Link
            href="/comunidad"
            className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl font-medium text-sm transition-all shadow-sm ${
              isActive('/comunidad')
                ? 'bg-white text-blue-600 font-semibold shadow-slate-200 border border-slate-200/60'
                : 'hover:bg-white/60 text-slate-600 hover:text-slate-900'
            }`}
            title="Comunidad"
          >
            <Users className="h-4 w-4 min-w-[16px]" />
            {!collapsed && <span className="truncate">Comunidad</span>}
          </Link>

          <Link
            href="/showcase"
            className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl font-medium text-sm transition-all shadow-sm ${
              isActive('/showcase')
                ? 'bg-white text-blue-600 font-semibold shadow-slate-200 border border-slate-200/60'
                : 'hover:bg-white/60 text-slate-600 hover:text-slate-900'
            }`}
            title="Showcase"
          >
            <ImageIcon className="h-4 w-4 min-w-[16px]" />
            {!collapsed && <span className="truncate">Showcase</span>}
          </Link>

          <Link
            href="/comentarios"
            className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl font-medium text-sm transition-all shadow-sm ${
              isActive('/comentarios')
                ? 'bg-white text-blue-600 font-semibold shadow-slate-200 border border-slate-200/60'
                : 'hover:bg-white/60 text-slate-600 hover:text-slate-900'
            }`}
            title="Comentarios"
          >
            <MessageSquare className="h-4 w-4 min-w-[16px]" />
            {!collapsed && <span className="truncate">Comentarios</span>}
          </Link>

          <Link
            href="/noticias"
            className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl font-medium text-sm transition-all shadow-sm ${
              isActive('/noticias')
                ? 'bg-white text-blue-600 font-semibold shadow-slate-200 border border-slate-200/60'
                : 'hover:bg-white/60 text-slate-600 hover:text-slate-900'
            }`}
            title="Noticias"
          >
            <FileText className="h-4 w-4 min-w-[16px]" />
            {!collapsed && <span className="truncate">Noticias</span>}
          </Link>

          <Link
            href="/suscripcion"
            className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl font-medium text-sm transition-all shadow-sm ${
              isActive('/suscripcion')
                ? 'bg-white text-blue-600 font-semibold shadow-slate-200 border border-slate-200/60'
                : 'hover:bg-white/60 text-slate-600 hover:text-slate-900'
            }`}
            title="Suscripción"
          >
            <UserPlus className="h-4 w-4 min-w-[16px]" />
            {!collapsed && <span className="truncate">Suscripción</span>}
          </Link>
        </nav>
      </div>

      {/* Footer del Sidebar: Ayuda e Información */}
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