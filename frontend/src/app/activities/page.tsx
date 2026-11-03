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
  ActivityPersonnelMember,
  ExternalLocation,
  getActivities,
  updateActivityApproval,
  getActivityPersonnel,
  getActivityExternalLocations,
  apiFetch,
} from "@/lib/api";
import {
  Loader2,
  Check,
  AlertTriangle,
  ShieldCheck,
  Plus,
  Building2,
  Eye,
  X,
  Calendar,
  Users,
  MapPin,
  FileText,
  Clock,
} from "lucide-react";

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
  approvalOptions: ActivityApprovalDirection[];
}

export default function ActivitiesPage() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [currentUsername, setCurrentUsername] = useState<string | undefined>(undefined);
  const [backendCapabilities, setBackendCapabilities] = useState<UserCapabilities | null>(null);

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

  // Estados para Modal de Detalles
  const [selectedDetailActivity, setSelectedDetailActivity] = useState<BackendActivity | null>(null);
  const [detailPersonnel, setDetailPersonnel] = useState<ActivityPersonnelMember[]>([]);
  const [detailLocations, setDetailLocations] = useState<ExternalLocation[]>([]);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  // Dirección manual elegida exclusivamente por Superusuario
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

  const isSuperUser = useMemo(() => {
    return (
      permissions.includes("manage:all") ||
      permissions.includes("activity:manage")
    );
  }, [permissions]);

  const assignedDirection = useMemo<ActivityApprovalDirection | null>(() => {
    if (isSuperUser) return null;
    const opts = backendCapabilities?.approvalOptions || [];
    return opts.length > 0 ? opts[0] : null;
  }, [isSuperUser, backendCapabilities]);

  const canApprove = useMemo(() => {
    if (isSuperUser) return true;
    return Boolean(
      backendCapabilities?.canApprove &&
      backendCapabilities.approvalOptions &&
      backendCapabilities.approvalOptions.length > 0
    );
  }, [isSuperUser, backendCapabilities]);

  const canViewAll = useMemo(() => {
    return (
      isSuperUser ||
      Boolean(backendCapabilities?.canViewAll) ||
      permissions.includes("activity:view_all")
    );
  }, [isSuperUser, backendCapabilities, permissions]);

  const canCreate = useMemo(() => {
    return (
      isSuperUser ||
      Boolean(backendCapabilities?.canCreate) ||
      permissions.includes("activity:create_own")
    );
  }, [isSuperUser, backendCapabilities, permissions]);

  const canShowAllTabs = canViewAll || isSuperUser;

  const roleScope = useMemo<"superuser" | "directive" | "lead">(() => {
    if (isSuperUser) return "superuser";
    if (canApprove || canViewAll) return "directive";
    return "lead";
  }, [isSuperUser, canApprove, canViewAll]);

  const formatDirectionName = (dir: ActivityApprovalDirection | null) => {
    switch (dir) {
      case "planning":
        return "Planeación";
      case "academic":
        return "Académica";
      case "administrative":
        return "Administración";
      default:
        return "";
    }
  };

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);

      let fetchedPermissions: string[] = [];
      let userId: string | undefined = undefined;
      let username: string | undefined = undefined;

      try {
        const { getSession } = await import("next-auth/react");
        const session = await getSession();

        fetchedPermissions = session?.user?.permissions || [];
        userId = session?.user?.id;
        username = session?.user?.name || undefined;

        setPermissions(fetchedPermissions);
        setCurrentUserId(userId);
        setCurrentUsername(username);
      } catch (err) {
        console.error("Error al sincronizar sesión:", err);
      }

      let caps: UserCapabilities | null = null;
      try {
        caps = await apiFetch<UserCapabilities>("/activities/capabilities");
        setBackendCapabilities(caps);
      } catch (err) {
        console.error("Error al consultar capabilities:", err);
      }

      const hasAccessToAll =
        fetchedPermissions.includes("manage:all") ||
        fetchedPermissions.includes("activity:manage") ||
        fetchedPermissions.includes("activity:view_all") ||
        Boolean(caps?.canViewAll || caps?.canApprove);

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

  // Manejo de apertura del modal de detalles
  const handleOpenDetails = async (activity: BackendActivity) => {
    setSelectedDetailActivity(activity);
    setLoadingDetails(true);
    try {
      const [personnelRes, locationsRes] = await Promise.allSettled([
        getActivityPersonnel(activity.activityId),
        getActivityExternalLocations(activity.activityId),
      ]);

      if (personnelRes.status === "fulfilled" && personnelRes.value?.users) {
        setDetailPersonnel(personnelRes.value.users);
      } else {
        setDetailPersonnel([]);
      }

      if (locationsRes.status === "fulfilled" && locationsRes.value?.locations) {
        setDetailLocations(locationsRes.value.locations);
      } else {
        setDetailLocations([]);
      }
    } catch {
      setDetailPersonnel([]);
      setDetailLocations([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleUpdateStatus = async (
    activityId: string,
    direction: ActivityApprovalDirection | null,
    newStatus: ActivityApprovalDecision,
    dates?: { startDate: string; endDate: string },
  ) => {
    if (!canApprove) {
      showToast("error", "No cuentas con privilegios de dictamen para autorizar o rechazar.");
      return;
    }

    if (!direction || !["planning", "academic", "administrative"].includes(direction)) {
      showToast("error", "No se identificó una dirección válida para emitir este dictamen.");
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
        `Dictamen de ${formatDirectionName(direction)} registrado.`,
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
    const activeDirection: ActivityApprovalDirection | null = isSuperUser
      ? (superUserDirections[activity.activityId] ?? "planning")
      : assignedDirection;

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
      <div className="flex flex-col gap-2 items-end">
        {/* BOTÓN GENERAL DE DETALLES: Accesible para todos los usuarios */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => void handleOpenDetails(activity)}
          className="h-8 px-3 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border-slate-300 flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Eye className="h-3.5 w-3.5 text-blue-600" />
          Ver detalles del evento
        </Button>

        {canApprove && (
          <div className="w-full space-y-2 rounded-xl border border-border bg-secondary/30 p-3 text-left">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground">
                Dictamen Colegiado
              </p>
              {!isSuperUser && activeDirection && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-0.5 rounded-md border border-blue-200 dark:border-blue-800 uppercase">
                  <Building2 className="h-3 w-3" />
                  Área: {formatDirectionName(activeDirection)}
                </span>
              )}
            </div>

            {/* Sellos de estado por cada una de las 3 direcciones */}
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
              {isSuperUser && (
                <>
                  <label className="sr-only" htmlFor={`approval-${activity.activityId}`}>
                    Dirección que emite el dictamen
                  </label>
                  <select
                    id={`approval-${activity.activityId}`}
                    value={activeDirection ?? "planning"}
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
                    !activeDirection ||
                    activity.approvals?.[activeDirection] === status
                  }
                  onClick={() => {
                    if (activeDirection) {
                      void handleUpdateStatus(
                        activity.activityId,
                        activeDirection,
                        status as ActivityApprovalDecision,
                      );
                    }
                  }}
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
                disabled={savingApprovalFor === activity.activityId || !activeDirection}
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
                    !activeDirection ||
                    !newDates.startDate ||
                    !newDates.endDate ||
                    newDates.endDate < newDates.startDate
                  }
                  onClick={() => {
                    if (activeDirection) {
                      void handleUpdateStatus(
                        activity.activityId,
                        activeDirection,
                        "rescheduled",
                        newDates,
                      );
                    }
                  }}
                  className={actionBtn}
                >
                  Confirmar reprogramación
                </Button>
              </div>
            )}
          </div>
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

          {/* MODAL INSTITUCIONAL PARA VER DETALLES DE LA ACTIVIDAD */}
          {selectedDetailActivity && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="bg-card w-full max-w-2xl max-h-[90vh] rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-border bg-secondary/20">
                  <div className="flex items-center gap-2.5">
                    <Building2 className="h-5 w-5 text-primary" />
                    <div>
                      <h2 className="text-base font-extrabold text-foreground">
                        Expediente de la Actividad
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Revisión de alcances y recursos institucionales
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDetailActivity(null)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-5">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Nombre de la actividad
                    </span>
                    <h3 className="text-lg font-bold text-foreground mt-0.5">
                      {selectedDetailActivity.title || "Sin título asignado"}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-secondary/30 border border-border">
                    <div className="flex items-center gap-2.5">
                      <Calendar className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground">Periodo programado</p>
                        <p className="text-xs font-bold text-foreground">
                          {selectedDetailActivity.startDate || "N/A"} al {selectedDetailActivity.endDate || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Users className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground">Titular / Creador</p>
                        <p className="text-xs font-bold text-foreground">
                          {selectedDetailActivity.creator?.username || "Usuario no especificado"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedDetailActivity.description && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        Descripción Detallada
                      </span>
                      <p className="text-xs text-foreground bg-secondary/20 p-3 rounded-xl border border-border leading-relaxed">
                        {selectedDetailActivity.description}
                      </p>
                    </div>
                  )}

                  {/* Colaboradores asignados */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      Personal y Colaboradores Asignados
                    </span>
                    {loadingDetails ? (
                      <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        Cargando colaboradores...
                      </div>
                    ) : detailPersonnel.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic bg-secondary/10 p-3 rounded-xl border border-border">
                        No se asignaron colaboradores específicos para esta actividad.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {detailPersonnel.map((u) => (
                          <div
                            key={u.userId}
                            className="p-2.5 rounded-xl border border-border bg-background flex items-center gap-2 text-xs"
                          >
                            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                              {u.username?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">{u.username}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Ubicaciones externas */}
                  {detailLocations.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                        Ubicaciones Externas
                      </span>
                      <div className="space-y-2">
                        {detailLocations.map((loc) => (
                          <div
                            key={loc.locationId}
                            className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/30 text-xs flex items-center justify-between"
                          >
                            <div>
                              <p className="font-bold text-emerald-950">{loc.name}</p>
                              <p className="text-emerald-800/80">{loc.formattedAddress}</p>
                            </div>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-md transition-colors"
                            >
                              Ver en Maps
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Estado del Dictamen Colegiado */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Estatus del Dictamen Colegiado
                    </span>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2.5 rounded-xl border border-border bg-background">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Planeación</p>
                        <p className="font-bold text-foreground mt-1 capitalize">
                          {selectedDetailActivity.approvals?.planning ?? "Pendiente"}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl border border-border bg-background">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Académica</p>
                        <p className="font-bold text-foreground mt-1 capitalize">
                          {selectedDetailActivity.approvals?.academic ?? "Pendiente"}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl border border-border bg-background">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Administración</p>
                        <p className="font-bold text-foreground mt-1 capitalize">
                          {selectedDetailActivity.approvals?.administrative ?? "Pendiente"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-border bg-secondary/10 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => setSelectedDetailActivity(null)}
                    className="px-5 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cerrar Expediente
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}