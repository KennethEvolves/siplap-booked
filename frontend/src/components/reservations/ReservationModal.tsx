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
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    creatorId: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatForInput = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
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

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        startTime: formatForInput(initialData.startTime),
        endTime: formatForInput(initialData.endTime),
        creatorId: initialData.creator?.userId || '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        creatorId: '',
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: any = {
        title: formData.title,
        description: formData.description || undefined,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
      };

      if (canManage && formData.creatorId) {
        payload.creatorId = formData.creatorId;
      }

      await onSave(payload);
      onClose();
    } catch (error) {
      console.error('Error al enviar formulario:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-6 rounded-3xl bg-white">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold text-gray-900">
            {initialData ? 'Editar Reservación' : 'Nueva Reservación'}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {initialData
              ? 'Modifica los datos de la reservación seleccionada.'
              : 'Completa los campos para registrar una nueva reservación.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {canManage && (
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
              {isSubmitting ? 'Guardando...' : initialData ? 'Actualizar' : 'Guardar Reservación'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}