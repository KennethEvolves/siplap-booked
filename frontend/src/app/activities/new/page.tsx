'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  DollarSign, 
  Calendar, 
  MapPin, 
  FileText, 
  Award, 
  Building2, 
  ExternalLink,
  Loader2,
  UserCheck
} from 'lucide-react';
import { 
  createActivity, 
  setActivityPersonnel,
  apiFetch, 
  ExternalLocationInput 
} from '@/lib/api';

interface RecursoFinancieroItem {
  id: string;
  tipo: string;
  monto: number;
}

interface EspacioSeleccionado {
  id: string;
  spaceId: string;
}

interface AxisItem {
  axisId: string;
  name: string;
  description?: string | null;
}

interface ObjectiveItem {
  objectiveId: string;
  name: string;
  description?: string | null;
  axisId: string;
}

interface UserOption {
  userId?: string;
  user_id?: string;
  username: string;
  email?: string;
}

interface UserCapabilities {
  canCreate: boolean;
  canAssignCreator: boolean;
  canViewAll: boolean;
  canViewOwn: boolean;
  canViewAssigned: boolean;
  canUpdateAll: boolean;
  canUpdateOwn: boolean;
  canApprove: boolean;
  canDelete: boolean;
  approvalOptions: string[];
}

export default function NewActivityPage() {
  const router = useRouter();

  // Estados de datos remotos y sesión
  const [axesList, setAxesList] = useState<AxisItem[]>([]);
  const [objectivesList, setObjectivesList] = useState<ObjectiveItem[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserOption[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [backendCapabilities, setBackendCapabilities] = useState<UserCapabilities | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);

  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selector institucional de creador (exclusivo para superusuario / gestionar actividades)
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>('');

  // 1. Alcance de la actividad
  const [selectedAxisId, setSelectedAxisId] = useState('');
  const [selectedObjectiveId, setSelectedObjectiveId] = useState('');
  const [noActividad, setNoActividad] = useState('');

  // 2. Datos generales
  const [nombreActividad, setNombreActividad] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [tipoUbicacion, setTipoUbicacion] = useState('');
  const [selectedPersonnelIds, setSelectedPersonnelIds] = useState<string[]>([]);

  // Subflujo 1: Espacios universitarios
  const [espaciosSeleccionados, setEspaciosSeleccionados] = useState<EspacioSeleccionado[]>([
    { id: '1', spaceId: '' }
  ]);

  const catalogoEspacios = [
    { id: 'eee7e59b-7fed-4384-a39a-722e37ab2670', nombre: 'Explanada Principal' },
    { id: 'esp-auditorio', nombre: 'Auditorio Principal' },
    { id: 'esp-sum', nombre: 'Sala de Usos Múltiples (SUM)' },
    { id: 'esp-lab1', nombre: 'Laboratorio de Cómputo 1' },
    { id: 'esp-lab-gastro', nombre: 'Laboratorio de Gastronomía' },
  ];

  // Matriz de autorización
  const canAssignCreator = useMemo(() => {
    return (
      permissions.includes('manage:all') ||
      permissions.includes('activity:manage') ||
      Boolean(backendCapabilities?.canAssignCreator)
    );
  }, [permissions, backendCapabilities]);

  // Carga inicial sincronizada idéntica a StrategicPlanningPage
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoadingCatalogs(true);

        try {
          const { getSession } = await import('next-auth/react');
          const session = await getSession();
          const userPerms = session?.user?.permissions || [];
          setPermissions(userPerms);
          setCurrentUserId(session?.user?.id);
        } catch (err) {
          console.error('Error al sincronizar sesión:', err);
        }

        const [resAxes, resObjectives, resUsers, resCaps] = await Promise.allSettled([
          apiFetch<any>('/api/axes'),
          apiFetch<any>('/api/objectives'),
          apiFetch<any>('/api/activities/creators?page=1&limit=100'),
          apiFetch<UserCapabilities>('/activities/capabilities').catch(() => null),
        ]);

        if (resAxes.status === 'fulfilled' && resAxes.value) {
          const rawAxes = resAxes.value.axes || (Array.isArray(resAxes.value) ? resAxes.value : []);
          setAxesList(
            rawAxes.map((a: any) => ({
              axisId: a.axisId || a.axis_id || a.id,
              name: a.name || 'Sin nombre',
              description: a.description || '',
            }))
          );
        }

        if (resObjectives.status === 'fulfilled' && resObjectives.value) {
          const rawObj = resObjectives.value.objectives || (Array.isArray(resObjectives.value) ? resObjectives.value : []);
          setObjectivesList(
            rawObj.map((o: any) => ({
              objectiveId: o.objectiveId || o.objective_id || o.id,
              name: o.name || 'Sin nombre',
              description: o.description || '',
              axisId: o.axisId || o.axis_id || o.axis?.axis_id || '',
            }))
          );
        }

        if (resUsers.status === 'fulfilled' && resUsers.value) {
          const rawUsers = resUsers.value.users || (Array.isArray(resUsers.value) ? resUsers.value : []);
          setAvailableUsers(rawUsers);
        }

        if (resCaps.status === 'fulfilled' && resCaps.value) {
          setBackendCapabilities(resCaps.value);
        }
      } catch (err) {
        console.error('Error al sincronizar catálogos institucionales:', err);
      } finally {
        setLoadingCatalogs(false);
      }
    }

    void loadInitialData();
  }, []);

  // Filtrado de objetivos dependiente del eje seleccionado
  const filteredObjectives = useMemo(() => {
    if (!selectedAxisId) return [];
    return objectivesList.filter((obj) => obj.axisId === selectedAxisId);
  }, [objectivesList, selectedAxisId]);

  const handleAddEspacio = () => {
    setEspaciosSeleccionados((prev) => [
      ...prev,
      { id: Date.now().toString(), spaceId: '' }
    ]);
  };

  const handleRemoveEspacio = (id: string) => {
    if (espaciosSeleccionados.length === 1) {
      setEspaciosSeleccionados([{ id: Date.now().toString(), spaceId: '' }]);
      return;
    }
    setEspaciosSeleccionados((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateEspacio = (id: string, spaceId: string) => {
    setEspaciosSeleccionados((prev) =>
      prev.map((item) => (item.id === id ? { ...item, spaceId } : item))
    );
  };

  // Subflujo 2: Ubicaciones externas
  const [externalLocations, setExternalLocations] = useState<ExternalLocationInput[]>([]);
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationLat, setLocationLat] = useState('20.6896');
  const [locationLng, setLocationLng] = useState('-88.2011');

  const handleAddExternalLocation = () => {
    if (!locationName.trim() || !locationAddress.trim()) return;

    const lat = parseFloat(locationLat) || 20.6896;
    const lng = parseFloat(locationLng) || -88.2011;

    const newLoc: ExternalLocationInput = {
      name: locationName.trim(),
      formattedAddress: locationAddress.trim(),
      googlePlaceId: `custom-${Date.now()}`,
      latitude: lat,
      longitude: lng,
    };

    setExternalLocations((prev) => [...prev, newLoc]);
    setLocationName('');
    setLocationAddress('');
  };

  const handleRemoveExternalLocation = (index: number) => {
    setExternalLocations((prev) => prev.filter((_, i) => i !== index));
  };

  // 3. Recursos Financieros
  const [recursosList, setRecursosList] = useState<RecursoFinancieroItem[]>([
    { id: '1', tipo: 'Gasolina y transportación', monto: 0 },
  ]);

  const handleAddRecurso = () => {
    setRecursosList((prev) => [...prev, { id: Date.now().toString(), tipo: '', monto: 0 }]);
  };

  const handleRemoveRecurso = (id: string) => {
    if (recursosList.length === 1) {
      setRecursosList([{ id: Date.now().toString(), tipo: '', monto: 0 }]);
      return;
    }
    setRecursosList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateRecurso = (id: string, field: 'tipo' | 'monto', value: string) => {
    setRecursosList((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            [field]: field === 'monto' ? parseFloat(value) || 0 : value,
          };
        }
        return item;
      })
    );
  };

  const totalFinanciamiento = recursosList.reduce((acc, curr) => acc + (curr.monto || 0), 0);

  // 4. Observaciones y 5. Datos adicionales
  const [observaciones, setObservaciones] = useState('');
  const [constancias, setConstancias] = useState('');
  const [requiereAutoridades, setRequiereAutoridades] = useState<'si' | 'no'>('no');

  const handleTogglePersonnel = (userId: string) => {
    setSelectedPersonnelIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedObjectiveId) {
      setErrorMessage('Es necesario seleccionar un Objetivo Estratégico institucional.');
      return;
    }

    if (!fechaInicio || !fechaFin) {
      setErrorMessage('Las fechas de inicio y término son requeridas.');
      return;
    }

    try {
      setIsSubmitting(true);

      const ubicacionesParaEnviar = (tipoUbicacion === 'externo' || tipoUbicacion === 'mixto')
        ? externalLocations
        : [];

      const validCreatorId =
        canAssignCreator && selectedCreatorId.trim().length > 0
          ? selectedCreatorId.trim()
          : undefined;

      // 1. Guardar la actividad institucional con su objetivo asociado
      const result = await createActivity({
        title: nombreActividad.trim(),
        description: descripcion.trim() || undefined,
        startDate: fechaInicio,
        endDate: fechaFin,
        objectiveId: selectedObjectiveId,
        type: 'extraordinary',
        requiresAuthority: requiereAutoridades === 'si',
        requiresCertified: constancias.trim().length > 0,
        generalObservation: observaciones.trim() || undefined,
        externalLocations: ubicacionesParaEnviar,
        ...(validCreatorId ? { creatorId: validCreatorId } : {}),
      });

      const newActivityId = result.activity?.activityId;

      // 2. Asociar colaboradores seleccionados en la tabla relacional
      if (newActivityId && selectedPersonnelIds.length > 0) {
        await setActivityPersonnel(newActivityId, selectedPersonnelIds).catch((err) =>
          console.warn('Advertencia al asociar colaboradores:', err)
        );
      }

      router.push('/activities');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la actividad.';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  const cardSectionClass = 'bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6';
  const labelClass = 'block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2';
  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all';

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <Sidebar />

      <main className="flex-1 p-6 sm:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <div className="flex items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-4">
              <Link
                href="/activities"
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                title="Volver a Actividades"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                  Gestión Operativa e Institucional
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">
                  Agregar Actividad Extraordinaria
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Ingresa y programa los alcances, tiempos y recursos requeridos para el evento.
                </p>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* PANEL DE ASIGNACIÓN DE CREADOR (SÓLO SI TIENE PERMISO DE GESTIONAR ACTIVIDADES) */}
            {canAssignCreator && (
              <section className="bg-amber-50/60 rounded-2xl border border-amber-200 p-6 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-amber-700" />
                  <h2 className="text-sm font-bold text-amber-900 uppercase tracking-wider">
                    Asignación de Creador (Control Administrativo)
                  </h2>
                </div>
                <p className="text-xs text-amber-800/90">
                  Cuentas con permiso global para gestionar actividades. Puedes registrar esta actividad a nombre de otro usuario o dejarlo por defecto a tu nombre.
                </p>
                <div className="max-w-md pt-1">
                  <label className="block text-[11px] font-bold text-amber-900 uppercase mb-1">
                    Usuario Creador / Titular del Evento
                  </label>
                  <select
                    value={selectedCreatorId}
                    onChange={(e) => setSelectedCreatorId(e.target.value)}
                    className={`${inputClass} bg-white border-amber-200 cursor-pointer`}
                  >
                    <option value="">- Asignar a mi cuenta actual (por defecto) -</option>
                    {availableUsers.map((u) => {
                      const uid = u.userId || u.user_id || '';
                      const isCurrent = uid === currentUserId;
                      return (
                        <option key={uid} value={uid}>
                          {u.username} {u.email ? `(${u.email})` : ''} {isCurrent ? '— [Tu cuenta]' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </section>
            )}

            {/* 1. ALCANCE DE LA ACTIVIDAD */}
            <section className={cardSectionClass}>
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <Building2 className="h-4 w-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  1. Alcance de la Actividad
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-6">
                  <label className={labelClass}>Eje Institucional *</label>
                  <select
                    value={selectedAxisId}
                    onChange={(e) => {
                      setSelectedAxisId(e.target.value);
                      setSelectedObjectiveId('');
                    }}
                    className={`${inputClass} cursor-pointer`}
                    required
                    disabled={loadingCatalogs}
                  >
                    <option value="">
                      {loadingCatalogs ? 'Cargando ejes...' : '- Seleccione el eje rector -'}
                    </option>
                    {axesList.map((item) => (
                      <option key={item.axisId} value={item.axisId}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-6">
                  <label className={labelClass}>Objetivo Estratégico *</label>
                  <select
                    value={selectedObjectiveId}
                    onChange={(e) => setSelectedObjectiveId(e.target.value)}
                    className={`${inputClass} cursor-pointer`}
                    required
                    disabled={loadingCatalogs || !selectedAxisId}
                  >
                    <option value="">
                      {!selectedAxisId
                        ? '- Primero seleccione un eje -'
                        : filteredObjectives.length === 0
                        ? '- No hay objetivos para este eje -'
                        : '- Seleccione el objetivo -'}
                    </option>
                    {filteredObjectives.map((obj) => (
                      <option key={obj.objectiveId} value={obj.objectiveId}>
                        {obj.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-4">
                  <label className={labelClass}>No. de Actividad (Referencia)</label>
                  <input
                    type="text"
                    value={noActividad}
                    onChange={(e) => setNoActividad(e.target.value)}
                    placeholder="Ej. ACT-2026-08"
                    className={inputClass}
                  />
                </div>
              </div>
            </section>

            {/* 2. DATOS GENERALES */}
            <section className={cardSectionClass}>
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <Calendar className="h-4 w-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  2. Datos Generales
                </h2>
              </div>

              <div className="space-y-5">
                <div>
                  <label className={labelClass}>Nombre de la Actividad *</label>
                  <input
                    type="text"
                    value={nombreActividad}
                    onChange={(e) => setNombreActividad(e.target.value)}
                    placeholder="Ej. Congreso Internacional de Innovación y Tecnología"
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>Descripción Detallada</label>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Especifica los objetivos, programa general y requerimientos del evento..."
                    rows={3}
                    className={`${inputClass} resize-none`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className={labelClass}>Fecha Inicio *</label>
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Fecha Fin *</label>
                    <input
                      type="date"
                      value={fechaFin}
                      min={fechaInicio}
                      onChange={(e) => setFechaFin(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Hora Inicio</label>
                    <input
                      type="time"
                      value={horaInicio}
                      onChange={(e) => setHoraInicio(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Hora Fin</label>
                    <input
                      type="time"
                      value={horaFin}
                      onChange={(e) => setHoraFin(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                  <div>
                    <label className={labelClass}>Tipo de Ubicación *</label>
                    <select
                      value={tipoUbicacion}
                      onChange={(e) => setTipoUbicacion(e.target.value)}
                      className={`${inputClass} cursor-pointer`}
                      required
                    >
                      <option value="">- Seleccione el tipo de lugar -</option>
                      <option value="interno">Espacio de la Universidad (Interno)</option>
                      <option value="externo">Lugar externo (API Google Maps)</option>
                      <option value="mixto">Mixto (Espacio institucional y externo)</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Colaboradores Involucrados</label>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-36 overflow-y-auto space-y-1.5">
                      {availableUsers.length === 0 ? (
                        <p className="text-xs text-slate-500">No hay otros colaboradores disponibles</p>
                      ) : (
                        availableUsers.map((u) => {
                          const uid = u.userId || u.user_id || '';
                          const isSelected = selectedPersonnelIds.includes(uid);
                          return (
                            <label
                              key={uid}
                              className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer hover:bg-slate-100/70 p-1 rounded-md"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleTogglePersonnel(uid)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="font-semibold text-slate-900">{u.username}</span>
                              {u.email && <span className="text-[11px] text-slate-500">({u.email})</span>}
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* SUBFLUJO 1: ESPACIOS DE LA UNIVERSIDAD */}
                {(tipoUbicacion === 'interno' || tipoUbicacion === 'mixto') && (
                  <div className="mt-2 p-5 rounded-xl border border-blue-100 bg-blue-50/40 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Building2 className="h-4 w-4 text-blue-600" />
                          Espacios Universitarios a Reservar *
                        </h3>
                        <p className="text-xs text-blue-600/90 mt-0.5">
                          Selecciona uno o varios espacios para generar sus reservaciones en estado pendiente.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddEspacio}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
                      >
                        <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                        Agregar otro espacio
                      </button>
                    </div>

                    <div className="space-y-3">
                      {espaciosSeleccionados.map((item, index) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-blue-600 w-6">#{index + 1}</span>
                          <div className="flex-1">
                            <select
                              value={item.spaceId}
                              onChange={(e) => handleUpdateEspacio(item.id, e.target.value)}
                              className={`${inputClass} bg-white cursor-pointer`}
                              required
                            >
                              <option value="">- Seleccione un espacio / aula -</option>
                              {catalogoEspacios.map((esp) => (
                                <option key={esp.id} value={esp.id}>
                                  {esp.nombre}
                                </option>
                              ))}
                            </select>
                          </div>
                          {espaciosSeleccionados.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveEspacio(item.id)}
                              className="p-2.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Quitar espacio"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SUBFLUJO 2: UBICACIONES EXTERNAS */}
                {(tipoUbicacion === 'externo' || tipoUbicacion === 'mixto') && (
                  <div className="mt-2 p-5 rounded-xl border border-emerald-100 bg-emerald-50/30 space-y-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-emerald-700" />
                      <div>
                        <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                          Ubicaciones Externas
                        </h3>
                        <p className="text-xs text-emerald-800/80 mt-0.5">
                          Busca y agrega uno o varios lugares fuera del campus institucional.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-white/80 rounded-xl border border-emerald-100 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <p className="text-xs text-slate-600">
                          Puedes buscar el lugar en Google Maps y capturar sus coordenadas aquí:
                        </p>
                        <a
                          href="https://www.google.com/maps"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors w-fit"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Buscar lugar en Google Maps
                        </a>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Nombre del lugar</label>
                          <input
                            type="text"
                            placeholder="Auditorio, edificio o plaza"
                            value={locationName}
                            onChange={(e) => setLocationName(e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Dirección o referencia</label>
                          <input
                            type="text"
                            placeholder="Calle, número, colonia o ciudad"
                            value={locationAddress}
                            onChange={(e) => setLocationAddress(e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Latitud</label>
                          <input
                            type="text"
                            placeholder="20.6896"
                            value={locationLat}
                            onChange={(e) => setLocationLat(e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Longitud</label>
                          <input
                            type="text"
                            placeholder="-88.2011"
                            value={locationLng}
                            onChange={(e) => setLocationLng(e.target.value)}
                            className={inputClass}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <p className="text-[11px] text-slate-500">
                          En Google Maps, haz clic derecho sobre el punto y copia las coordenadas (latitud, longitud).
                        </p>
                        <button
                          type="button"
                          onClick={handleAddExternalLocation}
                          className="px-4 py-2 bg-[#5b141b] hover:bg-[#481015] text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                        >
                          Agregar ubicación
                        </button>
                      </div>
                    </div>

                    {externalLocations.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Lugares agregados ({externalLocations.length})
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                          {externalLocations.map((loc, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-emerald-600" />
                                <div>
                                  <p className="font-bold text-slate-800">{loc.name}</p>
                                  <p className="text-slate-500">{loc.formattedAddress}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveExternalLocation(idx)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Eliminar lugar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </section>

            {/* 3. RECURSOS FINANCIEROS */}
            <section className={cardSectionClass}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      3. Recursos Financieros y Presupuesto
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Desglosa cada tipo de recurso necesario y especifica su importe presupuestal.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddRecurso}
                  className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3.5 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                  Agregar Concepto
                </button>
              </div>

              <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        <th className="py-3 px-5">Tipo de Recurso / Concepto</th>
                        <th className="py-3 px-5 w-48 text-right">Monto (MXN)</th>
                        <th className="py-3 px-4 w-16 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {recursosList.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-5">
                            <input
                              type="text"
                              value={item.tipo}
                              onChange={(e) => handleUpdateRecurso(item.id, 'tipo', e.target.value)}
                              placeholder="Ej. Gasolina, viáticos, hospedaje, consumibles..."
                              className="w-full bg-transparent border-0 border-b border-dashed border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600 placeholder:text-slate-400"
                            />
                          </td>
                          <td className="py-3 px-5 text-right">
                            <div className="relative inline-flex items-center w-full max-w-[180px]">
                              <span className="absolute left-3 text-slate-400 font-medium text-xs">$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.monto === 0 ? '' : item.monto}
                                onChange={(e) => handleUpdateRecurso(item.id, 'monto', e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-7 pr-3 py-1.5 text-right font-medium text-slate-900 bg-slate-50 rounded-lg border border-slate-200 focus:bg-white focus:outline-none focus:border-blue-600 transition-all text-sm"
                              />
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRecurso(item.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Eliminar fila"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50/80 border-t border-slate-200 font-bold">
                        <td className="py-3.5 px-5 text-xs text-slate-600 uppercase tracking-wider">
                          Monto Total Presupuestado:
                        </td>
                        <td className="py-3.5 px-5 text-right text-base text-blue-600 font-extrabold">
                          $ {totalFinanciamiento.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </section>

            {/* 4. OBSERVACIONES Y 5. DATOS ADICIONALES */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className={cardSectionClass}>
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    4. Observaciones
                  </h2>
                </div>
                <div>
                  <label className={labelClass}>Observaciones Generales</label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Comentarios adicionales, requerimientos de apoyo o especificaciones..."
                    rows={4}
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </section>

              <section className={cardSectionClass}>
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Award className="h-4 w-4 text-blue-600" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    5. Datos Adicionales
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>¿Requiere Constancias?</label>
                    <input
                      type="text"
                      value={constancias}
                      onChange={(e) => setConstancias(e.target.value)}
                      placeholder="Describa datos específicos de las constancias o constancia no requerida"
                      className={inputClass}
                    />
                  </div>

                  <div className="pt-1">
                    <label className={labelClass}>¿Requiere Presencia de Autoridades?</label>
                    <div className="flex items-center gap-6 mt-2">
                      <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="autoridades"
                          value="si"
                          checked={requiereAutoridades === 'si'}
                          onChange={() => setRequiereAutoridades('si')}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        Sí
                      </label>
                      <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="autoridades"
                          value="no"
                          checked={requiereAutoridades === 'no'}
                          onChange={() => setRequiereAutoridades('no')}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        No
                      </label>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="flex justify-end items-center gap-3 pt-4">
              <button
                type="button"
                onClick={() => router.push('/activities')}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-[#5b6470] hover:bg-[#4a525d] text-white text-sm font-semibold rounded-xl shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#5b141b] hover:bg-[#481015] text-white text-sm font-semibold rounded-xl shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar Actividad
              </button>
            </div>

          </form>

        </div>
      </main>
    </div>
  );
}