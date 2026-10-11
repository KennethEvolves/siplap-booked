'use client';

import { useEffect, useState } from 'react';
import { apiFetch, UserProfileResponse } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  ShieldCheck, 
  Building2, 
  Briefcase, 
  Clock, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';

export default function PerfilPage() {
  const [profileData, setProfileData] = useState<UserProfileResponse['profile'] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        setError(null);
        // apiFetch gestiona automáticamente las cabeceras y el token de la sesión activa
        const data = await apiFetch<UserProfileResponse>('/api/users/profile');
        setProfileData(data.profile);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Ocurrió un error inesperado al cargar el perfil.');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Barra de navegación lateral fija */}
      <Sidebar />

      {/* Contenido principal */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* 1. Estado de Carga */}
        {loading && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm font-medium">Cargando información del perfil...</p>
          </div>
        )}

        {/* 2. Estado de Error */}
        {!loading && error && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-4 text-red-700 shadow-sm">
              <AlertCircle className="h-6 w-6 mt-0.5 flex-shrink-0 text-red-600" />
              <div>
                <h3 className="font-semibold text-base">Error al cargar el perfil</h3>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* 3. Datos del Perfil */}
        {!loading && !error && profileData && (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Encabezado Principal / Banner */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 text-2xl font-black">
                  {profileData.firstName 
                    ? profileData.firstName.charAt(0).toUpperCase() 
                    : profileData.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                    {[profileData.firstName, profileData.lastName].filter(Boolean).join(' ') || profileData.username}
                  </h1>
                  <p className="text-sm font-medium text-slate-500">@{profileData.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                  profileData.status?.name === 'ACTIVE' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {profileData.status?.name ?? 'ACTIVO'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tarjeta: Información Personal */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Datos Personales
                </h2>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-slate-400 block text-xs font-medium uppercase tracking-wider">Nombre Completo</span>
                    <p className="font-medium text-slate-700 mt-0.5">
                      {profileData.firstName && profileData.lastName 
                        ? `${profileData.firstName} ${profileData.lastName}` 
                        : 'No especificado'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs font-medium uppercase tracking-wider">Teléfono</span>
                    <p className="font-medium text-slate-700 mt-0.5 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {profileData.phoneNumber || 'No especificado'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs font-medium uppercase tracking-wider">Fecha de Nacimiento</span>
                    <p className="font-medium text-slate-700 mt-0.5 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {profileData.dateOfBirth || 'No especificada'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs font-medium uppercase tracking-wider">Biografía</span>
                    <p className="font-medium text-slate-600 mt-0.5 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                      {profileData.bio || 'Sin biografía registrada.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tarjeta: Cuenta y Contacto */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-600" />
                  Cuenta Institucional
                </h2>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-slate-400 block text-xs font-medium uppercase tracking-wider">Correo Electrónico</span>
                    <p className="font-medium text-slate-700 mt-0.5">{profileData.email}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs font-medium uppercase tracking-wider">Departamento</span>
                    <p className="font-medium text-slate-700 mt-0.5 flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      {profileData.department?.name || 'No asignado'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs font-medium uppercase tracking-wider">Tipo de Usuario</span>
                    <p className="font-medium text-slate-700 mt-0.5 flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                      {profileData.userType?.name || 'No especificado'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs font-medium uppercase tracking-wider">Turno</span>
                    <p className="font-medium text-slate-700 mt-0.5 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {profileData.shift || 'No especificado'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tarjeta: Roles Asignados (RBAC) */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                Roles Asignados en SIPLAP y Booked
              </h2>
              {profileData.roles && profileData.roles.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {profileData.roles.map((r) => (
                    <span
                      key={r.roleId}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold tracking-wide"
                    >
                      {r.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No tienes roles especiales asignados actualmente.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}