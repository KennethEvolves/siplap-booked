'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { signOut } from 'next-auth/react';
import { removeToken } from '@/lib/api';
import SessionSync from '@/components/SessionSync';
import { Sidebar } from '@/components/Sidebar'; 
import UsersTab from '@/components/UsersTab';
import RolesTab from '@/components/RolesTab';
import PermissionsTab from '@/components/PermissionsTab';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('users');

  const handleLogout = async () => {
    removeToken();
    await signOut({ redirectTo: '/login' });
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <SessionSync />
      
      {/* Nuestro Sidebar colapsable a la izquierda */}
      <Sidebar />

      {/* Contenido principal a la derecha */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          
          {/* Encabezado */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Panel de control</p>
              <h1 className="text-3xl font-extrabold text-slate-900">Panel SUPERUSUARIO</h1>
              <p className="text-sm text-slate-500 mt-1">Gestiona las personas, roles y permisos de tu organización.</p>
            </div>
            
            <Button 
              onClick={handleLogout}
              variant="destructive"
            >
              Cerrar sesión
            </Button>
          </div>

          {/* Barra de Pestañas */}
          <div className="flex space-x-3 border-b border-slate-200 pb-3 mb-6">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm ${
                activeTab === 'users'
                  ? 'bg-blue-600 text-white shadow-blue-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              Usuarios y Roles
            </button>

            <button
              onClick={() => setActiveTab('roles')}
              className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm ${
                activeTab === 'roles'
                  ? 'bg-blue-600 text-white shadow-blue-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              Gestión de Roles
            </button>

            <button
              onClick={() => setActiveTab('permissions')}
              className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm ${
                activeTab === 'permissions'
                  ? 'bg-blue-600 text-white shadow-blue-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              Permisos
            </button>
          </div>

          {/* Contenido Dinámico */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/70">
            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'roles' && <RolesTab />}
            {activeTab === 'permissions' && <PermissionsTab />}
          </div>

        </div>
      </main>
    </div>
  );
}