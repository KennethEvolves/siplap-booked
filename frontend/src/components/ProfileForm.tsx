// src/components/ProfileForm.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { apiFetch, removeToken } from '@/lib/api';
import { signOut } from 'next-auth/react';
import { User, Mail, Phone, Calendar, LogOut, Edit3, CheckCircle } from 'lucide-react';

export default function ProfileForm() {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  
  // Campos reales basados en la base de datos
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bio, setBio] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Función para cerrar sesión desde el perfil
  const handleLogout = async () => {
    removeToken();
    try {
      await signOut({ redirectTo: '/login' });
    } catch {
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        // const res: any = await apiFetch('/profile');
        
        const data = {
          username: 'SuperUsuario',
          email: 'admin@siplap.com',
          first_name: 'Administrador',
          last_name: 'General',
          phone_number: '+52 999 123 4567',
          date_of_birth: '1995-05-12',
          bio: 'Superusuario encargado de la gestión institucional del sistema.'
        };
        
        setUsername(data.username);
        setEmail(data.email);
        setFirstName(data.first_name);
        setLastName(data.last_name);
        setPhoneNumber(data.phone_number);
        setDateOfBirth(data.date_of_birth);
        setBio(data.bio);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar la información');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // --- TAREA 2: VALIDACIONES DEL LADO DEL CLIENTE ---
    
    // 1. Validar campos requeridos vacíos
    if (!username.trim() || !email.trim() || !firstName.trim() || !lastName.trim()) {
      setError('Por favor, completa todos los campos obligatorios (Usuario, Correo, Nombre y Apellidos).');
      return;
    }

    // 2. Validar formato básico de correo electrónico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor, introduce un correo electrónico válido.');
      return;
    }

    // 3. Validar longitud mínima de contraseña si el usuario escribió una nueva
    if (password.trim() !== '' && password.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    // ---------------------------------------------------

    setBusy(true);

    try {
      const payload: any = {
        username,
        email,
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        date_of_birth: dateOfBirth,
        bio,
      };

      if (password.trim() !== '') {
        payload.password = password;
      }

      // await apiFetch('/profile', { method: 'PATCH', body: JSON.stringify(payload) });

      setSuccess('¡Tus datos se han actualizado correctamente!');
      setPassword('');
      setIsEditing(false);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el perfil');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-10 rounded-2xl border border-slate-200/80 shadow-sm max-w-4xl mx-auto text-center text-slate-400">
        Cargando perfil...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-8">
        
        {/* Encabezado con Avatar, Editar y Cerrar Sesión */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-2xl shadow-md shadow-blue-500/20">
              {firstName ? firstName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">{firstName} {lastName}</h2>
              <p className="text-sm text-slate-500 font-medium">@{username} • <span className="text-blue-600 font-semibold">Institucional</span></p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

            {/* Botón de Cerrar Sesión */}
            <Button 
              onClick={handleLogout}
              variant="destructive"
              className="rounded-xl text-xs font-semibold"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              Cerrar sesión
            </Button>
          </div>
        </div>

        {success && (
          <div className="p-4 bg-emerald-50 text-emerald-700 text-sm rounded-xl font-medium flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            {success}
          </div>
        )}
        {error && <div className="p-4 bg-rose-50 text-rose-700 text-sm rounded-xl font-medium">{error}</div>}

        {/* VISTA DE LECTURA */}
        {!isEditing ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Correo electrónico</span>
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-600" /> {email}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Teléfono de contacto</span>
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-blue-600" /> {phoneNumber || 'No registrado'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Fecha de nacimiento</span>
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" /> {dateOfBirth || 'No registrada'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Biografía</span>
              <p className="text-sm text-slate-700 leading-relaxed">{bio || 'Sin biografía registrada.'}</p>
            </div>
          </div>
        ) : (
          /* VISTA DE FORMULARIO DE EDICIÓN */
          <form onSubmit={handleUpdateProfile} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nombre(s)</label>
                <input 
                  type="text" 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Apellidos</label>
                <input 
                  type="text" 
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
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
    </div>
  );
}