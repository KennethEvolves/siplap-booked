// src/components/RolesTab.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/lib/api';
import { ShieldCheck, Search } from 'lucide-react';

interface RoleItem {
  roleId: string;
  name: string | null;
  description: string | null;
}

const fieldClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-base sm:text-sm text-foreground ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';
const labelClass = 'block text-xs font-semibold text-muted-foreground mb-1.5';
const errorBox =
  'p-3 rounded-xl text-xs font-medium border border-uno-terracota/40 bg-uno-terracota/10 text-uno-marron';
const successBox =
  'p-3 rounded-xl text-xs font-medium border border-uno-olivo/40 bg-uno-verde text-uno-negro';

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
  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res: any = await apiFetch('/roles');
      const rolesList = Array.isArray(res) ? res : res.roles;
      setRoles(rolesList || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const cancelEdit = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDescription('');
  };

  const startEdit = (role: RoleItem) => {
    setError('');
    setSuccess('');
    setEditingRole(role.roleId);
    setRoleName(role.name || '');
    setRoleDescription(role.description || '');
    window.scrollTo({ top: 0, behavior: 'smooth' }); // en móvil el formulario queda arriba
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
      fetchRoles();
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
        fetchRoles();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'No se pudo eliminar el rol');
      }
    }
  };

  const filteredRoles = roles.filter(role =>
    role.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const rowBtn =
    'text-xs font-semibold hover:underline min-h-[40px] px-3 rounded-lg border md:border-0 md:min-h-0 md:px-0';

  const renderRowActions = (role: RoleItem) => (
    <div className="flex items-center gap-2 md:justify-end md:gap-3">
      <button onClick={() => startEdit(role)} className={`${rowBtn} text-primary border-primary/40`}>
        Editar
      </button>
      <button
        onClick={() => handleDelete(role.roleId, role.name || 'rol')}
        className={`${rowBtn} text-uno-terracota border-uno-terracota/50`}
      >
        Eliminar
      </button>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* 1. Panel superior: Registrar o Editar Rol */}
      <div className="bg-card p-4 md:p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground">
              {editingRole ? 'Editar Rol' : 'Registrar Nuevo Rol'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {editingRole ? 'Modifica los detalles del rol seleccionado.' : 'Crea un nuevo nivel de acceso para la organización.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateOrUpdateRole} className="space-y-4">
          <div>
            <label className={labelClass}>Nombre del rol</label>
            <input
              type="text"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              required
              placeholder="Ej. Administrador de Contenido"
              className={`${fieldClass} min-h-[44px]`}
            />
          </div>

          <div>
            <label className={labelClass}>Descripción</label>
            <textarea
              value={roleDescription}
              onChange={(e) => setRoleDescription(e.target.value)}
              placeholder="Describe brevemente las responsabilidades de este rol..."
              className={`${fieldClass} min-h-[90px]`}
            />
          </div>

          {error && <p role="alert" className={errorBox}>{error}</p>}
          {success && <p role="status" className={successBox}>{success}</p>}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            {editingRole && (
              <button
                type="button"
                onClick={cancelEdit}
                className="min-h-[44px] px-4 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
            )}
            <Button
              type="submit"
              disabled={busy}
              className="min-h-[44px] bg-primary hover:bg-uno-ciruela text-primary-foreground rounded-xl shadow-sm"
            >
              {busy ? 'Guardando...' : editingRole ? 'Actualizar Rol' : 'Guardar Rol'}
            </Button>
          </div>
        </form>
      </div>

      {/* 2. Barra de búsqueda */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nombre o descripción..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`${fieldClass} min-h-[44px] pl-10 pr-4 bg-card shadow-sm`}
        />
      </div>

      {/* 3. Roles */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Escritorio y tablet horizontal: tabla */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider bg-secondary/70">
                <th className="py-3.5 px-6">Rol</th>
                <th className="py-3.5 px-6">Descripción</th>
                <th className="py-3.5 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-muted-foreground">Cargando roles...</td>
                </tr>
              ) : filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-muted-foreground">No hay roles registrados.</td>
                </tr>
              ) : (
                filteredRoles.map((role) => (
                  <tr key={role.roleId} className="hover:bg-secondary/50 transition-colors">
                    <td className="py-4 px-6 font-semibold text-foreground">
                      <span className="px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold border border-border">
                        {role.name || 'Sin nombre'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-muted-foreground text-xs">
                      {role.description || 'Sin descripción detallada.'}
                    </td>
                    <td className="py-4 px-6 text-right">{renderRowActions(role)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Móvil: tarjetas apiladas */}
        <div className="md:hidden divide-y divide-border">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Cargando roles...</p>
          ) : filteredRoles.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No hay roles registrados.</p>
          ) : (
            filteredRoles.map((role) => (
              <div key={role.roleId} className="p-4 space-y-3">
                <span className="inline-block px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold border border-border">
                  {role.name || 'Sin nombre'}
                </span>
                <p className="text-xs text-muted-foreground break-words">
                  {role.description || 'Sin descripción detallada.'}
                </p>
                {renderRowActions(role)}
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}