'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/Button';
import {
  createReservation,
  deleteReservation,
  getReservationCreators,
  getReservations,
  updateReservation,
  type BackendReservation,
  type ReservationCreatorOption,
  type ReservationStatus,
} from '@/lib/api';

type ReservationForm = {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  creatorId: string;
  status: ReservationStatus;
};

const emptyForm: ReservationForm = {
  title: '',
  description: '',
  startTime: '',
  endTime: '',
  creatorId: '',
  status: 'active',
};

const statusLabels: Record<ReservationStatus, string> = {
  active: 'Activa',
  in_use: 'En uso',
  cancelled: 'Cancelada',
  completed: 'Completada',
};

function toLocalDateTime(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const two = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}T${two(date.getHours())}:${two(date.getMinutes())}`;
}

function formatDate(value: string | null) {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function userLabel(user: ReservationCreatorOption) {
  return user.username ? `${user.username} · ${user.email}` : user.email;
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<BackendReservation[]>([]);
  const [users, setUsers] = useState<ReservationCreatorOption[]>([]);
  const [form, setForm] = useState<ReservationForm>(emptyForm);
  const [editing, setEditing] = useState<BackendReservation | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadReservations = useCallback(async () => {
    const response = await getReservations();
    setReservations(response.reservations);
    setCanCreate(response.capabilities.canCreate);
    setCanManage(response.capabilities.canManage);
    return response.capabilities.canManage;
  }, []);

  useEffect(() => {
    let active = true;

    async function loadPage() {
      setLoading(true);
      setError('');
      try {
        const response = await getReservations();
        if (!active) return;

        setReservations(response.reservations);
        setCanManage(response.capabilities.canManage);
        setCanCreate(response.capabilities.canCreate);
        if (response.capabilities.canManage) {
          try {
            const creators = await getReservationCreators();
            if (active) setUsers(creators.users);
          } catch (creatorError) {
            if (active) {
              setUsers([]);
              setError(
                creatorError instanceof Error
                  ? `No se pudieron cargar los usuarios para asignar: ${creatorError.message}`
                  : 'No se pudieron cargar los usuarios para asignar.',
              );
            }
          }
        } else {
          setUsers([]);
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No fue posible cargar las reservaciones.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPage();
    return () => {
      active = false;
    };
  }, []);

  function startEdit(reservation: BackendReservation) {
    setEditing(reservation);
    setForm({
      title: reservation.title ?? '',
      description: reservation.description ?? '',
      startTime: toLocalDateTime(reservation.startTime),
      endTime: toLocalDateTime(reservation.endTime),
      creatorId: '',
      status: reservation.status ?? 'active',
    });
    setError('');
    setNotice('');
  }

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!editing && !canCreate) {
      setError('No cuentas con permiso para crear reservaciones.');
      return;
    }
    if (!editing && canManage && !form.creatorId) {
      setError('Selecciona el usuario al que pertenece la reservación.');
      return;
    }

    setSaving(true);
    try {
      const startTime = new Date(form.startTime).toISOString();
      const endTime = new Date(form.endTime).toISOString();
      if (new Date(endTime) <= new Date(startTime)) {
        throw new Error('La fecha final debe ser posterior a la inicial.');
      }

      if (editing) {
        await updateReservation(editing.reservationId, {
          title: form.title.trim(),
          description: form.description.trim() || null,
          startTime,
          endTime,
          status: form.status,
        });
        setNotice('Reservación actualizada y guardada en la base de datos.');
      } else {
        await createReservation({
          title: form.title.trim(),
          description: form.description.trim() || null,
          startTime,
          endTime,
          ...(canManage ? { creatorId: form.creatorId } : {}),
        });
        setNotice(
          canManage
            ? 'Reservación creada y asignada al usuario seleccionado.'
            : 'Reservación creada a tu nombre y guardada en la base de datos.',
        );
      }

      resetForm();
      await loadReservations();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'No fue posible guardar la reservación.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(reservation: BackendReservation) {
    if (
      !window.confirm(
        `¿Eliminar la reservación “${reservation.title ?? 'Sin título'}”?`,
      )
    ) {
      return;
    }

    setError('');
    setNotice('');
    try {
      await deleteReservation(reservation.reservationId);
      setReservations((current) =>
        current.filter((item) => item.reservationId !== reservation.reservationId),
      );
      setNotice('Reservación eliminada de la base de datos.');
      if (editing?.reservationId === reservation.reservationId) resetForm();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'No fue posible eliminar la reservación.',
      );
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto p-5 md:p-9">
        <div className="mx-auto max-w-6xl space-y-7">
          <header className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                SIPLAP · Booked
              </p>
              <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
                Reservaciones
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Consulta y administra las reservaciones según tus permisos.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
              <CalendarClock className="h-4 w-4" />
              {canManage ? 'Gestión global' : 'Reservaciones propias'}
            </div>
          </header>

          {(error || notice) && (
            <div
              role={error ? 'alert' : 'status'}
              className={`rounded-xl border px-4 py-3 text-sm ${
                error
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {error || notice}
            </div>
          )}

          {(canCreate || editing) && (
            <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editing ? 'Editar reservación' : 'Crear reservación'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {editing
                      ? 'Los cambios se guardarán en la base de datos.'
                      : canManage
                        ? 'Selecciona el usuario propietario; su identificador se guardará en creator_id.'
                        : 'La reservación quedará vinculada automáticamente a tu cuenta en creator_id.'}
                  </p>
                </div>
                {editing && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Cancelar edición"
                    onClick={resetForm}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium text-slate-700 md:col-span-2">
                  <span>Título</span>
                  <input
                    required
                    maxLength={255}
                    value={form.title}
                    onChange={(event) =>
                      setForm({ ...form, title: event.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    placeholder="Nombre de la reservación"
                  />
                </label>

                <label className="space-y-1.5 text-sm font-medium text-slate-700 md:col-span-2">
                  <span>Descripción</span>
                  <textarea
                    rows={3}
                    maxLength={10000}
                    value={form.description}
                    onChange={(event) =>
                      setForm({ ...form, description: event.target.value })
                    }
                    className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    placeholder="Detalles adicionales (opcional)"
                  />
                </label>

                {!editing && canManage && (
                  <label className="space-y-1.5 text-sm font-medium text-slate-700 md:col-span-2">
                    <span>Usuario propietario</span>
                    <select
                      required
                      value={form.creatorId}
                      onChange={(event) =>
                        setForm({ ...form, creatorId: event.target.value })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="">Selecciona un usuario</option>
                      {users.map((user) => (
                        <option key={user.userId} value={user.userId}>
                          {userLabel(user)}
                        </option>
                      ))}
                    </select>
                    {users.length === 0 && (
                      <span className="block text-xs font-normal text-amber-700">
                        No hay usuarios activos disponibles para asignar.
                      </span>
                    )}
                  </label>
                )}

                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  <span>Inicio</span>
                  <input
                    required
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(event) =>
                      setForm({ ...form, startTime: event.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  <span>Fin</span>
                  <input
                    required
                    type="datetime-local"
                    value={form.endTime}
                    onChange={(event) =>
                      setForm({ ...form, endTime: event.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                {editing && (
                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    <span>Estado</span>
                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          status: event.target.value as ReservationStatus,
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <div className="flex items-center gap-2 md:col-span-2">
                  <Button type="submit" disabled={saving || (!editing && canManage && users.length === 0)}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : editing ? (
                      'Guardar cambios'
                    ) : (
                      <>
                        <Plus className="h-4 w-4" /> Crear reservación
                      </>
                    )}
                  </Button>
                  {editing && (
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </section>
          )}

          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="font-bold text-slate-900">Reservaciones registradas</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {reservations.length} de las reservaciones más recientes
                </p>
              </div>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
            </div>

            {loading ? (
              <div className="p-10 text-center text-sm text-slate-500">
                Cargando reservaciones…
              </div>
            ) : reservations.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                No hay reservaciones para mostrar.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Reservación</th>
                      <th className="px-6 py-3 font-semibold">Usuario</th>
                      <th className="px-6 py-3 font-semibold">Inicio</th>
                      <th className="px-6 py-3 font-semibold">Fin</th>
                      <th className="px-6 py-3 font-semibold">Estado</th>
                      <th className="px-6 py-3 text-right font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reservations.map((reservation) => (
                      <tr key={reservation.reservationId} className="hover:bg-slate-50/70">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-900">
                            {reservation.title || 'Sin título'}
                          </p>
                          {reservation.description && (
                            <p className="mt-0.5 max-w-xs truncate text-xs text-slate-500">
                              {reservation.description}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {reservation.creator.username || reservation.creator.userId}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {formatDate(reservation.startTime)}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {formatDate(reservation.endTime)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            {reservation.status
                              ? statusLabels[reservation.status]
                              : 'Sin estado'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            {reservation.actions.canUpdate && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startEdit(reservation)}
                              >
                                <Pencil className="h-3.5 w-3.5" /> Editar
                              </Button>
                            )}
                            {reservation.actions.canDelete && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => void handleDelete(reservation)}
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Eliminar
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
