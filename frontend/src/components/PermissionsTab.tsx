// src/components/PermissionsTab.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { createPermissionSchema, updatePermissionSchema, type ZodType } from '@shared/contracts';
import { Shield, Users, FolderKanban, Settings } from 'lucide-react';

interface RoleItem {
  roleId: string;
  name: string | null;
  description?: string | null;
}

interface PermissionItem {
  permissionId: string;
  name: string | null;
  slug: string;
  description: string | null;
}

export default function PermissionsTab() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Estados de edición y formulario de permisos (por si los usas en modales o formularios)
  const [editingPermission, setEditingPermission] = useState<string | null>(null);
  const [permissionName, setPermissionName] = useState('');
  const [permissionSlug, setPermissionSlug] = useState('');
  const [permissionDescription, setPermissionDescription] = useState('');

  // Validación con Zod del paquete compartido
  function validatedBody(schema: ZodType, value: unknown) {
    const result = schema.safeParse(value);
    if (!result.success) {
      throw new Error(result.error.issues.map((issue) => issue.message).join('. '));
    }
    return JSON.stringify(result.data);
  }

  // Cargar roles y permisos desde la base de datos
  const fetchPermissionsAndRoles = async () => {
    try {
      setLoading(true);
      const [rolesRes, permsRes]: [any, any] = await Promise.all([
        apiFetch('/roles'),
        apiFetch('/permissions'),
      ]);

      const rolesList = Array.isArray(rolesRes) ? rolesRes : rolesRes.roles;
      const permsList = Array.isArray(permsRes) ? permsRes : permsRes.permissions;

      setRoles(rolesList || []);
      setPermissions(permsList || []);

      if (rolesList && rolesList.length > 0 && !selectedRole) {
        setSelectedRole(rolesList[0]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissionsAndRoles();
  }, []);

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      // Aquí puedes agregar tu lógica de guardado con apiFetch hacia tu backend
      setSuccess('¡Cambios guardados correctamente!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar los permisos');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Columna Izquierda: Roles del equipo */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Roles del equipo</h2>
          <p className="text-xs text-slate-500 mt-0.5">Define niveles de acceso según las responsabilidades.</p>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="p-6 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">Cargando roles...</div>
          ) : roles.length === 0 ? (
            <div className="p-6 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">No hay roles registrados.</div>
          ) : (
            roles.map((role) => {
              const isSelected = selectedRole?.roleId === role.roleId;
              return (
                <div
                  key={role.roleId}
                  onClick={() => setSelectedRole(role)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white flex items-center justify-between ${
                    isSelected 
                      ? 'border-blue-500 ring-2 ring-blue-500/10 shadow-sm' 
                      : 'border-slate-200/80 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`h-10 w-10 min-w-[40px] rounded-xl flex items-center justify-center font-bold ${
                      isSelected ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{role.name || 'Rol sin nombre'}</h3>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{role.description || 'Gestión de accesos y operaciones del espacio.'}</p>
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

      {/* Columna Derecha: Permisos del Rol Seleccionado */}
      <div className="lg:col-span-7 space-y-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Permisos del rol</p>
            <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">{selectedRole?.name || 'Selecciona un rol'}</h2>
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

        {/* Bloques de Permisos agrupados por categoría con interruptores */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          
          {/* Categoría: Usuarios */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm border-b border-slate-100 pb-3">
              <Users className="h-4 w-4 text-blue-600" />
              <span>Usuarios</span>
            </div>

            <div className="space-y-4 pl-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Ver usuarios</p>
                  <p className="text-xs text-slate-500">Consultar el directorio y los perfiles.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Crear usuarios</p>
                  <p className="text-xs text-slate-500">Invitar y dar de alta nuevos miembros.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Categoría: Contenido */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm border-b border-slate-100 pb-3">
              <FolderKanban className="h-4 w-4 text-blue-600" />
              <span>Contenido</span>
            </div>

            <div className="space-y-4 pl-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Ver contenido</p>
                  <p className="text-xs text-slate-500">Consultar proyectos y recursos.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Categoría: Configuración */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm border-b border-slate-100 pb-3">
              <Settings className="h-4 w-4 text-blue-600" />
              <span>Configuración</span>
            </div>

            <div className="space-y-4 pl-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Ver configuración</p>
                  <p className="text-xs text-slate-500">Consultar preferencias del espacio.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}