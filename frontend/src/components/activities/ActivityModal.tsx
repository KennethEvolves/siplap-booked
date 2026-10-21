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
import { apiFetch, BackendActivity } from '@/lib/api';
import { Loader2 } from 'lucide-react';

interface ActivityModalProps {
  userRole: 'superuser' | 'directive' | 'lead';
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
  }, activityId?: string) => Promise<void> | void;
}

interface UserOption {
  userId: string;
  username: string;
  email: string;
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
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSuperUser = userRole === 'superuser';

  // Sincronizar campos cuando se abre para editar o crear
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
      } else {
        setTitle('');
        setDescription('');
        setStartDate(today);
        setEndDate(today);
        setCreatorId('');
      }
    }
  }, [open, initialActivity, today]);

  // Cargar directorio de usuarios solo si es Superusuario
  useEffect(() => {
    if (open && isSuperUser) {
      const fetchUsers = async () => {
        try {
          setLoadingUsers(true);
          const res = await apiFetch<{ users: UserOption[] } | UserOption[]>('/users');
          const rawList = Array.isArray(res) ? res : (res?.users || []);

          const mappedUsers: UserOption[] = rawList.map((u: any) => ({
            userId: u.userId || u.id,
            username: u.username || 'Sin nombre',
            email: u.email || '',
          }));

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate || !endDate) return;

    try {
      setIsSubmitting(true);
      await onSave(
        {
          title: title.trim(),
          description: description.trim() || undefined,
          startDate,
          endDate,
          creatorId: isSuperUser && creatorId ? creatorId : undefined,
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
                >
                  <option value="">Mantener autor actual / Superusuario</option>
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