'use client';

import React, { useCallback, useEffect, useState, useTransition, useMemo } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ActivityModal } from '@/components/activities/ActivityModal';
import { Button } from '@/components/ui/Button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  BackendActivity, 
  BackendActivityStatus,
  getActivities, 
  createActivity,
  deleteActivity,
  updateActivity,
  updateActivityApproval
} from '@/lib/api';
import { Loader2, Check, AlertTriangle, ShieldCheck, Pencil, Trash2 } from 'lucide-react';

export default function ActivitiesPage() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [currentUsername, setCurrentUsername] = useState<string | undefined>(undefined);

  const [activities, setActivities] = useState<BackendActivity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [, startTransition] = useTransition();

  // Estado para edición en modal
  const [editingActivity, setEditingActivity] = useState<BackendActivity | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // =========================================================================
  // MATRIZ RBAC (Evaluación granular basada en permisos de sesión)
  // =========================================================================
  const isSuperUser = useMemo(() => {
    return permissions.includes('manage:all') || permissions.includes('activity:manage');
  }, [permissions]);

  const canApprove = useMemo(() => {
    return isSuperUser || permissions.includes('activity:approve_all');
  }, [isSuperUser, permissions]);

  const canViewAll = useMemo(() => {
    return isSuperUser || permissions.includes('activity:view_all');
  }, [isSuperUser, permissions]);

  const canCreate = useMemo(() => {
    return isSuperUser || permissions.includes('activity:create_own');
  }, [isSuperUser, permissions]);

  const canEditAll = useMemo(() => {
    return isSuperUser || permissions.includes('activity:update_all');
  }, [isSuperUser, permissions]);

  const canEditOwn = useMemo(() => {
    return permissions.includes('activity:update_own');
  }, [permissions]);

  // Verificar si el usuario puede editar una actividad específica
  const canEditActivity = (activity: BackendActivity) => {
    if (canEditAll) return true;
    if (canEditOwn) {
      const isOwner = currentUserId
        ? activity.creator?.userId === currentUserId
        : currentUsername &&
          activity.creator?.username?.toLowerCase() === currentUsername.toLowerCase();
      return Boolean(isOwner);
    }
    return false;
  };

  // Nivel de alcance institucional para la cabecera
  const roleScope = useMemo<'superuser' | 'directive' | 'lead'>(() => {
    if (isSuperUser) return 'superuser';
    if (canApprove || canViewAll) return 'directive';
    return 'lead';
  }, [isSuperUser, canApprove, canViewAll]);

  // =========================================================================
  // CARGA DE DATOS
  // =========================================================================
  const refreshData = useCallback(async () => {
    try {
      let fetchedPermissions: string[] = [];
      let userId: string | undefined = undefined;
      let username: string | undefined = undefined;

      try {
        const { getSession } = await import('next-auth/react');
        const session = await getSession();

        fetchedPermissions = session?.user?.permissions ?? [];
        userId = session?.user?.id;
        username = session?.user?.name || undefined;

        setPermissions(fetchedPermissions);
        setCurrentUserId(userId);
        setCurrentUsername(username);
      } catch (err) {
        console.error('Error al sincronizar sesión:', err);
      }

      const hasAccessToAll = 
        fetchedPermissions.includes('manage:all') ||
        fetchedPermissions.includes('activity:manage') ||
        fetchedPermissions.includes('activity:view_all');

      const actRes = await getActivities();
      if (actRes?.activities && Array.isArray(actRes.activities)) {
        let list = actRes.activities;

        if (!hasAccessToAll) {
          list = list.filter((act) => {
            if (userId) return act.creator?.userId === userId;
            return Boolean(
              username &&
                act.creator?.username?.toLowerCase() === username.toLowerCase(),
            );
          });
        }

        setActivities(list);
      }
    } catch {
      showToast('error', 'Error al sincronizar actividades del servidor.');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void Promise.resolve().then(refreshData);
  }, [refreshData]);

  // =========================================================================
  // CREACIÓN Y EDICIÓN (POST / PATCH /api/activities)
  // =========================================================================
  const handleSaveActivity = async (
    data: { 
      title: string; 
      description?: string; 
      startDate: string;
      endDate: string;
      creatorId?: string;
    },
    activityId?: string
  ) => {
    try {
      const validCreatorId = isSuperUser && data.creatorId && data.creatorId.trim().length > 0 
        ? data.creatorId.trim() 
        : undefined;

      if (activityId) {
        // Modo Edición: PATCH /api/activities/:activityId
        const res = await updateActivity(activityId, {
          title: data.title,
          description: data.description || null,
          startDate: data.startDate,
          endDate: data.endDate,
          ...(validCreatorId ? { creatorId: validCreatorId } : {}),
        });

        if (res?.activity) {
          startTransition(() => {
            setActivities((prev) =>
              prev.map((a) => (a.activityId === activityId ? res.activity : a))
            );
          });
          showToast('success', 'Actividad actualizada exitosamente.');
        }
      } else {
        // Modo Creación: POST /api/activities
        if (!canCreate) {
          showToast('error', 'No cuentas con permiso para crear actividades.');
          return;
        }

        const res = await createActivity({
          title: data.title,
          description: data.description || null,
          startDate: data.startDate,
          endDate: data.endDate,
          ...(validCreatorId ? { creatorId: validCreatorId } : {}),
        });

        if (res?.activity) {
          setActivities((prev) => [res.activity, ...prev]);
          showToast('success', 'Actividad registrada exitosamente.');
        }
      }
    } catch {
      showToast('error', 'Error al guardar la actividad o permisos insuficientes.');
    }
  };

  const handleUpdateStatus = async (
    activityId: string, 
    newStatus: 'approved' | 'rejected' | 'cancelled' | 'rescheduled'
  ) => {
    if (!canApprove) {
      showToast('error', 'No cuentas con privilegios de dictamen para autorizar o rechazar.');
      return;
    }

    try {
      await updateActivityApproval(activityId, newStatus);
      
      startTransition(() => {
        setActivities((prev) =>
          prev.map((act) => (act.activityId === activityId ? { ...act, status: newStatus } : act))
        );
      });
      showToast('success', `Actividad actualizada a: ${newStatus}`);
    } catch {
      showToast('error', 'Error al procesar el dictamen o permisos insuficientes.');
    }
  };

  const handleDeleteActivity = async (activity: BackendActivity) => {
    if (!isSuperUser || !window.confirm(`¿Eliminar la actividad "${activity.title || 'Sin título'}"?`)) return;
    try {
      await deleteActivity(activity.activityId);
      setActivities((previous) => previous.filter((item) => item.activityId !== activity.activityId));
      showToast('success', 'Actividad eliminada.');
    } catch {
      showToast('error', 'No se pudo eliminar la actividad o faltan permisos.');
    }
  };

  const filteredActivities = activities.filter((activity) => {
    if (filterStatus === 'TODOS') return true;
    return activity.status?.toUpperCase() === filterStatus.toUpperCase();
  });

  const getStatusBadge = (status: BackendActivityStatus) => {
    switch (status) {
      case 'approved':
        return <span className="px-3 py-1 text-xs rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Aprobado</span>;
      case 'rejected':
        return <span className="px-3 py-1 text-xs rounded-full font-semibold bg-rose-50 text-rose-700 border border-rose-200">No Aprobado</span>;
      case 'rescheduled':
        return <span className="px-3 py-1 text-xs rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200">Reprogramación</span>;
      case 'cancelled':
        return <span className="px-3 py-1 text-xs rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200">Cancelado</span>;
      default:
        return <span className="px-3 py-1 text-xs rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200">Pendiente</span>;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto">
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

        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Encabezado adaptativo basado en el alcance del RBAC */}
          <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Gestión de Actividades</h1>
                {isSuperUser && (
                  <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    <ShieldCheck className="h-3 w-3" />
                    Acceso Total
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500">
                Panel institucional configurado según tu rol activo ({roleScope}).
              </p>
            </div>
            
            {canCreate && (
              <ActivityModal userRole={roleScope} onSave={handleSaveActivity} />
            )}
          </div>

          {/* Filtros de Estado */}
          <div className="flex items-center gap-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Filtrar estado:</span>
            {[
              { key: 'TODOS', label: 'TODOS' },
              { key: 'PENDING', label: 'PENDIENTE' },
              { key: 'APPROVED', label: 'APROBADO' },
              { key: 'REJECTED', label: 'NO_APROBADO' },
              { key: 'RESCHEDULED', label: 'REPROGRAMACION' },
              { key: 'CANCELLED', label: 'CANCELADO' },
            ].map((st) => (
              <Button
                key={st.key}
                size="sm"
                variant={filterStatus === st.key ? 'default' : 'outline'}
                onClick={() => setFilterStatus(st.key)}
                className={`rounded-xl text-xs font-semibold ${
                  filterStatus === st.key 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'text-slate-600 border-slate-200'
                }`}
              >
                {st.label}
              </Button>
            ))}
          </div>

          {/* Tabla de Actividades */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 gap-3 text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <p className="text-sm">Cargando actividades del servidor...</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/70">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">Título</TableHead>
                    <TableHead className="font-bold text-slate-700">Creado por</TableHead>
                    <TableHead className="font-bold text-slate-700">Estatus</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-slate-400 text-sm">
                        No hay actividades registradas para mostrar.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredActivities.map((activity) => {
                      const userCanEditThis = canEditActivity(activity);

                      return (
                        <TableRow key={activity.activityId} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="font-semibold text-slate-900">{activity.title || 'Sin título'}</TableCell>
                          <TableCell className="text-slate-600 text-sm">
                            {activity.creator?.username || activity.creator?.userId || 'Desconocido'}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(activity.status)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end items-center gap-1.5">
                              {/* Botón de Editar dinámico (según permiso update_all o update_own si es autor) */}
                              {userCanEditThis && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingActivity(activity);
                                    setIsEditModalOpen(true);
                                  }}
                                  className="cursor-pointer text-blue-600 border-blue-200 hover:bg-blue-50 h-8 rounded-lg text-xs font-semibold active:scale-95 transition-all flex items-center gap-1"
                                >
                                  <Pencil className="h-3 w-3" />
                                  Editar
                                </Button>
                              )}

                              {isSuperUser && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void handleDeleteActivity(activity)}
                                  className="cursor-pointer text-rose-600 border-rose-200 hover:bg-rose-50 h-8 rounded-lg text-xs font-semibold active:scale-95 transition-all flex items-center gap-1"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Eliminar
                                </Button>
                              )}

                              {/* Botones de dictamen de aprobación si cuenta con permiso canApprove */}
                              {canApprove && (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => handleUpdateStatus(activity.activityId, 'approved')}
                                    className="cursor-pointer text-emerald-600 border-emerald-200 hover:bg-emerald-50 h-8 rounded-lg text-xs font-semibold active:scale-95 transition-all"
                                  >
                                    Aprobar
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => handleUpdateStatus(activity.activityId, 'rejected')}
                                    className="cursor-pointer text-rose-600 border-rose-200 hover:bg-rose-50 h-8 rounded-lg text-xs font-semibold active:scale-95 transition-all"
                                  >
                                    Rechazar
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => handleUpdateStatus(activity.activityId, 'rescheduled')}
                                    className="cursor-pointer text-amber-600 border-amber-200 hover:bg-amber-50 h-8 rounded-lg text-xs font-semibold active:scale-95 transition-all"
                                  >
                                    Reprogramar
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => handleUpdateStatus(activity.activityId, 'cancelled')}
                                    className="cursor-pointer text-slate-600 border-slate-200 hover:bg-slate-100 h-8 rounded-lg text-xs font-semibold active:scale-95 transition-all"
                                  >
                                    Cancelar
                                  </Button>
                                </>
                              )}

                              {/* Si no puede editar ni dictaminar, se ofrece botón informativo */}
                              {!userCanEditThis && !canApprove && (
                                <Button size="sm" variant="ghost" className="text-slate-600 hover:text-slate-900 rounded-lg text-xs font-medium">
                                  Ver detalles
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Modal para Edición */}
          {editingActivity && (
            <ActivityModal
              key={editingActivity.activityId}
              userRole={roleScope}
              initialActivity={editingActivity}
              isOpen={isEditModalOpen}
              onOpenChange={(val) => {
                setIsEditModalOpen(val);
                if (!val) setEditingActivity(null);
              }}
              onSave={handleSaveActivity}
            />
          )}

        </div>
      </main>
    </div>
  );
}
