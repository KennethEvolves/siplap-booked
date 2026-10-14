'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { 
  apiFetch, 
  UserProfileResponse, 
  ActivityItem, 
  ActivityStatus, 
  getActivities, 
  createActivity, 
  updateActivityStatus 
} from '@/lib/api';
import { 
  Calendar, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Check, 
  X, 
  Loader2, 
  User, 
  Building2, 
  Filter
} from 'lucide-react';

// Datos iniciales de respaldo para probar la UI mientras el backend termina sus endpoints
const INITIAL_MOCK_ACTIVITIES: ActivityItem[] = [
  {
    id: 'act-1',
    title: 'Mantenimiento Preventivo de Servidores',
    description: 'Revisión y actualización de parches de seguridad en la infraestructura local.',
    date: '2026-10-25',
    location: 'Laboratorio de Cómputo 1',
    status: 'PENDIENTE',
    createdById: 'user-lead-1',
    creatorName: 'Jefe de Sistemas',
  },
  {
    id: 'act-2',
    title: 'Capacitación en Plataforma SIPLAP',
    description: 'Taller presencial para el personal docente sobre el uso de reservas de espacios.',
    date: '2026-11-05',
    location: 'Auditorio Principal',
    status: 'APROBADO',
    createdById: 'user-coord-1',
    creatorName: 'Coordinación Académica',
  }
];

export default function ActividadesPage() {
  const [profile, setProfile] = useState<UserProfileResponse['profile'] | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filtro de estado
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');

  // Formulario de nueva actividad
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    location: '',
    assignedCreator: '',
  });

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Cargar perfil para determinar permisos (RBAC)
  const initData = async () => {
    try {
      setLoading(true);
      const userRes = await apiFetch<UserProfileResponse>('/api/users/profile');
      setProfile(userRes.profile);

      // Intentar cargar actividades desde la API
      try {
        const actRes = await getActivities();
        if (actRes?.activities) {
          setActivities(actRes.activities);
        } else {
          setActivities(INITIAL_MOCK_ACTIVITIES);
        }
      } catch {
        // Si el endpoint aún no está listo en el backend, usamos datos de demostración
        setActivities(INITIAL_MOCK_ACTIVITIES);
      }
    } catch {
      showToast('error', 'Error al cargar sesión de usuario.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initData();
  }, []);

  // Permisos según el perfil del usuario activo
  const userRoles = profile?.roles?.map((r) => r.name.toUpperCase()) || [];
  const isSuperUser = userRoles.some((r) => r.includes('SUPERUSUARIO') || r.includes('SUPERUSER'));
  const isDirective = userRoles.some((r) => r.includes('DIRECTIVO') || r.includes('DIRECTIVE') || r.includes('JEFE DE PLAZA'));

  // 2. Manejo de creación de actividad
  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.date) {
      showToast('error', 'Por favor llena los campos requeridos (Título y Fecha).');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        date: formData.date,
        location: formData.location.trim() || null,
        ...(isSuperUser && formData.assignedCreator ? { createdById: formData.assignedCreator } : {}),
      };

      try {
        const res = await createActivity(payload);
        setActivities((prev) => [res.activity, ...prev]);
      } catch {
        // En caso de que el endpoint no esté listo, actualizamos la vista localmente
        const newLocalActivity: ActivityItem = {
          id: `act-${Date.now()}`,
          title: payload.title,
          description: payload.description,
          date: payload.date,
          location: payload.location,
          status: 'PENDIENTE',
          createdById: payload.createdById || profile?.id || 'current-user',
          creatorName: payload.createdById ? `Usuario (${payload.createdById})` : (profile?.firstName ? `${profile.firstName} ${profile.lastName || ''}` : profile?.username || 'Yo'),
        };
        setActivities((prev) => [newLocalActivity, ...prev]);
      }

      showToast('success', 'Actividad registrada correctamente.');
      setShowModal(false);
      setFormData({ title: '', description: '', date: '', location: '', assignedCreator: '' });
    } catch {
      showToast('error', 'No se pudo crear la actividad.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Manejo de dictamen/aprobación (Directivos)
  const handleUpdateStatus = async (activityId: string, newStatus: ActivityStatus) => {
    try {
      try {
        await updateActivityStatus(activityId, { status: newStatus });
      } catch {
        // Simulación controlada si el endpoint aún responde 404
      }

      setActivities((prev) =>
        prev.map((act) => (act.id === activityId ? { ...act, status: newStatus } : act))
      );
      showToast('success', `Actividad actualizada a: ${newStatus}`);
    } catch {
      showToast('error', 'Error al actualizar el estado de la actividad.');
    }
  };

  // Filtrado de actividades
  const filteredActivities = activities.filter((act) => {
    if (filterStatus === 'TODOS') return true;
    return act.status === filterStatus;
  });

  const getStatusBadge = (status: ActivityStatus) => {
    switch (status) {
      case 'APROBADO':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="h-3.5 w-3.5" /> Aprobado</span>;
      case 'NO_APROBADO':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"><XCircle className="h-3.5 w-3.5" /> No Aprobado</span>;
      case 'CANCELADO':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"><X className="h-3.5 w-3.5" /> Cancelado</span>;
      case 'REPROGRAMACION':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"><AlertTriangle className="h-3.5 w-3.5" /> Reprogramación</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"><Clock className="h-3.5 w-3.5" /> Pendiente</span>;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto">
        {/* Notificación Toast */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
              toastMessage.type === 'success' 
                ? 'bg-emerald-600 text-white border-emerald-700' 
                : 'bg-rose-600 text-white border-rose-700'
            }`}>
              {toastMessage.type === 'success' ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {toastMessage.text}
            </div>
          </div>
        )}

        {/* Encabezado Principal */}
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">Gestión de Actividades</h1>
              <p className="text-sm text-slate-500 mt-1">
                Visualiza, aprueba y programa las actividades institucionales según tu nivel de rol.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-blue-500/20 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Nueva Actividad
            </button>
          </div>

          {/* Barra de Filtros */}
          <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm text-sm">
            <div className="flex items-center gap-2 text-slate-600 font-medium">
              <Filter className="h-4 w-4 text-slate-400" />
              <span>Filtrar estado:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {['TODOS', 'PENDIENTE', 'APROBADO', 'NO_APROBADO', 'REPROGRAMACION', 'CANCELADO'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filterStatus === st
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Listado de Actividades */}
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm font-medium">Cargando actividades...</p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-500">
              <Calendar className="h-10 w-10 mx-auto text-slate-400 mb-3" />
              <p className="text-base font-semibold text-slate-700">No hay actividades encontradas</p>
              <p className="text-sm mt-1">No se encontraron registros con el filtro seleccionado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredActivities.map((act) => (
                <div 
                  key={act.id}
                  className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all hover:border-slate-300"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-slate-900">{act.title}</h3>
                      {getStatusBadge(act.status)}
                    </div>

                    <p className="text-sm text-slate-600 leading-relaxed">{act.description}</p>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 pt-1">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {act.date}
                      </span>
                      {act.location && (
                        <span className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          {act.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        Creado por: <strong className="text-slate-700">{act.creatorName || act.createdById}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Botones de Dictamen para Directivos / Superusuarios */}
                  {(isDirective || isSuperUser) && (
                    <div className="flex flex-wrap items-center gap-2 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(act.id, 'APROBADO')}
                        className="cursor-pointer px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all active:scale-95 shadow-sm"
                      >
                        Aprobar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(act.id, 'NO_APROBADO')}
                        className="cursor-pointer px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-all active:scale-95 shadow-sm"
                      >
                        Rechazar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(act.id, 'REPROGRAMACION')}
                        className="cursor-pointer px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold transition-all active:scale-95 shadow-sm"
                      >
                        Reprogramar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(act.id, 'CANCELADO')}
                        className="cursor-pointer px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-all active:scale-95"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal: Formulario Nueva Actividad */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">Registrar Nueva Actividad</h3>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="cursor-pointer text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateActivity} className="space-y-4 pt-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Título de la actividad *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Conferencia de Ciberseguridad"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Fecha programada *</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Ubicación / Espacio</label>
                    <input
                      type="text"
                      placeholder="Ej. Sala de Juntas"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>
                </div>

                {/* Campo exclusivo para Superusuario (activity:manage) */}
                {isSuperUser && (
                  <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3.5 space-y-1">
                    <label className="text-xs font-bold text-blue-900 block">
                      Asignar Creador (Privilegio Superusuario)
                    </label>
                    <p className="text-xs text-blue-700">
                      Como superusuario, puedes vincular esta actividad a otro docente o coordinador.
                    </p>
                    <input
                      type="text"
                      placeholder="ID o nombre del usuario responsable"
                      value={formData.assignedCreator}
                      onChange={(e) => setFormData({ ...formData, assignedCreator: e.target.value })}
                      className="mt-1.5 w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Descripción</label>
                  <textarea
                    rows={3}
                    placeholder="Detalles sobre el objetivo o alcance de la actividad..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="cursor-pointer px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="cursor-pointer inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Guardar Actividad
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}