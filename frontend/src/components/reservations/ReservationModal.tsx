'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { BackendActivity, BackendReservation, CreateReservationInput, ReservationCreatorOption, ReservationSpaceOption } from '@/lib/api';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateReservationInput) => Promise<void>;
  initialData?: BackendReservation | null;
  canManage?: boolean;
  creatorsList?: ReservationCreatorOption[];
  spaces?: ReservationSpaceOption[];
  activities?: BackendActivity[];
}

function formatForInput(dateInput?: string | Date | null) {
  if (!dateInput) return '';
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const pad = (value: number) => value.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  } catch {
    return '';
  }
}

function getDefaultDates() {
  const now = new Date();
  now.setHours(now.getHours() + 1, 0, 0, 0);
  const startStr = formatForInput(now);
  const end = new Date(now);
  end.setHours(end.getHours() + 1);
  return { startStr, endStr: formatForInput(end) };
}

export function ReservationModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  canManage = false,
  creatorsList = [],
  spaces = [],
  activities = [],
}: ReservationModalProps) {
  const isEditMode = Boolean(initialData);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    creatorId: '',
    activityId: '',
    spaceIds: [] as string[],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Este efecto sincroniza el formulario controlado con el registro que se abre.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setFormError(null);
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        startTime: formatForInput(initialData.startTime),
        endTime: formatForInput(initialData.endTime),
        creatorId: initialData.creator?.userId || '',
        activityId: initialData.activityId || '',
        spaceIds: initialData.spaces?.map((space) => space.spaceId) || [],
      });
    } else {
      const { startStr, endStr } = getDefaultDates();
      setFormData({
        title: '',
        description: '',
        startTime: startStr,
        endTime: endStr,
        creatorId: '',
        activityId: '',
        spaceIds: [],
      });
    }
  }, [initialData, isOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const startMs = Date.parse(formData.startTime);
    const endMs = Date.parse(formData.endTime);
    const nowMs = Date.now() - 60000; // Margen de gracia de 1 minuto

    // 1. Al crear, validar que no sea una fecha/hora pasada
    if (!isEditMode && startMs < nowMs) {
      setFormError(
        'No puedes registrar una reservación en una fecha u hora que ya pasó. Recuerda que el horario es en formato 24 hrs (ej. 17:00 para las 5:00 p.m.).'
      );
      return;
    }

    // 2. Validar ventana de tiempo
    if (endMs <= startMs) {
      setFormError('La fecha y hora de fin debe ser posterior a la de inicio.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateReservationInput = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        activityId: formData.activityId || null,
        spaceIds: formData.spaceIds,
      };

      // Únicamente incluimos creatorId al CREAR
      if (!isEditMode && canManage && formData.creatorId) {
        payload.creatorId = formData.creatorId;
      }

      await onSave(payload);
      onClose();
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : 'Error al procesar la reservación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-6 rounded-3xl bg-white border border-stone-200">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold text-gray-900">
            {isEditMode ? 'Editar Reservación' : 'Nueva Reservación'}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {isEditMode
              ? 'Modifica los datos de la reservación seleccionada.'
              : 'Completa los campos para registrar una nueva reservación.'}
          </DialogDescription>
        </DialogHeader>

        {formError && (
          <div className="p-3 mb-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold leading-relaxed">
            ⚠ {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEditMode && canManage && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Asignar a usuario (creator_id)
              </label>
              <select
                className="w-full border border-gray-200 bg-gray-50/50 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c1d24]"
                value={formData.creatorId}
                onChange={(e) => setFormData({ ...formData, creatorId: e.target.value })}
              >
                <option value="">-- Mí mismo (Automático) --</option>
                {creatorsList.map((user) => (
                  <option key={user.userId} value={user.userId}>
                    {user.username ? `${user.username} (${user.email})` : user.email}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400">
                Selecciona si deseas registrar esta reserva a nombre de otro usuario.
              </p>
            </div>
          )}

          {activities.length > 0 && <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Vincular a actividad (opcional)</label>
            <select className="w-full rounded-xl border border-gray-200 p-2.5 text-sm" value={formData.activityId} onChange={(event) => setFormData({ ...formData, activityId: event.target.value })}>
              <option value="">Sin actividad vinculada</option>
              {activities.map((activity) => <option key={activity.activityId} value={activity.activityId}>{activity.title || 'Actividad sin título'}</option>)}
            </select>
          </div>}

          <fieldset className="space-y-2 rounded-xl border border-gray-200 p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Espacios universitarios</legend>
            {spaces.length ? <div className="max-h-36 space-y-2 overflow-y-auto">{spaces.map((space) => <label key={space.spaceId} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.spaceIds.includes(space.spaceId)} onChange={(event) => setFormData({ ...formData, spaceIds: event.target.checked ? [...formData.spaceIds, space.spaceId] : formData.spaceIds.filter((id) => id !== space.spaceId) })} /><span>{space.name || 'Espacio sin nombre'}{space.capacity ? ` · capacidad ${space.capacity}` : ''}</span></label>)}</div> : <p className="text-xs text-gray-500">No se pudieron cargar espacios o no hay espacios disponibles.</p>}
          </fieldset>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Título de la Reservación *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Uso de sala de conferencias"
              className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c1d24]"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Descripción o Motivo
            </label>
            <textarea
              rows={2}
              placeholder="Detalles sobre el evento o recursos solicitados"
              className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c1d24]"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Fecha / Hora Inicio *
              </label>
              <input
                type="datetime-local"
                required
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c1d24]"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Fecha / Hora Fin *
              </label>
              <input
                type="datetime-local"
                required
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c1d24]"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-[#7c1d24] hover:bg-[#63171d] text-white"
            >
              {isSubmitting ? 'Guardando...' : isEditMode ? 'Actualizar' : 'Guardar Reservación'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
