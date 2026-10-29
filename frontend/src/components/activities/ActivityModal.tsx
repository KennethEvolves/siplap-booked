'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import {
  ActivityPersonnelMember,
  apiFetch,
  BackendActivity,
  ExternalLocationInput,
  getActivityExternalLocations,
  getActivityPersonnel,
  getReservationSpaces,
  ReservationSpaceOption,
} from '@/lib/api';
import { ExternalLocationPicker } from './ExternalLocationPicker';
import { Loader2 } from 'lucide-react';

interface ActivityModalProps {
  userRole: 'superuser' | 'directive' | 'lead';
  canReserve?: boolean;
  initialActivity?: BackendActivity | null;
  triggerButton?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSave: (activityData: {
    title: string;
    description?: string;
    startDate: string;
    endDate: string;
    creatorId?: string;
    externalLocations: ExternalLocationInput[];
    spaceIds: string[];
    reserveStartTime?: string;
    reserveEndTime?: string;
    personnelIds: string[];
  }, activityId?: string) => Promise<void> | void;
}

interface UserOption {
  userId: string;
  username: string;
  email: string;
}

interface UserDirectoryEntry {
  userId?: string;
  id?: string;
  username: string | null;
  email: string | null;
}

// text-base en móvil evita que iOS haga zoom al enfocar un campo
const fieldClass =
  'w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-base sm:text-sm text-foreground ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all';

const labelClass =
  'block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5';

export function ActivityModal({
  userRole,
  initialActivity,
  triggerButton,
  isOpen: externalOpen,
  onOpenChange: externalOnOpenChange,
  onSave,
  canReserve = false,
}: ActivityModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  const isEditing = Boolean(initialActivity);
  const today = new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [creatorId, setCreatorId] = useState('');
  const [usersList, setUsersList] = useState<UserOption[]>([]);
  const [externalLocations, setExternalLocations] = useState<ExternalLocationInput[]>([]);
  const [spaceOptions, setSpaceOptions] = useState<ReservationSpaceOption[]>([]);
  const [spaceIds, setSpaceIds] = useState<string[]>([]);
  const [reserveSpaces, setReserveSpaces] = useState(false);
  const [reserveStartTime, setReserveStartTime] = useState('09:00');
  const [reserveEndTime, setReserveEndTime] = useState('10:00');
  const [personnelIds, setPersonnelIds] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSuperUser = userRole === 'superuser';

  // Sincronizar campos cuando se abre para editar o crear
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      if (initialActivity) {
        setTitle(initialActivity.title || '');
        setDescription(initialActivity.description || '');
        setStartDate(
          initialActivity.startDate ? initialActivity.startDate.split('T')[0] : today
        );
        setEndDate(
          initialActivity.endDate ? initialActivity.endDate.split('T')[0] : today
        );
        setCreatorId(initialActivity.creator?.userId || '');
        setReserveSpaces(false);
        setSpaceIds([]);
        void Promise.all([
          getActivityExternalLocations(initialActivity.activityId).catch(() => ({ locations: [] })),
          getActivityPersonnel(initialActivity.activityId).catch(() => ({ users: [] as ActivityPersonnelMember[] })),
        ]).then(([locationResponse, personnelResponse]) => {
          setExternalLocations(locationResponse.locations.map((location) => ({
            googlePlaceId: location.googlePlaceId,
            name: location.name,
            formattedAddress: location.formattedAddress,
            latitude: location.latitude,
            longitude: location.longitude,
          })));
          setPersonnelIds(personnelResponse.users.map((member) => member.userId));
        });
      } else {
        setTitle('');
        setDescription('');
        setStartDate(today);
        setEndDate(today);
        setCreatorId('');
        setExternalLocations([]);
        setPersonnelIds([]);
        setSpaceIds([]);
        setReserveSpaces(false);
      }
    }
  }, [open, initialActivity, today]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Cargar directorio de usuarios solo si es Superusuario
  useEffect(() => {
    if (open && isSuperUser) {
      const fetchUsers = async () => {
        try {
          setLoadingUsers(true);
          const res = await apiFetch<{ users: UserDirectoryEntry[] } | UserDirectoryEntry[]>('/users');
          const rawList = Array.isArray(res) ? res : (res?.users || []);

          const mappedUsers: UserOption[] = rawList.flatMap((entry) => {
            const userId = entry.userId || entry.id;
            return userId ? [{ userId, username: entry.username || 'Sin nombre', email: entry.email || '' }] : [];
          });

          setUsersList(mappedUsers);
        } catch {
          // Mantener lista vacía si falla de forma segura
        } finally {
          setLoadingUsers(false);
        }
      };

      fetchUsers();
    }
  }, [open, isSuperUser]);

  useEffect(() => {
    if (!open || !canReserve) return;
    let active = true;
    const loadingTimer = window.setTimeout(() => setLoadingSpaces(true), 0);
    void getReservationSpaces()
      .then((response) => { if (active) setSpaceOptions(response.spaces || []); })
      .catch(() => { if (active) setSpaceOptions([]); })
      .finally(() => {
        window.clearTimeout(loadingTimer);
        if (active) setLoadingSpaces(false);
      });
    return () => {
      active = false;
      window.clearTimeout(loadingTimer);
    };
  }, [open, canReserve]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate || !endDate) return;
    if (isSuperUser && !isEditing && !creatorId) return;
    if (reserveSpaces && (spaceIds.length === 0 || reserveEndTime <= reserveStartTime)) return;

    try {
      setIsSubmitting(true);
      await onSave(
        {
          title: title.trim(),
          description: description.trim() || undefined,
          startDate,
          endDate,
          creatorId: isSuperUser && creatorId ? creatorId : undefined,
          externalLocations,
          spaceIds: reserveSpaces ? spaceIds : [],
          reserveStartTime: reserveSpaces ? `${startDate}T${reserveStartTime}` : undefined,
          reserveEndTime: reserveSpaces ? `${endDate}T${reserveEndTime}` : undefined,
          personnelIds,
        },
        initialActivity?.activityId
      );

      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !isSubmitting && setOpen(val)}>
      {triggerButton !== undefined ? (
        <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button className="cursor-pointer min-h-[44px] w-full sm:w-auto bg-primary hover:bg-uno-ciruela text-primary-foreground font-medium shadow-sm active:scale-95 transition-all">
            + Nueva Actividad
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto bg-card rounded-2xl p-5 sm:p-6 shadow-xl border border-border">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-bold text-primary">
            {isEditing ? 'Editar Actividad' : 'Registrar Nueva Actividad'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className={labelClass}>Título de la Actividad *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Mantenimiento de Equipos"
              className={`${fieldClass} min-h-[44px]`}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Fecha Inicio *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`${fieldClass} min-h-[44px]`}
                required
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className={labelClass}>Fecha Fin *</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`${fieldClass} min-h-[44px]`}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Descripción detallada</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe los detalles de la actividad..."
              rows={3}
              className={`${fieldClass} resize-none`}
              disabled={isSubmitting}
            />
          </div>

          <section className="space-y-3 rounded-2xl border border-border bg-secondary/40 p-4">
            <h3 className="text-sm font-semibold text-foreground">Ubicación de la actividad</h3>
            <ExternalLocationPicker
              locations={externalLocations}
              onChange={setExternalLocations}
              disabled={isSubmitting}
            />
            {canReserve && (
              <div className="space-y-3 rounded-2xl border border-border bg-background p-4">
                <label className="flex items-start gap-3 text-sm font-medium text-foreground">
                  <input type="checkbox" checked={reserveSpaces} onChange={(event) => setReserveSpaces(event.target.checked)} disabled={isSubmitting || loadingSpaces} className="mt-1 h-4 w-4 accent-primary" />
                  Reservar espacios universitarios para esta actividad
                </label>
                {reserveSpaces && (
                  <>
                    {loadingSpaces ? (
                      <p className="text-xs text-muted-foreground">Cargando espacios disponibles…</p>
                    ) : spaceOptions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No hay espacios activos o no tienes permiso para consultarlos.</p>
                    ) : (
                      <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-border p-3">
                        {spaceOptions.map((space) => (
                          <label key={space.spaceId} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={spaceIds.includes(space.spaceId)} onChange={(event) => setSpaceIds((current) => event.target.checked ? [...current, space.spaceId] : current.filter((id) => id !== space.spaceId))} disabled={isSubmitting} className="h-4 w-4 accent-primary" />
                            <span>{space.name || 'Espacio sin nombre'}{space.capacity ? ` · capacidad ${space.capacity}` : ''}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                        Inicio de reservación
                        <input type="time" value={reserveStartTime} onChange={(event) => setReserveStartTime(event.target.value)} disabled={isSubmitting} className={fieldClass} required={reserveSpaces} />
                      </label>
                      <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                        Fin de reservación
                        <input type="time" value={reserveEndTime} onChange={(event) => setReserveEndTime(event.target.value)} disabled={isSubmitting} className={fieldClass} required={reserveSpaces} />
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">La reservación se vincula a la actividad y queda pendiente hasta su aprobación.</p>
                  </>
                )}
              </div>
            )}
          </section>

          {isSuperUser && (
            <section className="space-y-2 rounded-2xl border border-border bg-background p-4">
              <h3 className="text-sm font-semibold text-foreground">Colaboradores y notificaciones</h3>
              <p className="text-xs text-muted-foreground">Las personas seleccionadas recibirán notificaciones cuando solicites un servicio para la actividad.</p>
              {loadingUsers ? <p className="text-xs text-muted-foreground">Cargando usuarios…</p> : (
                <div className="max-h-40 space-y-2 overflow-y-auto">
                  {usersList.map((user) => (
                    <label key={user.userId} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={personnelIds.includes(user.userId)} onChange={(event) => setPersonnelIds((current) => event.target.checked ? [...current, user.userId] : current.filter((id) => id !== user.userId))} disabled={isSubmitting} className="h-4 w-4 accent-primary" />
                      <span>{user.username} <span className="text-xs text-muted-foreground">{user.email}</span></span>
                    </label>
                  ))}
                  {!usersList.length && <p className="text-xs text-muted-foreground">No hay usuarios disponibles para asignar.</p>}
                </div>
              )}
            </section>
          )}

          {/* Selector de creador solo para superusuario */}
          {isSuperUser && (
            <div className="bg-secondary border border-border rounded-xl p-3 space-y-1.5">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                Asignar Responsable / Creador
              </label>
              <p className="text-[11px] text-muted-foreground">
                Selecciona al usuario que figurará como autor de esta actividad.
              </p>

              {loadingUsers ? (
                <div className="flex items-center gap-2 py-2 text-xs text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Cargando directorio de usuarios...</span>
                </div>
              ) : (
                <select
                  value={creatorId}
                  onChange={(e) => setCreatorId(e.target.value)}
                  className={`${fieldClass} min-h-[44px] cursor-pointer`}
                  disabled={isSubmitting}
                  required={!isEditing}
                >
                  {!isEditing && <option value="">Selecciona un usuario responsable</option>}
                  {usersList.map((u) => (
                    <option key={u.userId} value={u.userId}>
                      {u.username} ({u.email})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <DialogFooter className="-mx-5 -mb-5 p-5 sm:-mx-6 sm:-mb-6 sm:p-6 mt-2 flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto min-h-[44px] rounded-xl border-border text-foreground hover:bg-secondary"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto min-h-[44px] cursor-pointer bg-primary hover:bg-uno-ciruela text-primary-foreground rounded-xl shadow-sm flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? 'Actualizar Cambios' : 'Guardar Actividad'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
