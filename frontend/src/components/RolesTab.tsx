// src/components/RolesTab.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { createRoleSchema, updateRoleSchema, type ZodType } from '@shared/contracts';

interface RoleItem {
  roleId: string;
  name: string | null;
  description: string | null;
}

export default function RolesTab() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [busy, setBusy] = useState(false);

  // Estados de edición y formulario
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Validación con Zod del paquete compartido
  function validatedBody(schema: ZodType, value: unknown) {
    const result = schema.safeParse(value);
    if (!result.success) {
      throw new Error(result.error.issues.map((issue) => issue.message).join('. '));
    }
    return JSON.stringify(result.data);
  }

  const fetchRoles = async () => {
    try {
      setLoadingRoles(true);
      const res: any = await apiFetch('/roles', { method: 'GET' });
      if (res && Array.isArray(res.roles)) {
        setRoles(res.roles);
      } else if (Array.isArray(res)) {
        setRoles(res);
      }
    } catch (err: any) {
      console.error('Error al cargar roles:', err);
    } finally {
      setLoadingRoles(false);
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

  const handleCreateOrUpdateRole = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setBusy(true);

    try {
      const bodyData = validatedBody(
        editingRole ? updateRoleSchema : createRoleSchema,
        {
          name: roleName,
          description: roleDescription,
        }
      );

      await apiFetch(editingRole ? `/roles/${editingRole}` : '/roles', {
        method: editingRole ? 'PATCH' : 'POST',
        body: bodyData,
      });

      setSuccess(editingRole ? '¡Rol actualizado con éxito!' : '¡Rol creado con éxito!');
      cancelEdit();
      fetchRoles();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el rol');
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
      } catch (err: any) {
        alert(err.message || 'No se pudo eliminar el rol');
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card title={editingRole ? 'Editar Rol' : 'Gestión de Roles'}>
        <form onSubmit={handleCreateOrUpdateRole} className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 space-y-4">
          <h3 className="font-bold text-gray-700">{editingRole ? 'Modificar Rol' : 'Registrar Nuevo Rol'}</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del rol</label>
            <input 
              type="text" 
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              required
              className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea 
              value={roleDescription}
              onChange={(e) => setRoleDescription(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black min-h-[80px]"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}

          <div className="flex space-x-2">
            <Button type="submit" disabled={busy}>
              {busy ? 'Guardando...' : editingRole ? 'Actualizar Rol' : 'Guardar Rol'}
            </Button>
            {editingRole && (
              <button
                type="button"
                onClick={cancelEdit}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-400"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-sm border-b border-gray-200">
                <th className="p-3">Rol</th>
                <th className="p-3">Descripción</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-600">
              {loadingRoles ? (
                <tr><td colSpan={3} className="p-4 text-center text-gray-400">Cargando roles...</td></tr>
              ) : roles.length === 0 ? (
                <tr><td colSpan={3} className="p-4 text-center text-gray-400">No hay roles registrados.</td></tr>
              ) : (
                roles.map((role) => (
                  <tr key={role.roleId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-800">{role.name || 'Sin nombre'}</td>
                    <td className="p-3">{role.description || '-'}</td>
                    <td className="p-3 text-center space-x-2">
                      <button 
                        onClick={() => {
                          setEditingRole(role.roleId);
                          setRoleName(role.name || '');
                          setRoleDescription(role.description || '');
                        }} 
                        className="text-blue-600 hover:underline text-xs font-medium"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => handleDelete(role.roleId, role.name || 'Rol')} 
                        className="text-red-600 hover:underline text-xs font-medium"
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
      </Card>
    </div>
  );
}