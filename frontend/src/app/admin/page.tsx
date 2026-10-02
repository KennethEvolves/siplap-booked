'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button'; // <--- Importamos el botón de Shadcn
import { signOut } from 'next-auth/react';
import { removeToken } from '@/lib/api';
import SessionSync from '@/components/SessionSync';
import UsersTab from '@/components/UsersTab';
import RolesTab from '@/components/RolesTab';
import PermissionsTab from '@/components/PermissionsTab';

export default function AdminPage() {
  // Estado para saber qué pestaña está activa ('users', 'roles', o 'permissions')
  const [activeTab, setActiveTab] = useState('users');

  // Función para cerrar sesión correctamente
  const handleLogout = async () => {
    removeToken();
    await signOut({ redirectTo: '/login' });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <SessionSync />
      <div className="max-w-6xl mx-auto">
        
        {/* Encabezado */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Panel SUPERUSUARIO</h1>
          
          {/* Botón de cerrar sesión usando Shadcn UI */}
          <Button 
            onClick={handleLogout}
            variant="destructive" // Usamos la variante de peligro para que se vea rojo
          >
            Cerrar sesión
          </Button>
        </div>

        {/* Barra de Pestañas (Botones de navegación) */}
        <div className="flex space-x-4 border-b border-gray-200 pb-3 mb-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'users'
                ? 'bg-black text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Usuarios y Roles
          </button>

          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'roles'
                ? 'bg-black text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Gestión de Roles
          </button>

          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'permissions'
                ? 'bg-black text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Permisos
          </button>
        </div>

        {/* Contenido Dinámico: Aquí se muestra el componente según la pestaña activa */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'roles' && <RolesTab />}
          {activeTab === 'permissions' && <PermissionsTab />}
        </div>

      </div>
    </div>
  );
}