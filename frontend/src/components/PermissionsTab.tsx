// src/components/PermissionsTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/lib/api';
import { 
  Shield, 
  Users, 
  KeyRound, 
  CalendarCheck, 
  MapPin, 
  Box, 
  Clock, 
  FileText 
} from 'lucide-react';

interface PermissionItem {
  permissionId: string;
  slug: string;
  name: string | null;
  description: string | null;
}

interface RoleItem {
  roleId: string;
  name: string | null;
  description?: string | null;
  permissions?: { permissionId: string; slug: string }[];
}

// Configuración visual por módulo institucional
const MODULE_CONFIG: Record<string, { label: string; icon: any }> = {
  manage: { label: 'Administración Global', icon: Shield },
  users: { label: 'Usuarios', icon: Users },
  roles: { label: 'Roles y Accesos', icon: KeyRound },
  activities: { label: 'Actividades', icon: CalendarCheck },
  spaces: { label: 'Espacios', icon: MapPin },
  resources: { label: 'Recursos', icon: Box },
  reservations: { label: 'Reservaciones', icon: Clock },
  reports: { label: 'Reportes y Evidencias', icon: FileText },
};

export default function PermissionsTab() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);
  const [assignedPermissionIds, setAssignedPermissionIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // 1. Cargar roles y permisos del backend
  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesRes, permsRes]: [any, any] = await Promise.all([
        apiFetch('/roles'),
        apiFetch('/permissions'),
      ]);

      const rolesList: RoleItem[] = Array.isArray(rolesRes) ? rolesRes : rolesRes.roles;
      const permsList: PermissionItem[] = Array.isArray(permsRes) ? permsRes : permsRes.permissions;

      setRoles(rolesList || []);
      setPermissions(permsList || []);

      if (rolesList && rolesList.length > 0) {
        selectRole(rolesList[0]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 2. Al seleccionar un rol, sincronizar sus permisos asignados
  const selectRole = (role: RoleItem) => {
    setSelectedRole(role);
    const activeIds = role.permissions ? role.permissions.map((p) => p.permissionId) : [];
    setAssignedPermissionIds(activeIds);
    setSuccess('');
    setError('');
  };

  // 3. Conmutar el switch de un permiso
  const togglePermission = (permissionId: string) => {
    setAssignedPermissionIds((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

 // 4. Guardar los permisos calculando agregados y eliminados
  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      // Permisos que el rol ya tenía originalmente
      const initialIds = (selectedRole.permissions || []).map((p) => p.permissionId);

      // Permisos que se activaron nuevos
      const toAdd = assignedPermissionIds.filter((id) => !initialIds.includes(id));

      // Permisos que se desactivaron
      const toRemove = initialIds.filter((id) => !assignedPermissionIds.includes(id));

      // Ejecutar altas y bajas en paralelo usando los endpoints existentes del backend
      await Promise.all([
        ...toAdd.map((permId) =>
          apiFetch(`/roles/${selectedRole.roleId}/permissions/${permId}`, {
            method: 'POST',
          })
        ),
        ...toRemove.map((permId) =>
          apiFetch(`/roles/${selectedRole.roleId}/permissions/${permId}`, {
            method: 'DELETE',
          })
        ),
      ]);

      // Recargar datos actualizados desde el backend para confirmar el estado
      await loadData();

      setSuccess(`¡Permisos de ${selectedRole.name} actualizados exitosamente!`);
      setTimeout(() => setSuccess(''), 3500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar los cambios');
    } finally {
      setBusy(false);
    }
  };

  // 5. Agrupar permisos dinámicamente por prefijo (recurso:accion)
  const groupedPermissions = permissions.reduce<Record<string, PermissionItem[]>>((acc, perm) => {
    const prefix = perm.slug.split(':')[0] || 'otros';
    if (!acc[prefix]) acc[prefix] = [];
    acc[prefix].push(perm);
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Columna Izquierda: Lista de Roles */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Roles del equipo</h2>
          <p className="text-xs text-slate-500 mt-0.5">Define niveles de acceso según las responsabilidades.</p>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="p-6 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
              Cargando roles...
            </div>
          ) : roles.length === 0 ? (
            <div className="p-6 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
              No hay roles registrados.
            </div>
          ) : (
            roles.map((role) => {
              const isSelected = selectedRole?.roleId === role.roleId;
              return (
                <div
                  key={role.roleId}
                  onClick={() => selectRole(role)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white flex items-center justify-between ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-500/10 shadow-sm'
                      : 'border-slate-200/80 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`h-10 w-10 min-w-[40px] rounded-xl flex items-center justify-center font-bold ${
                        isSelected ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{role.name || 'Rol sin nombre'}</h3>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                        {role.description || 'Gestión de accesos institucionales.'}
                      </p>
                      <span className="inline-block mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        CONFIGURACIÓN DE ACCESO
                      </span>
                    </div>
                  </div>
                  <span className="text-slate-400 font-bold">›</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Columna Derecha: Matriz de Permisos */}
      <div className="lg:col-span-7 space-y-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Permisos del rol</p>
            <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
              {selectedRole?.name || 'Selecciona un rol'}
            </h2>
          </div>
          <Button
            onClick={handleSavePermissions}
            disabled={busy || !selectedRole}
            className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm text-sm"
          >
            {busy ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>

        {success && <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl font-medium">{success}</div>}
        {error && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl font-medium">{error}</div>}

        {/* Módulos generados dinámicamente desde el catálogo de la BD */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-8">
          {Object.entries(groupedPermissions).map(([moduleKey, perms]) => {
            const config = MODULE_CONFIG[moduleKey] || { label: moduleKey.toUpperCase(), icon: Shield };
            const Icon = config.icon;

            return (
              <div key={moduleKey} className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm border-b border-slate-100 pb-3">
                  <Icon className="h-4 w-4 text-blue-600" />
                  <span>{config.label}</span>
                </div>

                <div className="space-y-4 pl-2">
                  {perms.map((perm) => {
                    const isChecked = assignedPermissionIds.includes(perm.permissionId);
                    return (
                      <div key={perm.permissionId} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{perm.name || perm.slug}</p>
                          <p className="text-xs text-slate-500">{perm.description || `Permiso: ${perm.slug}`}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(perm.permissionId)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}