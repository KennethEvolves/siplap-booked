'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import UsersTab from '@/components/UsersTab';
import RolesTab from '@/components/RolesTab';
import PermissionsTab from '@/components/PermissionsTab';

export default function AdminPage() {
  const router = useRouter();
  // Estado para saber qué pestaña está activa ('users', 'roles', o 'permissions')
  const [activeTab, setActiveTab] = useState('users');

  // Función para cerrar sesión correctamente
  const handleLogout = () => {
    // 1. Borramos la cookie de acceso cambiando su tiempo de vida a 0
    document.cookie = 'accessToken=; path=/; max-age=0';
    // 2. Borramos el localStorage por si acaso
    localStorage.removeItem('accessToken');
    // 3. Redirigimos al login con recarga completa
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Encabezado */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Panel SUPERUSUARIO</h1>
          
          {/* Botón de cerrar sesión conectado */}
          <button 
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 cursor-pointer"
          >
            Cerrar sesión
          </button>
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
