// src/components/RolesTab.tsx
'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/lib/api';
import { ShieldCheck, Search } from 'lucide-react';

interface RoleItem {
  roleId: string;
  name: string | null;
  description: string | null;
}

export default function RolesTab() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados del formulario y edición
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Cargar roles desde la base de datos
  const fetchRoles = useCallback(async () => {
    try {
      const res = await apiFetch<RoleItem[] | { roles?: RoleItem[] }>('/roles');
      const rolesList = Array.isArray(res) ? res : res.roles;
      setRoles(rolesList || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchRoles);
  }, [fetchRoles]);

  const cancelEdit = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDescription('');
  };

  const handleCreateOrUpdateRole = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setBusy(true);

    try {
      const payload = {
        name: roleName,
        description: roleDescription,
      };

      await apiFetch(editingRole ? `/roles/${editingRole}` : '/roles', {
        method: editingRole ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });

      setSuccess(editingRole ? '¡Rol actualizado con éxito!' : '¡Rol creado con éxito!');
      cancelEdit();
      void fetchRoles();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar el rol');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`¿Estás seguro de eliminar el rol "${name}"?`)) {
      try {
        await apiFetch(`/roles/${id}`, { method: 'DELETE' });
        if (editingRole === id) cancelEdit();
        void fetchRoles();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'No se pudo eliminar el rol');
      }
    }
  };

  const filteredRoles = roles.filter(role => 
    role.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* 1. Panel superior: Registrar o Editar Rol */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {editingRole ? 'Editar Rol' : 'Registrar Nuevo Rol'}
            </h2>
            <p className="text-xs text-slate-500">
              {editingRole ? 'Modifica los detalles del rol seleccionado.' : 'Crea un nuevo nivel de acceso para la organización.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateOrUpdateRole} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nombre del rol</label>
            <input 
              type="text" 
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              required
              placeholder="Ej. Administrador de Contenido"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descripción</label>
            <textarea 
              value={roleDescription}
              onChange={(e) => setRoleDescription(e.target.value)}
              placeholder="Describe brevemente las responsabilidades de este rol..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 min-h-[90px]"
            />
          </div>

          {error && <p className="text-rose-600 text-xs font-medium">{error}</p>}
          {success && <p className="text-emerald-600 text-xs font-medium">{success}</p>}

          <div className="flex justify-end gap-2 pt-2">
            {editingRole && (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
            )}
            <Button type="submit" disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm">
              {busy ? 'Guardando...' : editingRole ? 'Actualizar Rol' : 'Guardar Rol'}
            </Button>
          </div>
        </form>
      </div>

      {/* 2. Barra de búsqueda */}
      <div className="flex justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por nombre o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
          />
        </div>
      </div>

      {/* 3. Panel de Tabla de Roles */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/70">
                <th className="py-3.5 px-6">Rol</th>
                <th className="py-3.5 px-6">Descripción</th>
                <th className="py-3.5 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-400">Cargando roles...</td>
                </tr>
              ) : filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-400">No hay roles registrados.</td>
                </tr>
              ) : (
                filteredRoles.map((role) => (
                  <tr key={role.roleId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-900">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200/60">
                        {role.name || 'Sin nombre'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-500 text-xs">
                      {role.description || 'Sin descripción detallada.'}
                    </td>
                    <td className="py-4 px-6 text-right space-x-3">
                      <button 
                        onClick={() => {
                          setError('');
                          setSuccess('');
                          setEditingRole(role.roleId);
                          setRoleName(role.name || '');
                          setRoleDescription(role.description || '');
                        }} 
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => handleDelete(role.roleId, role.name || 'rol')} 
                        className="text-xs font-semibold text-rose-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
