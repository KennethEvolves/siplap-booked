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
import { BackendReservation, ReservationCreatorOption } from '@/lib/api';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initialData?: BackendReservation | null;
  canManage?: boolean;
  creatorsList?: ReservationCreatorOption[];
}

export function ReservationModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  canManage = false,
  creatorsList = [],
}: ReservationModalProps) {
  const isEditMode = Boolean(initialData);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    creatorId: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Convierte cadenas ISO o Date a YYYY-MM-DDTHH:mm en hora local
  const formatForInput = (dateInput?: string | Date | null) => {
    if (!dateInput) return '';
    try {
      const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      const pad = (n: number) => n.toString().padStart(2, '0');
      const year = d.getFullYear();
      const month = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hours = pad(d.getHours());
      const minutes = pad(d.getMinutes());
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  // Valores predeterminados sugeridos (siguiente hora redonda)
  const getDefaultDates = () => {
    const now = new Date();
    // Redondea a la siguiente hora completa
    now.setHours(now.getHours() + 1, 0, 0, 0);
    const startStr = formatForInput(now);

    const end = new Date(now);
    end.setHours(end.getHours() + 1);
    const endStr = formatForInput(end);

    return { startStr, endStr };
  };

  useEffect(() => {
    setFormError(null);
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        startTime: formatForInput(initialData.startTime),
        endTime: formatForInput(initialData.endTime),
        creatorId: initialData.creator?.userId || '',
      });
    } else {
      const { startStr, endStr } = getDefaultDates();
      setFormData({
        title: '',
        description: '',
        startTime: startStr,
        endTime: endStr,
        creatorId: '',
      });
    }
  }, [initialData, isOpen]);

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
      const payload: any = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
      };

      // Únicamente incluimos creatorId al CREAR
      if (!isEditMode && canManage && formData.creatorId) {
        payload.creatorId = formData.creatorId;
      }

      await onSave(payload);
      onClose();
    } catch (error: any) {
      setFormError(error?.message || 'Error al procesar la reservación.');
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