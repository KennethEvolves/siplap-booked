// src/app/profile/page.tsx
'use client';

import { Sidebar } from '@/components/Sidebar';
import ProfileForm from '@/components/ProfileForm';

export default function ProfilePage() {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      {/* Menú lateral (Sidebar) */}
      <Sidebar />

      {/* Contenido principal a la derecha */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          
          {/* Encabezado de la página */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Configuración de cuenta</p>
            <h1 className="text-3xl font-extrabold text-slate-900">Mi Perfil</h1>
            <p className="text-sm text-slate-500 mt-1">Actualiza tu información personal y credenciales de acceso.</p>
          </div>
          
          {/* Componente del formulario y vista de perfil */}
          <ProfileForm />

        </div>
      </main>
    </div>
  );
}