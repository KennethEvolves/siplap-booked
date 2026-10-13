// src/app/perfil/page.tsx
'use client';

import { useEffect, useState, FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
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
  AlertCircle,
  Edit3,
  CheckCircle
} from 'lucide-react';

export default function PerfilPage() {
  const [profileData, setProfileData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string>('');

  // Campos editables (incluyendo correo y nombre de usuario)
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bio, setBio] = useState('');
  const [password, setPassword] = useState('');

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<any>('/api/users/profile');
      const p = data.profile;
      
      setProfileData(p);
      setUsername(p.username || '');
      setEmail(p.email || '');
      setFirstName(p.firstName || p.first_name || '');
      setLastName(p.lastName || p.last_name || '');
      setPhoneNumber(p.phoneNumber || p.phone_number || '');
      setDateOfBirth(p.dateOfBirth ? p.dateOfBirth.split('T')[0] : '');
      setBio(p.bio || '');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado al cargar el perfil.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess('');

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !username.trim()) {
      setError('Por favor, completa todos los campos obligatorios.');
      return;
    }

    setBusy(true);

    try {
      // Objeto base con los campos obligatorios que el backend espera
      const payload: any = {
        username: username.trim(),
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phoneNumber ? phoneNumber.trim() : null,
        bio: bio ? bio.trim() : null,
      };

      // Agregamos la fecha solo si tiene un valor válido
      if (dateOfBirth) {
        payload.date_of_birth = dateOfBirth;
      }

      // Agregamos la contraseña solo si el usuario escribió una nueva
      if (password && password.trim() !== '') {
        if (password.length < 8) {
          setError('La contraseña debe tener al menos 8 caracteres.');
          setBusy(false);
          return;
        }
        payload.password = password;
      }

      const response = await apiFetch('/api/users/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      setSuccess('¡Tus datos se han actualizado correctamente!');
      setIsEditing(false);
      setPassword('');
      
      setTimeout(() => setSuccess(''), 4000);
      await fetchProfile();

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el perfil en el servidor.');
    } finally {
      setBusy(false);
    }
  };

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

        {/* 2. Estado de Error general */}
        {!loading && error && !isEditing && (
          <div className="max-w-4xl mx-auto mb-6">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-4 text-red-700 shadow-sm">
              <AlertCircle className="h-6 w-6 mt-0.5 flex-shrink-0 text-red-600" />
              <div>
                <h3 className="font-semibold text-base">Error al cargar el perfil</h3>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Notificaciones visuales de éxito o error en edición */}
        {success && (
          <div className="max-w-5xl mx-auto mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-800 shadow-sm">
            <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <span className="text-sm font-medium">{success}</span>
          </div>
        )}

        {error && isEditing && (
          <div className="max-w-5xl mx-auto mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-red-700 shadow-sm">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-red-600" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* 3. Datos del Perfil */}
        {!loading && profileData && (
          <div className="max-w-5xl mx-auto space-y-6">
            
            {/* Encabezado Principal / Banner con botón de Editar */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 text-2xl font-black">
                  {firstName ? firstName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                    {[firstName, lastName].filter(Boolean).join(' ') || username}
                  </h1>
                  <p className="text-sm font-medium text-slate-500">@{username}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                  profileData.status?.name === 'ACTIVE' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {profileData.status?.name ?? 'ACTIVO'}
                </span>

                {!isEditing && (
                  <Button 
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                    className="rounded-xl border-slate-200 text-slate-700 text-xs font-semibold"
                  >
                    <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                    Editar Perfil
                  </Button>
                )}
              </div>
            </div>

            {/* VISTA DE LECTURA */}
            {!isEditing ? (
              <div className="space-y-6">
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
                          {[firstName, lastName].filter(Boolean).join(' ') || 'No especificado'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-xs font-medium uppercase tracking-wider">Teléfono</span>
                        <p className="font-medium text-slate-700 mt-0.5 flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {phoneNumber || 'No especificado'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-xs font-medium uppercase tracking-wider">Fecha de Nacimiento</span>
                        <p className="font-medium text-slate-700 mt-0.5 flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {dateOfBirth || 'No especificada'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-xs font-medium uppercase tracking-wider">Biografía</span>
                        <p className="font-medium text-slate-600 mt-0.5 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                          {bio || 'Sin biografía registrada.'}
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
                        <p className="font-medium text-slate-700 mt-0.5">{email}</p>
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
                      {profileData.roles.map((r: any) => (
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
            ) : (
              /* VISTA DE FORMULARIO DE EDICIÓN (Con Correo y Username añadidos) */
              <form onSubmit={handleUpdateProfile} className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5">
                <h2 className="text-base font-bold text-slate-800 mb-4">Editar Información Personal</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nombre(s)</label>
                    <input 
                      type="text" 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Apellidos</label>
                    <input 
                      type="text" 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nombre de usuario</label>
                    <input 
                      type="text" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Correo electrónico</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nueva contraseña (dejar en blanco para no cambiar)</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Teléfono</label>
                    <input 
                      type="text" 
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Fecha de nacimiento</label>
                    <input 
                      type="date" 
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Biografía</label>
                  <textarea 
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <Button 
                    type="submit" 
                    disabled={busy}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm text-sm px-6 py-2.5"
                  >
                    {busy ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                </div>
              </form>
            )}

          </div>
        )}
      </main>
    </div>
  );
}