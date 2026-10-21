// src/app/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab'); // Lee si la URL trae ?tab=profile

  const [activeTab, setActiveTab] = useState('users');

  // Si la URL cambia a ?tab=..., se activa esa pestaña automáticamente
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

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

          {/* Pestañas: scroll horizontal si no caben en pantallas chicas */}
          <div className="flex gap-2 md:gap-3 border-b border-border pb-3 mb-6 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 whitespace-nowrap min-h-[44px] px-4 rounded-xl font-medium text-sm transition-all shadow-sm ${
                  activeTab === tab.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-foreground hover:bg-secondary border border-border'
                }`}
              >
                {tab.label}
              </button>
            ))}
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