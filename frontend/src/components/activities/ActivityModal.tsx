'use client';

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { apiFetch, BackendActivity } from '@/lib/api';
import { Loader2, Pencil } from 'lucide-react';

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

export function ActivityModal({ 
  userRole, 
  initialActivity, 
  triggerButton,
  isOpen: externalOpen,
  onOpenChange: externalOnOpenChange,
  onSave 
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
          initialActivity.startDate 
            ? initialActivity.startDate.split('T')[0] 
            : today
        );
        setEndDate(
          initialActivity.endDate 
            ? initialActivity.endDate.split('T')[0] 
            : today
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
          // Si es superusuario, envía el creatorId seleccionado hacia el backend (POST/PATCH)
          creatorId: isSuperUser && creatorId ? creatorId : undefined 
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
          <Button className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm active:scale-95 transition-all">
            + Nueva Actividad
          </Button>
        </DialogTrigger>
      )}
      
      <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6 shadow-xl border border-slate-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {isEditing ? 'Editar Actividad' : 'Registrar Nueva Actividad'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Título de la Actividad *
            </label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Mantenimiento de Equipos"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              required 
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Fecha Inicio *
              </label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                required 
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Fecha Fin *
              </label>
              <input 
                type="date" 
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                required 
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Descripción detallada
            </label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe los detalles de la actividad..."
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all resize-none"
              disabled={isSubmitting}
            />
          </div>

          {/* Selector de creador sólo para superusuario (cumpliendo el ticket para POST/PATCH) */}
          {isSuperUser && (
            <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 space-y-1.5">
              <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider">
                Asignar Responsable / Creador
              </label>
              <p className="text-[11px] text-blue-700">
                Selecciona al usuario que figurará como autor de esta actividad.
              </p>
              
              {loadingUsers ? (
                <div className="flex items-center gap-2 py-2 text-xs text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Cargando directorio de usuarios...</span>
                </div>
              ) : (
                <select
                  value={creatorId}
                  onChange={(e) => setCreatorId(e.target.value)}
                  className="w-full rounded-xl border border-blue-200 px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all cursor-pointer"
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

          <DialogFooter className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
              className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm flex items-center gap-2"
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