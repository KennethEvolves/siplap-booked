'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/lib/api';

export interface RoleItem {
  roleId: string;
  name: string | null;
  permissions?: PermissionItem[];
}

interface PermissionItem {
  permissionId: string;
  name: string | null;
  slug: string;
  description: string | null;
}

const selectClass =
  'w-full min-h-[44px] rounded-xl border border-input bg-background px-3 py-2 text-base sm:text-sm text-foreground ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60';
const labelClass = 'mb-1 block text-sm font-medium text-foreground';

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
        <p className="text-sm text-muted-foreground">
          Selecciona un rol y agrega un permiso. Sus permisos actuales se conservan.
        </p>

        <div>
          <label htmlFor="permission-role" className={labelClass}>Rol</label>
          <select
            id="permission-role"
            value={roleId}
            required
            disabled={busy || loadingRoles}
            onChange={event => { setRoleId(event.target.value); setPermissionId(''); setError(''); setSuccess(''); }}
            className={selectClass}
          >
            <option value="">Selecciona un rol</option>
            {roles.map(item => <option key={item.roleId} value={item.roleId}>{item.name || 'Sin nombre'}</option>)}
          </select>
          {!loadingRoles && !roles.length && <p className="mt-2 text-sm text-muted-foreground">Primero crea un rol.</p>}
        </div>

        {role && (
          <div className="rounded-xl border border-border bg-secondary p-4">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Permisos actuales de {role.name}</h3>
            {assigned.length ? (
              <ul className="flex flex-wrap gap-2">
                {assigned.map(item => (
                  <li
                    key={item.permissionId}
                    className="rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground break-all"
                    title={item.name || item.slug}
                  >
                    {item.slug}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Sin permisos asignados.</p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="role-permission" className={labelClass}>Permiso disponible</label>
          <select
            id="role-permission"
            value={permissionId}
            required
            disabled={!role || busy || loading}
            onChange={event => setPermissionId(event.target.value)}
            className={selectClass}
          >
            <option value="">{loading ? 'Cargando permisos...' : 'Selecciona un permiso'}</option>
            {available.map(item => (
              <option key={item.permissionId} value={item.permissionId}>
                {item.slug}{item.name ? ' — ' + item.name : ''}
              </option>
            ))}
          </select>
          {chosen?.description && <p className="mt-2 text-sm text-muted-foreground">{chosen.description}</p>}
          {!loading && !permissions.length && <p className="mt-2 text-sm text-muted-foreground">Primero crea permisos en la pestaña Permisos.</p>}
          {!loading && role && permissions.length > 0 && !available.length && (
            <p className="mt-2 text-sm text-muted-foreground">Este rol ya tiene todos los permisos disponibles.</p>
          )}
        </div>

        {error && (
          <p role="alert" className="p-3 rounded-xl text-xs font-medium border border-uno-terracota/40 bg-uno-terracota/10 text-uno-marron">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="p-3 rounded-xl text-xs font-medium border border-uno-olivo/40 bg-uno-verde text-uno-negro">
            {success}
          </p>
        )}

        <Button
          type="submit"
          variant="default"
          disabled={busy || loading || !role || !chosen}
          className="w-full sm:w-auto min-h-[44px] bg-primary hover:bg-uno-ciruela text-primary-foreground rounded-xl"
        >
          {busy ? 'Asignando...' : 'Asignar permiso'}
        </Button>
      </form>
    </Card>
  );
}