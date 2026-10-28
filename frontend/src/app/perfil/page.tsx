'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, updateUserProfile, UserProfileResponse, UpdateProfilePayload } from '@/lib/api';
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
  AlertCircle, 
  Pencil, 
  CheckCircle2, 
  X, 
  Save 
} from 'lucide-react';

export default function PerfilPage() {
  const [profileData, setProfileData] = useState<UserProfileResponse['profile'] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Modo edición y estado del formulario
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    bio: '',
  });

  const loadProfile = useCallback(async () => {
    try {
      const data = await apiFetch<UserProfileResponse>('/api/users/profile');
      setProfileData(data.profile);
      setFormData({
        firstName: data.profile.firstName ?? '',
        lastName: data.profile.lastName ?? '',
        email: data.profile.email ?? '',
        phoneNumber: data.profile.phoneNumber ?? '',
        dateOfBirth: data.profile.dateOfBirth ? data.profile.dateOfBirth.substring(0, 10) : '',
        bio: data.profile.bio ?? '',
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error inesperado al cargar el perfil.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadProfile);
  }, [loadProfile]);

  const handleStartEditing = () => {
    if (!profileData) return;
    setFeedback(null);
    setEmailError(null);
    setPhoneError(null);
    setFormData({
      firstName: profileData.firstName ?? '',
      lastName: profileData.lastName ?? '',
      email: profileData.email ?? '',
      phoneNumber: profileData.phoneNumber ?? '',
      dateOfBirth: profileData.dateOfBirth ? profileData.dateOfBirth.substring(0, 10) : '',
      bio: profileData.bio ?? '',
    });
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setFeedback(null);
    setEmailError(null);
    setPhoneError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setEmailError(null);
    setPhoneError(null);

    let hasValidationError = false;

    // 1. Validación de Correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      setEmailError('El correo electrónico es requerido.');
      hasValidationError = true;
    } else if (!emailRegex.test(formData.email.trim())) {
      setEmailError('Ingresa un correo válido (ej. usuario@dominio.com).');
      hasValidationError = true;
    }

    // 2. Validación de Teléfono (opcional, pero si escribe algo, debe ser válido)
    const cleanPhone = formData.phoneNumber.trim().replace(/[\s-]/g, '');
    if (cleanPhone) {
      const phoneDigitsRegex = /^\d+$/;
      if (!phoneDigitsRegex.test(cleanPhone)) {
        setPhoneError('El teléfono solo debe contener números.');
        hasValidationError = true;
      } else if (cleanPhone.length < 10) {
        setPhoneError('El número de teléfono debe tener al menos 10 dígitos.');
        hasValidationError = true;
      } else if (cleanPhone.length > 15) {
        setPhoneError('El número de teléfono no puede exceder 15 dígitos.');
        hasValidationError = true;
      }
    }

    // 3. Validación de Fecha de Nacimiento
    if (!formData.dateOfBirth) {
      setFeedback({ type: 'error', message: 'La fecha de nacimiento es obligatoria.' });
      return;
    }
    {
      const selectedDate = new Date(formData.dateOfBirth);
      const today = new Date();
      if (selectedDate > today) {
        setFeedback({ type: 'error', message: 'La fecha de nacimiento no puede ser en el futuro.' });
        return;
      }
    }

    if (hasValidationError) {
      setFeedback({ type: 'error', message: 'Revisa los campos señalados en rojo antes de guardar.' });
      return;
    }

    // 4. Preparar payload
    const payload: UpdateProfilePayload = {
      email: formData.email.trim(),
      firstName: formData.firstName.trim() || null,
      lastName: formData.lastName.trim() || null,
      phoneNumber: cleanPhone || null,
      dateOfBirth: formData.dateOfBirth,
      bio: formData.bio.trim() || null,
    };

    try {
      setSaving(true);
      const updated = await updateUserProfile(payload);
      setProfileData(updated.profile);
      setIsEditing(false);
      setFeedback({ type: 'success', message: '¡Perfil actualizado con éxito!' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo actualizar el perfil.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const displayName = isEditing
    ? [formData.firstName, formData.lastName].filter(Boolean).join(' ') || profileData?.username || ''
    : [profileData?.firstName, profileData?.lastName].filter(Boolean).join(' ') || profileData?.username || '';

  const avatarInitial = isEditing
    ? (formData.firstName ? formData.firstName.charAt(0).toUpperCase() : profileData?.username?.charAt(0).toUpperCase() || 'U')
    : (profileData?.firstName ? profileData.firstName.charAt(0).toUpperCase() : profileData?.username?.charAt(0).toUpperCase() || 'U');

// Estilos compartidos de los campos (text-base en móvil evita el zoom de iOS)
  const inputBase =
    'w-full min-h-[44px] px-3 py-2 border rounded-xl text-base sm:text-sm bg-background text-foreground focus:outline-none focus:ring-2 transition-all';
  const inputOk = 'border-input focus:ring-primary/20 focus:border-primary';
  const inputErr =
    'border-uno-terracota focus:ring-uno-terracota/20 focus:border-uno-terracota bg-uno-terracota/5';
  const editLabel = 'text-muted-foreground block text-xs font-semibold mb-1';
  const viewLabel = 'text-muted-foreground block text-xs font-medium uppercase tracking-wider';

  return (
    <div className="flex min-h-screen bg-secondary/40">
      <Sidebar />

      {/* pt-16 deja espacio al botón hamburguesa en móvil y tablet */}
      <main className="flex-1 min-w-0 p-4 pt-16 md:p-6 md:pt-16 lg:p-8 lg:pt-8 overflow-y-auto">
        {loading && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Cargando información del perfil...</p>
          </div>
        )}

        {!loading && error && (
          <div className="max-w-4xl mx-auto">
            <div
              role="alert"
              className="bg-uno-terracota/10 border border-uno-terracota/40 rounded-2xl p-4 md:p-6 flex items-start gap-4 text-uno-marron shadow-sm"
            >
              <AlertCircle className="h-6 w-6 mt-0.5 shrink-0 text-uno-terracota" />
              <div className="min-w-0">
                <h3 className="font-semibold text-base">Error al cargar el perfil</h3>
                <p className="text-sm mt-1 break-words">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && profileData && (
          <form onSubmit={handleSave} noValidate className="max-w-5xl mx-auto space-y-4 md:space-y-6">

            {/* Feedback General */}
            {feedback && (
              <div
                role={feedback.type === 'error' ? 'alert' : 'status'}
                className={`p-4 rounded-xl border flex items-center gap-3 shadow-sm transition-all ${
                  feedback.type === 'success'
                    ? 'bg-uno-verde border-uno-olivo/40 text-uno-negro'
                    : 'bg-uno-terracota/10 border-uno-terracota/40 text-uno-marron'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-uno-olivo shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-uno-terracota shrink-0" />
                )}
                <span className="text-sm font-medium">{feedback.message}</span>
              </div>
            )}

            {/* Banner Superior */}
            <div className="bg-card border border-border rounded-2xl p-4 md:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className="h-16 w-16 shrink-0 rounded-2xl flex items-center justify-center text-white shadow-md text-2xl font-black transition-all"
                  style={{ background: 'var(--uno-gradient)' }}
                >
                  {avatarInitial}
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl md:text-2xl font-bold text-foreground leading-tight break-words">
                    {displayName}
                  </h1>
                  <p className="text-sm font-medium text-muted-foreground break-all">@{profileData.username}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                    profileData.status?.name === 'ACTIVE'
                      ? 'bg-uno-verde text-uno-negro border-uno-olivo/50'
                      : 'bg-uno-beige/50 text-uno-negro border-uno-beige'
                  }`}
                >
                  {profileData.status?.name ?? 'ACTIVO'}
                </span>

                {!isEditing ? (
                  <button
                    type="button"
                    onClick={handleStartEditing}
                    className="cursor-pointer flex-1 sm:flex-none min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-uno-ciruela text-primary-foreground rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95"
                  >
                    <Pencil className="h-4 w-4" />
                    Editar Perfil
                  </button>
                ) : (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleCancelEditing}
                      className="cursor-pointer flex-1 sm:flex-none min-h-[44px] flex items-center justify-center gap-1.5 px-3.5 py-2 bg-secondary hover:bg-uno-marfil text-foreground rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:cursor-not-allowed"
                    >
                      <X className="h-4 w-4" />
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="cursor-pointer flex-1 sm:flex-none min-h-[44px] flex items-center justify-center gap-1.5 px-4 py-2 bg-primary hover:bg-uno-ciruela text-primary-foreground rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Guardar Cambios
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Datos Personales */}
              <div className="bg-card border border-border rounded-2xl p-4 md:p-6 shadow-sm space-y-4">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Datos Personales
                </h2>

                {isEditing ? (
                  <div className="space-y-3.5 text-sm">
                    <div>
                      <label className={editLabel}>Nombre</label>
                      <input
                        type="text"
                        placeholder="Ej. Juan"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className={`${inputBase} ${inputOk}`}
                      />
                    </div>
                    <div>
                      <label className={editLabel}>Apellido</label>
                      <input
                        type="text"
                        placeholder="Ej. Pérez"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className={`${inputBase} ${inputOk}`}
                      />
                    </div>
                    <div>
                      <label className={editLabel}>Teléfono</label>
                      <input
                        type="tel"
                        maxLength={15}
                        placeholder="Ej. 9903413583 (10 dígitos)"
                        value={formData.phoneNumber}
                        onChange={(e) => {
                          setFormData({ ...formData, phoneNumber: e.target.value });
                          if (phoneError) setPhoneError(null);
                        }}
                        className={`${inputBase} ${phoneError ? inputErr : inputOk}`}
                      />
                      {phoneError && (
                        <p className="text-xs text-uno-marron font-medium mt-1">{phoneError}</p>
                      )}
                    </div>
                    <div>
                      <label className={editLabel}>Fecha de Nacimiento</label>
                      <input
                        type="date"
                        required
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        className={`${inputBase} ${inputOk}`}
                      />
                    </div>
                    <div>
                      <label className={editLabel}>Biografía</label>
                      <textarea
                        rows={3}
                        placeholder="Escribe una breve descripción sobre ti..."
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        className={`${inputBase} ${inputOk} resize-none`}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className={viewLabel}>Nombre Completo</span>
                      <p className="font-medium text-foreground mt-0.5 break-words">
                        {profileData.firstName && profileData.lastName
                          ? `${profileData.firstName} ${profileData.lastName}`
                          : 'No especificado'}
                      </p>
                    </div>
                    <div>
                      <span className={viewLabel}>Teléfono</span>
                      <p className="font-medium text-foreground mt-0.5 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        {profileData.phoneNumber || 'No especificado'}
                      </p>
                    </div>
                    <div>
                      <span className={viewLabel}>Fecha de Nacimiento</span>
                      <p className="font-medium text-foreground mt-0.5 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {profileData.dateOfBirth || 'No especificada'}
                      </p>
                    </div>
                    <div>
                      <span className={viewLabel}>Biografía</span>
                      <p className="font-medium text-foreground mt-0.5 text-xs bg-secondary p-3 rounded-xl border border-border leading-relaxed break-words">
                        {profileData.bio || 'Sin biografía registrada.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Cuenta Institucional */}
              <div className="bg-card border border-border rounded-2xl p-4 md:p-6 shadow-sm space-y-4">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Cuenta Institucional
                </h2>

                <div className="space-y-3.5 text-sm">
                  <div>
                    <label className={viewLabel}>Correo Electrónico</label>
                    {isEditing ? (
                      <div>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => {
                            setFormData({ ...formData, email: e.target.value });
                            if (emailError) setEmailError(null);
                          }}
                          className={`mt-1 ${inputBase} ${emailError ? inputErr : inputOk}`}
                        />
                        {emailError && (
                          <p className="text-xs text-uno-marron font-medium mt-1">{emailError}</p>
                        )}
                      </div>
                    ) : (
                      <p className="font-medium text-foreground mt-0.5 break-all">{profileData.email}</p>
                    )}
                  </div>

                  <div>
                    <span className={viewLabel}>Departamento</span>
                    <p className="font-medium text-foreground mt-0.5 flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      {profileData.department?.name || 'No asignado'}
                    </p>
                  </div>
                  <div>
                    <span className={viewLabel}>Tipo de Usuario</span>
                    <p className="font-medium text-foreground mt-0.5 flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                      {profileData.userType?.name || 'No especificado'}
                    </p>
                  </div>
                  <div>
                    <span className={viewLabel}>Turno</span>
                    <p className="font-medium text-foreground mt-0.5 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {profileData.shift || 'No especificado'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Roles Asignados */}
            <div className="bg-card border border-border rounded-2xl p-4 md:p-6 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Roles Asignados en SIPLAP y Booked
              </h2>
              {profileData.roles && profileData.roles.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {profileData.roles.map((r) => (
                    <span
                      key={r.roleId}
                      className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/30 rounded-xl text-xs font-semibold tracking-wide"
                    >
                      {r.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No tienes roles especiales asignados actualmente.
                </p>
              )}
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
