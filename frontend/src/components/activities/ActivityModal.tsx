'use client';

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';

interface ActivityModalProps {
  userRole: 'superuser' | 'directive' | 'lead';
  onSave: (activityData: { title: string; description: string; assignedUser?: string }) => void;
}

export function ActivityModal({ userRole, onSave }: ActivityModalProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedUser, setAssignedUser] = useState('');

  const isSuperUser = userRole === 'superuser';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ title, description, assignedUser: isSuperUser ? assignedUser : undefined });
    setTitle('');
    setDescription('');
    setAssignedUser('');
    setOpen(false); // Cierra el modal al guardar
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm">
          + Nueva Actividad
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6 shadow-xl border border-slate-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">Registrar Nueva Actividad</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Título de la Actividad
            </label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Mantenimiento de Equipos"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              required 
            />
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
            />
          </div>

          {/* REQUISITO: Si es superuser, mostrar selector para asignar a un usuario tercero */}
          {isSuperUser && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Asignar Responsable (Superusuario)
              </label>
              <select 
                value={assignedUser}
                onChange={(e) => setAssignedUser(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                required
              >
                <option value="">Selecciona un usuario...</option>
                <option value="Jefe de Sistemas">Jefe de Sistemas</option>
                <option value="Coordinación Académica">Coordinación Académica</option>
                <option value="Director General">Director General</option>
              </select>
            </div>
          )}

          <DialogFooter className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm"
            >
              Guardar Actividad
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}