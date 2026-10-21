// src/app/admin/page.tsx
'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { signOut } from 'next-auth/react';
import { removeToken } from '@/lib/api';
import SessionSync from '@/components/SessionSync';
import { Sidebar } from '@/components/Sidebar';
import UsersTab from '@/components/UsersTab';
import RolesTab from '@/components/RolesTab';
import PermissionsTab from '@/components/PermissionsTab';

const TABS = [
  { key: 'users', label: 'Usuarios y Roles' },
  { key: 'roles', label: 'Gestión de Roles' },
  { key: 'permissions', label: 'Permisos' },
  { key: 'profile', label: 'Mi Perfil' },
];

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" aria-label="Cargando panel" />}>
      <AdminPanel />
    </Suspense>
  );
}

function AdminPanel() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabs = ['users', 'roles', 'permissions'] as const;
  const activeTab = tabs.find((tab) => tab === searchParams.get('tab')) ?? 'users';

  const selectTab = (tab: (typeof tabs)[number]) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`/admin?${params.toString()}`, { scroll: false });
  };

  const handleLogout = async () => {
    removeToken();
    await signOut({ redirectTo: '/login' });
  };

  return (
    <div className="flex min-h-screen bg-secondary/40 text-foreground">
      <SessionSync />

      {/* Sidebar colapsable (en móvil es un menú desplegable) */}
      <Sidebar />

      {/* pt-16 deja espacio al botón hamburguesa en móvil y tablet */}
      <main className="flex-1 min-w-0 p-4 pt-16 md:p-6 md:pt-16 lg:p-8 lg:pt-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">

          {/* Encabezado */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                Panel de control
              </p>
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">
                Panel SUPERUSUARIO
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gestiona las personas, roles y permisos de tu organización.
              </p>
            </div>

            <Button
              onClick={handleLogout}
              variant="outline"
              className="min-h-[44px] border-primary text-primary hover:bg-secondary"
            >
              Cerrar sesión
            </Button>
          </div>

          {/* Barra de Pestañas (Botones superiores) */}
          <div className="flex space-x-3 border-b border-slate-200 pb-3 mb-6">
            <button
              onClick={() => selectTab('users')}
              className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm ${
                activeTab === 'users'
                  ? 'bg-blue-600 text-white shadow-blue-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              Usuarios y Roles
            </button>

            <button
              onClick={() => selectTab('roles')}
              className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm ${
                activeTab === 'roles'
                  ? 'bg-blue-600 text-white shadow-blue-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              Gestión de Roles
            </button>

            <button
              onClick={() => selectTab('permissions')}
              className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm ${
                activeTab === 'permissions'
                  ? 'bg-blue-600 text-white shadow-blue-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              Permisos
            </button>

          </div>

          {/* Contenido de la pestaña activa */}
          <div className="bg-card p-4 md:p-6 rounded-2xl shadow-sm border border-border">
            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'roles' && <RolesTab />}
            {activeTab === 'permissions' && <PermissionsTab />}
          </div>

        </div>
      </main>
    </div>
  );
}
