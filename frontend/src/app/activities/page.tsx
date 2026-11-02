"use client";

import React, {
  useCallback,
  useEffect,
  useState,
  useTransition,
  useMemo,
} from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { ActivityModal } from "@/components/activities/ActivityModal";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BackendActivity,
  BackendActivityStatus,
  ActivityApprovalDecision,
  ActivityApprovalDirection,
  getActivities,
  updateActivity,
  updateActivityApproval,
  attachActivityExternalLocations,
  getActivityExternalLocations,
  removeActivityExternalLocation,
  setActivityPersonnel,
} from "@/lib/api";
import {
  Loader2,
  Check,
  AlertTriangle,
  ShieldCheck,
  Pencil,
  Plus,
} from "lucide-react";

export default function ActivitiesPage() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [currentUsername, setCurrentUsername] = useState<string | undefined>(undefined);
  const [userDepartment, setUserDepartment] = useState<string | undefined>(undefined);

  const [activities, setActivities] = useState<BackendActivity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Pestañas y filtros
  const [activeTab, setActiveTab] = useState<"mine" | "all">("mine");
  const [filterStatus, setFilterStatus] = useState<string>("TODOS");

  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [, startTransition] = useTransition();

  // Estado para edición en modal
  const [editingActivity, setEditingActivity] = useState<BackendActivity | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Dirección elegida manualmente solo por superusuarios
  const [superUserDirections, setSuperUserDirections] = useState<
    Record<string, ActivityApprovalDirection>
  >({});
  const [savingApprovalFor, setSavingApprovalFor] = useState<string | null>(null);
  const [reschedulingActivity, setReschedulingActivity] = useState<string | null>(null);
  const [rescheduleDates, setRescheduleDates] = useState<
    Record<string, { startDate: string; endDate: string }>
  >({});

  const showToast = useCallback((type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Matriz RBAC
  const isSuperUser = useMemo(() => {
    return (
      permissions.includes("manage:all") ||
      permissions.includes("activity:manage")
    );
  }, [permissions]);

  const canApprove = useMemo(() => {
    return isSuperUser || permissions.includes("activity:approve_all");
  }, [isSuperUser, permissions]);

  const canViewAll = useMemo(() => {
    return isSuperUser || permissions.includes("activity:view_all");
  }, [isSuperUser, permissions]);

  const canCreate = useMemo(() => {
    return isSuperUser || permissions.includes("activity:create_own");
  }, [isSuperUser, permissions]);

  const canEditAll = useMemo(() => {
    return isSuperUser || permissions.includes("activity:update_all");
  }, [isSuperUser, permissions]);

  const canEditOwn = useMemo(() => {
    return permissions.includes("activity:update_own");
  }, [permissions]);

  const canShowAllTabs = canViewAll || isSuperUser;

  // Detección institucional de la dirección a partir del departamento del usuario
  const assignedDirection = useMemo<ActivityApprovalDirection | null>(() => {
    if (isSuperUser) return null; // El superusuario conserva la opción de auditar cualquier área
    const dept = (userDepartment || "").toLowerCase();
    if (dept.includes("acad")) return "academic";
    if (dept.includes("admin")) return "administrative";
    if (dept.includes("plan")) return "planning";
    return "planning"; // Valor institucional por defecto si es directivo sin clasificar
  }, [isSuperUser, userDepartment]);

  const canEditActivity = (activity: BackendActivity) => {
    if (canEditAll) return true;
    if (canEditOwn) {
      const isOwner =
        (currentUserId &&
          (activity.creator?.userId === currentUserId ||
            activity.creatorId === currentUserId)) ||
        (currentUsername &&
          activity.creator?.username?.toLowerCase() ===
            currentUsername.toLowerCase());
      return Boolean(isOwner);
    }
    return false;
  };

  const roleScope = useMemo<"superuser" | "directive" | "lead">(() => {
    if (isSuperUser) return "superuser";
    if (canApprove || canViewAll) return "directive";
    return "lead";
  }, [isSuperUser, canApprove, canViewAll]);

  // Carga de datos
  const refreshData = useCallback(async () => {
    try {
      setLoading(true);

      let fetchedPermissions: string[] = [];
      let userId: string | undefined = undefined;
      let username: string | undefined = undefined;
      let departmentName: string | undefined = undefined;

      try {
        const { getSession } = await import("next-auth/react");
        const session = await getSession();

        fetchedPermissions = session?.user?.permissions || [];
        userId = session?.user?.id;
        username = session?.user?.name || undefined;
        departmentName = (session?.user as any)?.department || (session?.user as any)?.departmentName;

        setPermissions(fetchedPermissions);
        setCurrentUserId(userId);
        setCurrentUsername(username);
        setUserDepartment(departmentName);
      } catch (err) {
        console.error("Error al sincronizar sesión:", err);
      }

      const hasAccessToAll =
        fetchedPermissions.includes("manage:all") ||
        fetchedPermissions.includes("activity:manage") ||
        fetchedPermissions.includes("activity:view_all");

      setActiveTab(hasAccessToAll ? "all" : "mine");

      const actRes = await getActivities();
      if (actRes?.activities && Array.isArray(actRes.activities)) {
        let list = actRes.activities;

        if (!hasAccessToAll) {
          list = list.filter((act) => {
            const matchesId =
              userId &&
              (act.creator?.userId === userId || act.creatorId === userId);
            const matchesName =
              username &&
              act.creator?.username?.toLowerCase() === username.toLowerCase();
            return Boolean(matchesId || matchesName);
          });
        }

        setActivities(list);
      }
    } catch {
      showToast("error", "Error al sincronizar actividades del servidor.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void refreshData(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [refreshData]);

  const handleSaveActivity = async (
    data: {
      title: string;
      description?: string;
      startDate: string;
      endDate: string;
      creatorId?: string;
      externalLocations: import("@/lib/api").ExternalLocationInput[];
      spaceIds: string[];
      reserveStartTime?: string;
      reserveEndTime?: string;
      personnelIds: string[];
    },
    activityId?: string,
  ) => {
    try {
      const validCreatorId =
        isSuperUser && data.creatorId && data.creatorId.trim().length > 0
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
          const existingLocations = await getActivityExternalLocations(activityId).catch(() => ({ locations: [] }));
          const selectedPlaceIds = new Set(data.externalLocations.map((l) => l.googlePlaceId));
          
          await Promise.all(
            existingLocations.locations
              .filter((l) => !selectedPlaceIds.has(l.googlePlaceId))
              .map((l) => removeActivityExternalLocation(activityId, l.locationId))
          );
          
          const knownPlaceIds = new Set(existingLocations.locations.map((l) => l.googlePlaceId));
          const newLocations = data.externalLocations.filter((l) => !knownPlaceIds.has(l.googlePlaceId));
          
          if (newLocations.length) await attachActivityExternalLocations(activityId, newLocations);
          if (isSuperUser) await setActivityPersonnel(activityId, data.personnelIds);
          
          startTransition(() => {
            setActivities((prev) =>
              prev.map((a) => (a.activityId === activityId ? res.activity : a))
            );
          });
          showToast("success", "Actividad actualizada exitosamente.");
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al actualizar la actividad.";
      showToast("error", message);
    }
  };

  const handleUpdateStatus = async (
    activityId: string,
    direction: ActivityApprovalDirection,
    newStatus: ActivityApprovalDecision,
    dates?: { startDate: string; endDate: string },
  ) => {
    if (!canApprove) {
      showToast("error", "No cuentas con privilegios de dictamen para autorizar o rechazar.");
      return;
    }

    try {
      setSavingApprovalFor(activityId);
      const { activity: updatedActivity } = await updateActivityApproval(
        activityId,
        direction,
        newStatus,
        dates,
      );
      startTransition(() => {
        setActivities((prev) =>
          prev.map((act) =>
            act.activityId === activityId ? updatedActivity : act,
          ),
        );
      });
      setReschedulingActivity(null);
      showToast(
        "success",
        `Dictamen de ${
          direction === "planning"
            ? "Planeación"
            : direction === "academic"
            ? "Académica"
            : "Administración"
        } registrado.`,
      );
    } catch (error) {
      await refreshData();
      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "No se pudo guardar el dictamen institucional.",
      );
    } finally {
      setSavingApprovalFor(null);
    }
  };

  const filteredActivities = activities.filter((activity) => {
    if (canShowAllTabs && activeTab === "mine") {
      const matchesUserId =
        currentUserId &&
        (activity.creator?.userId === currentUserId ||
          activity.creatorId === currentUserId);

      const matchesUsername =
        currentUsername &&
        activity.creator?.username?.trim().toLowerCase() ===
          currentUsername.trim().toLowerCase();

      if (!Boolean(matchesUserId || matchesUsername)) return false;
    }

    if (filterStatus === "TODOS") return true;
    return activity.status?.toUpperCase() === filterStatus.toUpperCase();
  });

  const getStatusBadge = (status: BackendActivityStatus) => {
    const base = "inline-block whitespace-nowrap px-3 py-1 text-xs rounded-full font-semibold border";
    switch (status) {
      case "approved":
        return <span className={`${base} bg-uno-verde text-uno-negro border-uno-olivo`}>Aprobado</span>;
      case "rejected":
        return <span className={`${base} bg-uno-terracota/15 text-uno-marron border-uno-terracota/60`}>No Aprobado</span>;
      case "rescheduled":
        return <span className={`${base} bg-uno-oro/30 text-uno-negro border-uno-oro`}>Reprogramación</span>;
      case "cancelled":
        return <span className={`${base} bg-uno-beige/50 text-uno-negro border-uno-beige`}>Cancelado</span>;
      default:
        return <span className={`${base} bg-uno-mostaza/30 text-uno-negro border-uno-mostaza`}>Pendiente</span>;
    }
  };

  const actionBtn = "cursor-pointer h-9 md:h-8 rounded-lg text-xs font-semibold active:scale-95 transition-all";

  const renderActions = (activity: BackendActivity) => {
    const userCanEditThis = canEditActivity(activity);
    
    // Si es superusuario usa su selección local; si es directivo usa su departamento asignado
    const activeDirection: ActivityApprovalDirection = isSuperUser
      ? (superUserDirections[activity.activityId] ?? "planning")
      : (assignedDirection ?? "planning");

    const newDates = rescheduleDates[activity.activityId] ?? {
      startDate: activity.startDate?.slice(0, 10) ?? "",
      endDate: activity.endDate?.slice(0, 10) ?? "",
    };

    const approvalLabel = (status: BackendActivity["approvals"]["planning"]) =>
      ({
        pending: "Pendiente",
        approved: "Aprobado",
        rejected: "No aprobado",
        cancelled: "Cancelado",
        rescheduled: "Reprogramación",
      }[status]);

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
          <div className="basis-full space-y-2 rounded-xl border border-border bg-secondary/30 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground">
                Dictamen Colegiado
              </p>
              {!isSuperUser && (
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Área: {activeDirection === "planning" ? "Planeación" : activeDirection === "academic" ? "Académica" : "Administración"}
                </span>
              )}
            </div>

            {/* Chips de estado por dirección */}
            <div className="flex flex-wrap gap-2 text-[11px]">
              {(
                [
                  ["planning", "Planeación"],
                  ["academic", "Académica"],
                  ["administrative", "Administración"],
                ] as const
              ).map(([key, label]) => (
                <span
                  key={key}
                  className="rounded-full border border-border bg-background px-2.5 py-1 font-medium"
                >
                  {label}:{" "}
                  <strong className="text-foreground">
                    {approvalLabel(activity.approvals?.[key] ?? "pending")}
                  </strong>
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {/* SELECTOR MANUAL: Exclusivo para Superusuarios */}
              {isSuperUser && (
                <>
                  <label className="sr-only" htmlFor={`approval-${activity.activityId}`}>
                    Dirección que emite el dictamen
                  </label>
                  <select
                    id={`approval-${activity.activityId}`}
                    value={activeDirection}
                    onChange={(event) =>
                      setSuperUserDirections((current) => ({
                        ...current,
                        [activity.activityId]: event.target.value as ActivityApprovalDirection,
                      }))
                    }
                    disabled={savingApprovalFor === activity.activityId}
                    className="h-8 rounded-lg border border-input bg-background px-2 text-xs font-medium"
                  >
                    <option value="planning">Dir. Planeación</option>
                    <option value="academic">Dir. Académica</option>
                    <option value="administrative">Dir. Administración</option>
                  </select>
                </>
              )}

              {/* Botones de acción institucional */}
              {(
                [
                  ["approved", "Aprobar"],
                  ["rejected", "No aprobar"],
                  ["cancelled", "Cancelar"],
                ] as const
              ).map(([status, label]) => (
                <Button
                  key={status}
                  size="sm"
                  variant="outline"
                  disabled={
                    savingApprovalFor === activity.activityId ||
                    activity.approvals?.[activeDirection] === status
                  }
                  onClick={() =>
                    void handleUpdateStatus(
                      activity.activityId,
                      activeDirection,
                      status as ActivityApprovalDecision,
                    )
                  }
                  className={`${actionBtn} ${
                    status === "approved"
                      ? "text-uno-olivo border-uno-olivo/50 hover:bg-uno-verde"
                      : status === "rejected"
                      ? "text-uno-terracota border-uno-terracota/50 hover:bg-uno-terracota/10"
                      : "text-muted-foreground border-border hover:bg-secondary"
                  }`}
                >
                  {savingApprovalFor === activity.activityId ? "Guardando…" : label}
                </Button>
              ))}

              <Button
                size="sm"
                variant="outline"
                disabled={savingApprovalFor === activity.activityId}
                onClick={() =>
                  setReschedulingActivity((current) =>
                    current === activity.activityId ? null : activity.activityId,
                  )
                }
                className={`${actionBtn} text-uno-marron border-uno-oro hover:bg-uno-oro/20`}
              >
                Reprogramar
              </Button>
            </div>

            {/* Panel para reprogramación */}
            {reschedulingActivity === activity.activityId && (
              <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
                <label className="space-y-1 text-xs font-medium">
                  Nueva fecha de inicio
                  <input
                    type="date"
                    value={newDates.startDate}
                    onChange={(event) =>
                      setRescheduleDates((current) => ({
                        ...current,
                        [activity.activityId]: {
                          ...newDates,
                          startDate: event.target.value,
                        },
                      }))
                    }
                    className="block h-8 rounded-lg border border-input bg-background px-2 text-xs"
                    required
                  />
                </label>
                <label className="space-y-1 text-xs font-medium">
                  Nueva fecha de término
                  <input
                    type="date"
                    min={newDates.startDate}
                    value={newDates.endDate}
                    onChange={(event) =>
                      setRescheduleDates((current) => ({
                        ...current,
                        [activity.activityId]: {
                          ...newDates,
                          endDate: event.target.value,
                        },
                      }))
                    }
                    className="block h-8 rounded-lg border border-input bg-background px-2 text-xs"
                    required
                  />
                </label>
                <Button
                  size="sm"
                  disabled={
                    savingApprovalFor === activity.activityId ||
                    !newDates.startDate ||
                    !newDates.endDate ||
                    newDates.endDate < newDates.startDate
                  }
                  onClick={() =>
                    void handleUpdateStatus(
                      activity.activityId,
                      activeDirection,
                      "rescheduled",
                      newDates,
                    )
                  }
                  className={actionBtn}
                >
                  Confirmar reprogramación
                </Button>
              </div>
            )}
          </div>
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
                toastMessage.type === "success"
                  ? "bg-uno-olivo border-uno-olivo"
                  : "bg-uno-terracota border-uno-terracota"
              }`}
            >
              {toastMessage.type === "success" ? (
                <Check className="h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              )}
              {toastMessage.text}
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
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
              <Link href="/activities/new">
                <Button className="cursor-pointer min-h-[44px] w-full sm:w-auto bg-[#5b141b] hover:bg-[#481015] text-white font-medium shadow-sm active:scale-95 transition-all rounded-xl px-5 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  + Nueva Actividad
                </Button>
              </Link>
            )}
          </div>

          {canShowAllTabs && (
            <div className="flex items-center gap-2 bg-card p-2 rounded-2xl border border-border shadow-sm">
              <Button
                size="sm"
                variant={activeTab === "mine" ? "default" : "outline"}
                onClick={() => setActiveTab("mine")}
                className={`rounded-xl text-xs font-semibold ${
                  activeTab === "mine"
                    ? "bg-primary hover:bg-uno-ciruela text-primary-foreground"
                    : "text-foreground border-border hover:bg-secondary"
                }`}
              >
                Mis Actividades
              </Button>
              <Button
                size="sm"
                variant={activeTab === "all" ? "default" : "outline"}
                onClick={() => setActiveTab("all")}
                className={`flex items-center gap-1.5 rounded-xl text-xs font-semibold ${
                  activeTab === "all"
                    ? "bg-primary hover:bg-uno-ciruela text-primary-foreground"
                    : "text-foreground border-border hover:bg-secondary"
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Todas las Actividades (Administración)
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2 bg-card p-3 md:p-4 rounded-2xl border border-border shadow-sm overflow-x-auto">
            <span className="shrink-0 text-xs font-bold text-muted-foreground uppercase tracking-wider mr-2">
              Filtrar estado:
            </span>
            {[
              { key: "TODOS", label: "TODOS" },
              { key: "PENDING", label: "PENDIENTE" },
              { key: "APPROVED", label: "APROBADO" },
              { key: "REJECTED", label: "NO_APROBADO" },
              { key: "RESCHEDULED", label: "REPROGRAMACION" },
              { key: "CANCELLED", label: "CANCELADO" },
            ].map((st) => (
              <Button
                key={st.key}
                size="sm"
                variant={filterStatus === st.key ? "default" : "outline"}
                onClick={() => setFilterStatus(st.key)}
                className={`shrink-0 whitespace-nowrap min-h-[36px] rounded-xl text-xs font-semibold ${
                  filterStatus === st.key
                    ? "bg-primary hover:bg-uno-ciruela text-primary-foreground"
                    : "text-foreground border-border hover:bg-secondary"
                }`}
              >
                {st.label}
              </Button>
            ))}
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm">Cargando actividades del servidor...</p>
              </div>
            ) : (
              <>
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
                              {activity.title || "Sin título"}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {activity.creator?.username || activity.creator?.userId || "Desconocido"}
                            </TableCell>
                            <TableCell>{getStatusBadge(activity.status)}</TableCell>
                            <TableCell className="text-right">{renderActions(activity)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

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
                            {activity.title || "Sin título"}
                          </h3>
                          <div className="shrink-0">{getStatusBadge(activity.status)}</div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Creado por:{" "}
                          <span className="text-foreground">
                            {activity.creator?.username || activity.creator?.userId || "Desconocido"}
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

          {editingActivity && (
            <ActivityModal
              userRole={roleScope}
              canReserve={
                isSuperUser ||
                permissions.some((p) => p.startsWith("reservation:"))
              }
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