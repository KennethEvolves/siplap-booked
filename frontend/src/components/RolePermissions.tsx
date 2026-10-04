'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/lib/api';
import type { RoleItem } from './RolesTab';

interface PermissionItem { permissionId: string; name: string | null; slug: string; description: string | null; }
export default function RolePermissions({ roles, loadingRoles, onAssigned }: {
  roles: RoleItem[]; loadingRoles: boolean; onAssigned: () => Promise<void>;
}) {
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [roleId, setRoleId] = useState('');
  const [permissionId, setPermissionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const role = roles.find(item => item.roleId === roleId);
  const assigned = role?.permissions ?? [];
  const available = permissions.filter(item => !assigned.some(current => current.permissionId === item.permissionId));
  const chosen = available.find(item => item.permissionId === permissionId);
  useEffect(() => {
    let active = true;
    apiFetch<{ permissions: PermissionItem[] } | PermissionItem[]>('/permissions')
      .then(data => { if (active) setPermissions(Array.isArray(data) ? data : data.permissions); })
      .catch((error: unknown) => { if (active) setError(error instanceof Error ? error.message : 'No se pudieron cargar los permisos'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function assign(event: FormEvent) {
    event.preventDefault();
    if (!role || !chosen || busy) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      await apiFetch(`/roles/${role.roleId}/permissions/${chosen.permissionId}`, { method: 'POST' });
      setSuccess(`Permiso ${chosen.slug} asignado a ${role.name || 'este rol'}.`);
      setPermissionId('');
      await onAssigned();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'No se pudo asignar el permiso');
      await onAssigned();
    } finally { setBusy(false); }
  }
  return (
    <Card title="Asignar permisos a un rol">
      <form onSubmit={assign} className="space-y-4">
        <p className="text-sm text-gray-600">Selecciona un rol y agrega un permiso. Sus permisos actuales se conservan.</p>
        <div>
          <label htmlFor="permission-role" className="mb-1 block text-sm font-medium text-gray-700">Rol</label>
          <select id="permission-role" value={roleId} required disabled={busy || loadingRoles}
            onChange={event => { setRoleId(event.target.value); setPermissionId(''); setError(''); setSuccess(''); }}
            className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm">
            <option value="">Selecciona un rol</option>
            {roles.map(item => <option key={item.roleId} value={item.roleId}>{item.name || 'Sin nombre'}</option>)}
          </select>
          {!loadingRoles && !roles.length && <p className="mt-2 text-sm text-gray-500">Primero crea un rol.</p>}
        </div>
        {role && <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-2 text-sm font-semibold">Permisos actuales de {role.name}</h3>
          {assigned.length ? <ul className="flex flex-wrap gap-2">{assigned.map(item =>
            <li key={item.permissionId} className="rounded border border-gray-200 bg-white px-2 py-1 text-sm" title={item.name || item.slug}>{item.slug}</li>
          )}</ul> : <p className="text-sm text-gray-500">Sin permisos asignados.</p>}
        </div>}
        <div>
          <label htmlFor="role-permission" className="mb-1 block text-sm font-medium text-gray-700">Permiso disponible</label>
          <select id="role-permission" value={permissionId} required disabled={!role || busy || loading}
            onChange={event => setPermissionId(event.target.value)} className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm">
            <option value="">{loading ? 'Cargando permisos...' : 'Selecciona un permiso'}</option>
            {available.map(item => <option key={item.permissionId} value={item.permissionId}>{item.slug}{item.name ? ' — ' + item.name : ''}</option>)}
          </select>
          {chosen?.description && <p className="mt-2 text-sm text-gray-600">{chosen.description}</p>}
          {!loading && !permissions.length && <p className="mt-2 text-sm text-gray-500">Primero crea permisos en la pestaña Permisos.</p>}
          {!loading && role && permissions.length > 0 && !available.length && <p className="mt-2 text-sm text-gray-500">Este rol ya tiene todos los permisos disponibles.</p>}
        </div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {success && <p role="status" className="text-sm text-green-700">{success}</p>}
        <Button type="submit" variant="default" disabled={busy || loading || !role || !chosen}>{busy ? 'Asignando...' : 'Asignar permiso'}</Button>
      </form>
    </Card>
  );
}
