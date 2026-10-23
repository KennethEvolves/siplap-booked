'use client';

import React, { useEffect, useState, useTransition, useMemo } from 'react';
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
  updateActivity,
  updateActivityApproval
} from '@/lib/api';
import { Loader2, Check, AlertTriangle, ShieldCheck, Pencil } from 'lucide-react';

export default function ActivitiesPage() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [currentUsername, setCurrentUsername] = useState<string | undefined>(undefined);

  const [activities, setActivities] = useState<BackendActivity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Pestañas y filtros
  const [activeTab, setActiveTab] = useState<'mine' | 'all'>('mine');
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [, startTransition] = useTransition();

  // Estado para edición en modal
  const [editingActivity, setEditingActivity] = useState<BackendActivity | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

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

  // Si puede ver todo, se habilitan las pestañas para alternar
  const canShowAllTabs = canViewAll || isSuperUser;

  // Comprobar si el usuario puede editar una actividad específica
  const canEditActivity = (activity: BackendActivity) => {
    if (canEditAll) return true;
    if (canEditOwn) {
      const isOwner = 
        (currentUserId && (activity.creator?.userId === currentUserId || (activity as any).creatorId === currentUserId)) ||
        (currentUsername && activity.creator?.username?.toLowerCase() === currentUsername.toLowerCase());
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
  const refreshData = async () => {
    try {
      setLoading(true);

      let fetchedPermissions: string[] = [];
      let userId: string | undefined = undefined;
      let username: string | undefined = undefined;

      try {
        const { getSession } = await import('next-auth/react');
        const session = await getSession();

        fetchedPermissions = (session?.user?.permissions as string[]) || [];
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

        // Si el rol operativo no tiene permiso de ver todo, filtramos localmente
        if (!hasAccessToAll) {
          list = list.filter((act) => {
            const matchesId = userId && (act.creator?.userId === userId || (act as any).creatorId === userId);
            const matchesName = username && act.creator?.username?.toLowerCase() === username.toLowerCase();
            return Boolean(matchesId || matchesName);
          });
        }

        setActivities(list);
      }
    } catch {
      showToast('error', 'Error al sincronizar actividades del servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // =========================================================================
  // CREACIÓN Y EDICIÓN
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

  // =========================================================================
  // FILTRADO DINÁMICO CORREGIDO
  // =========================================================================
  const filteredActivities = activities.filter((activity) => {
    // En la pestaña "Mis Actividades", comparamos de forma estricta la autoría del registro
    if (canShowAllTabs && activeTab === 'mine') {
      const matchesUserId =
        currentUserId &&
        (activity.creator?.userId === currentUserId ||
          (activity as any).creatorId === currentUserId);

      const matchesUsername =
        currentUsername &&
        activity.creator?.username?.trim().toLowerCase() ===
          currentUsername.trim().toLowerCase();

      const isActuallyMine = Boolean(matchesUserId || matchesUsername);

      if (!isActuallyMine) return false;
    }

    if (filterStatus === 'TODOS') return true;
    return activity.status?.toUpperCase() === filterStatus.toUpperCase();
  });

  const getStatusBadge = (status: BackendActivityStatus) => {
    const base =
      'inline-block whitespace-nowrap px-3 py-1 text-xs rounded-full font-semibold border';
    switch (status) {
      case 'approved':
        return <span className={`${base} bg-uno-verde text-uno-negro border-uno-olivo`}>Aprobado</span>;
      case 'rejected':
        return <span className={`${base} bg-uno-terracota/15 text-uno-marron border-uno-terracota/60`}>No Aprobado</span>;
      case 'rescheduled':
        return <span className={`${base} bg-uno-oro/30 text-uno-negro border-uno-oro`}>Reprogramación</span>;
      case 'cancelled':
        return <span className={`${base} bg-uno-beige/50 text-uno-negro border-uno-beige`}>Cancelado</span>;
      default:
        return <span className={`${base} bg-uno-mostaza/30 text-uno-negro border-uno-mostaza`}>Pendiente</span>;
    }
  };

  const actionBtn =
    'cursor-pointer h-9 md:h-8 rounded-lg text-xs font-semibold active:scale-95 transition-all';

  const renderActions = (activity: BackendActivity) => {
    const userCanEditThis = canEditActivity(activity);

    return (
      <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
        {userCanEditThis && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingActivity(activity);
              setIsEditModalOpen(true);
            }}
            className={`${actionBtn} text-primary border-primary/40 hover:bg-secondary flex items-center gap-1`}
          >
            <Pencil className="h-3 w-3" />
            Editar
          </Button>
        )}

        {canApprove && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleUpdateStatus(activity.activityId, 'approved')}
              className={`${actionBtn} text-uno-olivo border-uno-olivo/50 hover:bg-uno-verde`}
            >
              Aprobar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleUpdateStatus(activity.activityId, 'rejected')}
              className={`${actionBtn} text-uno-terracota border-uno-terracota/50 hover:bg-uno-terracota/10`}
            >
              Rechazar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleUpdateStatus(activity.activityId, 'rescheduled')}
              className={`${actionBtn} text-uno-marron border-uno-oro hover:bg-uno-oro/20`}
            >
              Reprogramar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleUpdateStatus(activity.activityId, 'cancelled')}
              className={`${actionBtn} text-muted-foreground border-border hover:bg-secondary`}
            >
              Cancelar
            </Button>
          </>
        )}

        {!userCanEditThis && !canApprove && (
          <Button
            size="sm"
            variant="ghost"
            className="h-9 md:h-8 text-muted-foreground hover:text-foreground rounded-lg text-xs font-medium"
          >
            Ver detalles
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-secondary/40">
      <Sidebar />

      <main className="flex-1 min-w-0 p-4 pt-16 md:p-6 md:pt-16 lg:p-8 lg:pt-8 overflow-y-auto">
        {toastMessage && (
          <div className="fixed top-3 right-3 left-16 sm:left-auto sm:top-6 sm:right-6 z-[60] animate-in fade-in slide-in-from-top-4 duration-200">
            <div
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium text-white ${
                toastMessage.type === 'success'
                  ? 'bg-uno-olivo border-uno-olivo'
                  : 'bg-uno-terracota border-uno-terracota'
              }`}
            >
              {toastMessage.type === 'success' ? (
                <Check className="h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              )}
              {toastMessage.text}
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">

          {/* Encabezado */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 md:p-6 rounded-2xl border border-border shadow-sm">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                  Gestión de Actividades
                </h1>
                {isSuperUser && (
                  <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-uno-negro bg-uno-mostaza/30 px-2 py-0.5 rounded-md border border-uno-mostaza">
                    <ShieldCheck className="h-3 w-3" />
                    Acceso Total
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Panel institucional configurado según tu rol activo ({roleScope}).
              </p>
            </div>

            {canCreate && (
              <ActivityModal userRole={roleScope} onSave={handleSaveActivity} />
            )}
          </div>

          {/* Pestañas: Mis Actividades vs Todas las Actividades */}
          {canShowAllTabs && (
            <div className="flex items-center gap-2 bg-card p-2 rounded-2xl border border-border shadow-sm">
              <Button
                size="sm"
                variant={activeTab === 'mine' ? 'default' : 'outline'}
                onClick={() => setActiveTab('mine')}
                className={`rounded-xl text-xs font-semibold ${
                  activeTab === 'mine'
                    ? 'bg-primary hover:bg-uno-ciruela text-primary-foreground'
                    : 'text-foreground border-border hover:bg-secondary'
                }`}
              >
                Mis Actividades
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'all' ? 'default' : 'outline'}
                onClick={() => setActiveTab('all')}
                className={`flex items-center gap-1.5 rounded-xl text-xs font-semibold ${
                  activeTab === 'all'
                    ? 'bg-primary hover:bg-uno-ciruela text-primary-foreground'
                    : 'text-foreground border-border hover:bg-secondary'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Todas las Actividades (Administración)
              </Button>
            </div>
          )}

          {/* Filtros de estado */}
          <div className="flex items-center gap-2 bg-card p-3 md:p-4 rounded-2xl border border-border shadow-sm overflow-x-auto">
            <span className="shrink-0 text-xs font-bold text-muted-foreground uppercase tracking-wider mr-2">
              Filtrar estado:
            </span>
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
                className={`shrink-0 whitespace-nowrap min-h-[36px] rounded-xl text-xs font-semibold ${
                  filterStatus === st.key
                    ? 'bg-primary hover:bg-uno-ciruela text-primary-foreground'
                    : 'text-foreground border-border hover:bg-secondary'
                }`}
              >
                {st.label}
              </Button>
            ))}
          </div>

          {/* Tabla de Actividades */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm">Cargando actividades del servidor...</p>
              </div>
            ) : (
              <>
                {/* Escritorio y tablet horizontal */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader className="bg-secondary/70">
                      <TableRow>
                        <TableHead className="font-bold text-foreground">Título</TableHead>
                        <TableHead className="font-bold text-foreground">Creado por</TableHead>
                        <TableHead className="font-bold text-foreground">Estatus</TableHead>
                        <TableHead className="text-right font-bold text-foreground">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredActivities.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                            No hay actividades registradas para mostrar.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredActivities.map((activity) => (
                          <TableRow
                            key={activity.activityId}
                            className="hover:bg-secondary/50 transition-colors"
                          >
                            <TableCell className="font-semibold text-foreground">
                              {activity.title || 'Sin título'}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {activity.creator?.username || activity.creator?.userId || 'Desconocido'}
                            </TableCell>
                            <TableCell>{getStatusBadge(activity.status)}</TableCell>
                            <TableCell className="text-right">{renderActions(activity)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Móvil */}
                <div className="md:hidden divide-y divide-border">
                  {filteredActivities.length === 0 ? (
                    <p className="text-center py-8 px-4 text-muted-foreground text-sm">
                      No hay actividades registradas para mostrar.
                    </p>
                  ) : (
                    filteredActivities.map((activity) => (
                      <div key={activity.activityId} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="min-w-0 font-semibold text-foreground break-words">
                            {activity.title || 'Sin título'}
                          </h3>
                          <div className="shrink-0">{getStatusBadge(activity.status)}</div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Creado por:{' '}
                          <span className="text-foreground">
                            {activity.creator?.username || activity.creator?.userId || 'Desconocido'}
                          </span>
                        </p>
                        {renderActions(activity)}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Modal para edición */}
          {editingActivity && (
            <ActivityModal
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