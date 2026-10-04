// src/components/UsersTab.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiFetch, ApiError } from '@/lib/api';

import { createUserSchema, updateUserSchema, type ZodType } from '@shared/contracts';

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

  // Función auxiliar para validar con Zod del paquete compartido
  function validatedBody(schema: ZodType, value: unknown) {
    const result = schema.safeParse(value);
    if (!result.success) {
      throw new Error(result.error.issues.map((issue) => issue.message).join('. '));
    }
    return JSON.stringify(result.data);
  }

  // Cargar usuarios y roles
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

  return (
    <div className="space-y-6">
      {/* 1. Tarjeta de Gestión y Creación/Edición de Usuarios */}
      <Card title={editingUser ? 'Editar Usuario' : 'Gestión de Usuarios'}>
        <form onSubmit={handleCreateOrUpdateUser} className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 space-y-4">
          <h3 className="font-bold text-gray-700">{editingUser ? 'Modificar Usuario' : 'Registrar Nuevo Usuario'}</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de usuario</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
            <input 
              type="email" 
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              required
              className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input 
              type="password" 
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              required={!editingUser}
              placeholder={editingUser ? 'Dejar vacía para conservar la contraseña' : ''}
              className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {selectedAccount && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-800">Roles asignados</h3>
              {selectedAccount.roles?.length ? (
                <ul className="space-y-2">
                  {selectedAccount.roles.map(role => (
                    <li key={role.roleId} className="flex items-center justify-between gap-4">
                      <span className="text-sm text-gray-700">{role.name || 'Sin nombre'}</span>
                      <button type="button" onClick={() => handleRemoveRole(role)}
                        disabled={busy || assignLoading || removingRole !== null}
                        aria-label={`Quitar rol ${role.name || 'sin nombre'}`}
                        className="rounded border border-red-200 px-3 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50">
                        {removingRole === role.roleId ? 'Quitando...' : 'Quitar'}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-gray-500">Sin roles asignados.</p>}
            </div>
          )}
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}

          <div className="flex space-x-2">
            <Button variant="default" type="submit" disabled={busy || removingRole !== null}>
              {busy ? 'Guardando...' : editingUser ? 'Actualizar Usuario' : 'Guardar Usuario'}
            </Button>
            {editingUser && (
              <button
                type="button"
                onClick={cancelEdit}
                disabled={removingRole !== null}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-400"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        {/* Tabla de Usuarios */}
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-sm border-b border-gray-200">
                <th className="p-3">Usuario</th>
                <th className="p-3">Correo</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Roles</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-600">
              {loadingUsers ? (
                <tr><td colSpan={5} className="p-4 text-center text-gray-400">Cargando usuarios...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-gray-400">No hay usuarios registrados.</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.userId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-800">{user.username || 'Sin nombre'}</td>
                    <td className="p-3">{user.email}</td>
                    <td className="p-3">{user.status || 'Activo'}</td>
                    <td className="p-3">{user.roles?.length ? user.roles.map(role => role.name || 'Sin nombre').join(', ') : 'Sin rol asignado'}</td>
                    <td className="p-3 text-center space-x-2">
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
                        className="text-blue-600 hover:underline text-xs font-medium"
                      >
                        Editar
                      </button>
                      <button 
                        disabled={removingRole !== null}
                        onClick={() => handleDelete(user.userId, user.email)} 
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

      {/* 2. Tarjeta de Asignar Rol a Usuario */}
      <Card title="Cambiar rol de usuario">
        <form onSubmit={handleAssignRole} className="space-y-4">
          <p className="text-sm text-gray-600">El rol seleccionado reemplazará todos los roles actuales del usuario.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
            <select
              value={selectedUser}
              onChange={(e) => { setSelectedUser(e.target.value); setSelectedRole(''); setError(''); setSuccess(''); }}
              disabled={assignLoading || removingRole !== null}
              required
              className="w-full border border-gray-300 p-2 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="">Selecciona un usuario</option>
              {users.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.username || u.email}
                </option>
              ))}
            </select>
          </div>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {success && <p role="status" className="text-sm text-green-700">{success}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              required
              className="w-full border border-gray-300 p-2 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="">Selecciona un rol</option>
              {roles.map((r) => (
                <option key={r.roleId} value={r.roleId}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <Button variant="default" type="submit" disabled={assignLoading || removingRole !== null}>
            {assignLoading ? 'Guardando...' : 'Guardar rol'}
          </Button>
        </form>
      </Card>
    </div>
  );
}