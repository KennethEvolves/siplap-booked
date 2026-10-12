// src/components/UsersTab.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { createUserSchema, updateUserSchema, type ZodType } from '@shared/contracts';
import { UserPlus, ShieldCheck, Search } from 'lucide-react';

interface UserItem {
  userId: string;
  username: string | null;
  email: string;
  status: string | null;
  roles: RoleItem[];
}

interface RoleItem {
  roleId: string;
  name: string | null;
}

async function loadUserData() {
  const [users, roles] = await Promise.all([
    apiFetch<{ users: UserItem[] } | UserItem[]>('/users'),
    apiFetch<{ roles: RoleItem[] } | RoleItem[]>('/roles'),
  ]);
  return { users: Array.isArray(users) ? users : users.users, roles: Array.isArray(roles) ? roles : roles.roles };
}

export default function UsersTab() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [busy, setBusy] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados del formulario y edición
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');

  // Estados para la tarjeta de "Asignar rol a usuario"
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [removingRole, setRemovingRole] = useState<string | null>(null);
  const selectedAccount = users.find(user => user.userId === editingUser);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function validatedBody(schema: ZodType, value: unknown) {
    const result = schema.safeParse(value);
    if (!result.success) {
      throw new Error(result.error.issues.map((issue) => issue.message).join('. '));
    }
    return JSON.stringify(result.data);
  }

  const fetchData = async () => {
    try {
      const data = await loadUserData();
      setUsers(data.users);
      setRoles(data.roles);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los usuarios');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    let active = true;
    loadUserData().then(data => {
      if (active) { setUsers(data.users); setRoles(data.roles); }
    }).catch((error: unknown) => {
      if (active) setError(error instanceof Error ? error.message : 'No se pudieron cargar los usuarios');
    }).finally(() => { if (active) setLoadingUsers(false); });
    return () => { active = false; };
  }, []);

  const cancelEdit = () => {
    setEditingUser(null);
    setUsername('');
    setUserEmail('');
    setUserPassword('');
  };

  const handleCreateOrUpdateUser = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setBusy(true);

    try {
      const bodyData = validatedBody(
        editingUser ? updateUserSchema : createUserSchema,
        {
          username,
          email: userEmail,
          ...(!editingUser || userPassword ? { password: userPassword } : {}),
        }
      );

      await apiFetch(editingUser ? `/users/${editingUser}` : '/users', {
        method: editingUser ? 'PATCH' : 'POST',
        body: bodyData,
      });

      setSuccess(editingUser ? '¡Usuario actualizado con éxito!' : '¡Usuario creado con éxito!');
      cancelEdit();
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar el usuario');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string, email: string) => {
    if (confirm(`¿Estás seguro de eliminar a ${email}?`)) {
      try {
        await apiFetch(`/users/${id}`, { method: 'DELETE' });
        if (editingUser === id) cancelEdit();
        fetchData();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'No se pudo eliminar');
      }
    }
  };

  const handleAssignRole = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !selectedRole) {
      alert('Por favor selecciona un usuario y un rol.');
      return;
    }

    setError('');
    setSuccess('');
    try {
      setAssignLoading(true);
      await apiFetch(`/users/${selectedUser}/roles/${selectedRole}`, {
        method: 'PUT',
      });
      setSuccess('¡Rol actualizado correctamente! Los roles anteriores fueron reemplazados.');
      await fetchData();
      setSelectedUser('');
      setSelectedRole('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al asignar el rol');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRemoveRole = async (role: RoleItem) => {
    if (!selectedAccount) return;
    setError('');
    setSuccess('');
    setRemovingRole(role.roleId);
    try {
      await apiFetch(`/users/${selectedAccount.userId}/roles/${role.roleId}`, { method: 'DELETE' });
      setSuccess(`Rol ${role.name || 'seleccionado'} quitado correctamente.`);
      await fetchData();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'No se pudo quitar el rol');
    } finally { setRemovingRole(null); }
  };

  const filteredUsers = users.filter(user => 
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* 1. Tarjeta de Gestión y Creación/Edición de Usuarios */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {editingUser ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}
            </h2>
            <p className="text-xs text-slate-500">
              {editingUser ? 'Modifica los datos del usuario seleccionado.' : 'Crea las credenciales iniciales para una nueva persona.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateOrUpdateUser} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nombre de usuario</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Ej. Juan Pérez"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Correo electrónico</label>
              <input 
                type="email" 
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                required
                placeholder="nombre@empresa.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Contraseña</label>
              <input 
                type="password" 
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                required={!editingUser}
                placeholder={editingUser ? 'Dejar vacía para conservar' : 'Mínimo 8 caracteres'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {selectedAccount && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">Roles asignados</h3>
              {selectedAccount.roles?.length ? (
                <ul className="space-y-2">
                  {selectedAccount.roles.map(role => (
                    <li key={role.roleId} className="flex items-center justify-between gap-4 bg-white p-2.5 rounded-lg border border-slate-200/60">
                      <span className="text-sm font-medium text-slate-700">{role.name || 'Sin nombre'}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveRole(role)}
                        disabled={busy || assignLoading || removingRole !== null}
                        className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition-colors"
                      >
                        {removingRole === role.roleId ? 'Quitando...' : 'Quitar'}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-slate-400">Sin roles asignados.</p>}
            </div>
          )}

          {error && <p className="text-rose-600 text-xs font-medium">{error}</p>}
          {success && <p className="text-emerald-600 text-xs font-medium">{success}</p>}

          <div className="flex justify-end gap-2 pt-2">
            {editingUser && (
              <button
                type="button"
                onClick={cancelEdit}
                disabled={removingRole !== null}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
            )}
            <Button type="submit" disabled={busy || removingRole !== null} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm">
              {busy ? 'Guardando...' : editingUser ? 'Actualizar Usuario' : 'Guardar Usuario'}
            </Button>
          </div>
        </form>
      </div>

      {/* 2. Barra de búsqueda */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por nombre o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* 3. Tabla de Usuarios */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3.5 px-6">Usuario</th>
                <th className="py-3.5 px-6">Correo</th>
                <th className="py-3.5 px-6">Estado</th>
                <th className="py-3.5 px-6">Roles</th>
                <th className="py-3.5 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loadingUsers ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">Cargando usuarios...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">No hay usuarios registrados.</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.userId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-900">
                      {user.username || 'Sin nombre'}
                    </td>
                    <td className="py-4 px-6 text-slate-500 text-xs">
                      {user.email}
                    </td>
                    <td className="py-4 px-6">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                        {user.status || 'Activo'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200/60">
                        {user.roles?.length ? user.roles.map(role => role.name || 'Sin nombre').join(', ') : 'Sin rol asignado'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-3">
                      <button 
                        disabled={removingRole !== null}
                        onClick={() => {
                          setError('');
                          setSuccess('');
                          setEditingUser(user.userId);
                          setUsername(user.username || '');
                          setUserEmail(user.email);
                          setUserPassword('');
                        }} 
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Editar
                      </button>
                      <button 
                        disabled={removingRole !== null}
                        onClick={() => handleDelete(user.userId, user.email)} 
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

      {/* 4. Tarjeta de Asignar Rol a Usuario */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Cambiar rol de usuario</h2>
            <p className="text-xs text-slate-500">El rol seleccionado reemplazará todos los roles actuales del usuario.</p>
          </div>
        </div>

        <form onSubmit={handleAssignRole} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Usuario</label>
              <select
                value={selectedUser}
                onChange={(e) => { setSelectedUser(e.target.value); setSelectedRole(''); setError(''); setSuccess(''); }}
                disabled={assignLoading || removingRole !== null}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
              >
                <option value="">Selecciona un usuario</option>
                {users.map((u) => (
                  <option key={u.userId} value={u.userId}>
                    {u.username || u.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Rol</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
              >
                <option value="">Selecciona un rol</option>
                {roles.map((r) => (
                  <option key={r.roleId} value={r.roleId}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p role="alert" className="text-rose-600 text-xs font-medium">{error}</p>}
          {success && <p role="status" className="text-emerald-600 text-xs font-medium">{success}</p>}

          <div className="flex justify-end">
            <Button type="submit" disabled={assignLoading || removingRole !== null} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm">
              {assignLoading ? 'Guardando...' : 'Guardar rol'}
            </Button>
          </div>
        </form>
      </div>

    </div>
  );
}