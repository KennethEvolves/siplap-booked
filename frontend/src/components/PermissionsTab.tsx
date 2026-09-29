// src/components/PermissionsTab.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/lib/api';
import { createPermissionSchema, updatePermissionSchema, type ZodType } from '@shared/contracts';

interface PermissionItem {
  permissionId: string;
  name: string | null;
  slug: string;
  description: string | null;
}

export default function PermissionsTab() {
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [busy, setBusy] = useState(false);

  // Estados de edición y formulario
  const [editingPermission, setEditingPermission] = useState<string | null>(null);
  const [permissionName, setPermissionName] = useState('');
  const [permissionSlug, setPermissionSlug] = useState('');
  const [permissionDescription, setPermissionDescription] = useState('');

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

  const fetchPermissions = async () => {
    try {
      setLoadingPermissions(true);
      const res: any = await apiFetch('/permissions', { method: 'GET' });
      if (res && Array.isArray(res.permissions)) {
        setPermissions(res.permissions);
      } else if (Array.isArray(res)) {
        setPermissions(res);
      }
    } catch (err: any) {
      console.error('Error al cargar permisos:', err);
    } finally {
      setLoadingPermissions(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const cancelEdit = () => {
    setEditingPermission(null);
    setPermissionName('');
    setPermissionSlug('');
    setPermissionDescription('');
  };

  const handleCreateOrUpdatePermission = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setBusy(true);

    try {
      const bodyData = validatedBody(
        editingPermission ? updatePermissionSchema : createPermissionSchema,
        {
          name: permissionName,
          slug: permissionSlug,
          description: permissionDescription,
        }
      );

      await apiFetch(editingPermission ? `/permissions/${editingPermission}` : '/permissions', {
        method: editingPermission ? 'PATCH' : 'POST',
        body: bodyData,
      });

      setSuccess(editingPermission ? '¡Permiso actualizado con éxito!' : '¡Permiso creado con éxito!');
      cancelEdit();
      fetchPermissions();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el permiso');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string, slug: string) => {
    if (confirm(`¿Estás seguro de eliminar el permiso "${slug}"?`)) {
      try {
        await apiFetch(`/permissions/${id}`, { method: 'DELETE' });
        if (editingPermission === id) cancelEdit();
        fetchPermissions();
      } catch (err: any) {
        alert(err.message || 'No se pudo eliminar el permiso');
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card title={editingPermission ? 'Editar Permiso' : 'Gestión de Permisos'}>
        <form onSubmit={handleCreateOrUpdatePermission} className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 space-y-4">
          <h3 className="font-bold text-gray-700">{editingPermission ? 'Modificar Permiso' : 'Registrar Nuevo Permiso'}</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input 
              type="text" 
              value={permissionName}
              onChange={(e) => setPermissionName(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug (recurso:accion, ej. users:create)</label>
            <input 
              type="text" 
              value={permissionSlug}
              onChange={(e) => setPermissionSlug(e.target.value)}
              required
              className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea 
              value={permissionDescription}
              onChange={(e) => setPermissionDescription(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black min-h-[70px]"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}

          <div className="flex space-x-2">
            <Button variant="primary" type="submit" disabled={busy}>
              {busy ? 'Guardando...' : editingPermission ? 'Actualizar Permiso' : 'Guardar Permiso'}
            </Button>
            {editingPermission && (
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
                <th className="p-3">Permiso</th>
                <th className="p-3">Slug</th>
                <th className="p-3">Descripción</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-600">
              {loadingPermissions ? (
                <tr><td colSpan={4} className="p-4 text-center text-gray-400">Cargando permisos...</td></tr>
              ) : permissions.length === 0 ? (
                <tr><td colSpan={4} className="p-4 text-center text-gray-400">No hay permisos registrados.</td></tr>
              ) : (
                permissions.map((permission) => (
                  <tr key={permission.permissionId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-800">{permission.name || 'Sin nombre'}</td>
                    <td className="p-3 font-mono text-xs">{permission.slug}</td>
                    <td className="p-3">{permission.description || '-'}</td>
                    <td className="p-3 text-center space-x-2">
                      <button 
                        onClick={() => {
                          setEditingPermission(permission.permissionId);
                          setPermissionName(permission.name || '');
                          setPermissionSlug(permission.slug);
                          setPermissionDescription(permission.description || '');
                        }} 
                        className="text-blue-600 hover:underline text-xs font-medium"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => handleDelete(permission.permissionId, permission.slug)} 
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