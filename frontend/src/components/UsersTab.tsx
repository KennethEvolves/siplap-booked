// src/components/UsersTab.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
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

// Estilos compartidos (text-base en móvil evita el zoom de iOS al enfocar un campo)
const fieldClass =
  'w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-input bg-background text-base sm:text-sm text-foreground ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';
const labelClass = 'block text-xs font-semibold text-muted-foreground mb-1.5';
const errorBox =
  'p-3 rounded-xl text-xs font-medium border border-uno-terracota/40 bg-uno-terracota/10 text-uno-marron';
const successBox =
  'p-3 rounded-xl text-xs font-medium border border-uno-olivo/40 bg-uno-verde text-uno-negro';

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

  const startEdit = (user: UserItem) => {
    setError('');
    setSuccess('');
    setEditingUser(user.userId);
    setUsername(user.username || '');
    setUserEmail(user.email);
    setUserPassword('');
    window.scrollTo({ top: 0, behavior: 'smooth' }); // en móvil el formulario queda arriba
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

  // Piezas que se repiten en la tabla (escritorio) y en las tarjetas (móvil)
  const renderStatus = (user: UserItem) => (
    <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
      <span className="h-2 w-2 rounded-full bg-uno-olivo"></span>
      {user.status || 'Activo'}
    </span>
  );

  const renderRoles = (user: UserItem) => (
    <span className="inline-block px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-medium border border-border">
      {user.roles?.length ? user.roles.map(role => role.name || 'Sin nombre').join(', ') : 'Sin rol asignado'}
    </span>
  );

  const rowBtn =
    'text-xs font-semibold hover:underline disabled:opacity-50 min-h-[40px] px-3 rounded-lg border md:border-0 md:min-h-0 md:px-0';

  const renderRowActions = (user: UserItem) => (
    <div className="flex items-center gap-2 md:justify-end md:gap-3">
      <button
        disabled={removingRole !== null}
        onClick={() => startEdit(user)}
        className={`${rowBtn} text-primary border-primary/40`}
      >
        Editar
      </button>
      <button
        disabled={removingRole !== null}
        onClick={() => handleDelete(user.userId, user.email)}
        className={`${rowBtn} text-uno-terracota border-uno-terracota/50`}
      >
        Eliminar
      </button>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* 1. Tarjeta de Gestión y Creación/Edición de Usuarios */}
      <div className="bg-card p-4 md:p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <UserPlus className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground">
              {editingUser ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {editingUser ? 'Modifica los datos del usuario seleccionado.' : 'Crea las credenciales iniciales para una nueva persona.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateOrUpdateUser} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Nombre de usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Ej. Juan Pérez"
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Correo electrónico</label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                required
                placeholder="nombre@empresa.com"
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Contraseña</label>
              <input
                type="password"
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                required={!editingUser}
                placeholder={editingUser ? 'Dejar vacía para conservar' : 'Mínimo 8 caracteres'}
                className={fieldClass}
              />
            </div>
          </div>

          {selectedAccount && (
            <div className="rounded-xl border border-border bg-secondary p-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-foreground">Roles asignados</h3>
              {selectedAccount.roles?.length ? (
                <ul className="space-y-2">
                  {selectedAccount.roles.map(role => (
                    <li key={role.roleId} className="flex items-center justify-between gap-4 bg-card p-2.5 rounded-lg border border-border">
                      <span className="text-sm font-medium text-foreground min-w-0 break-words">{role.name || 'Sin nombre'}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRole(role)}
                        disabled={busy || assignLoading || removingRole !== null}
                        className="shrink-0 min-h-[36px] rounded-lg border border-uno-terracota/50 px-3 py-1 text-xs font-semibold text-uno-terracota hover:bg-uno-terracota/10 disabled:opacity-50 transition-colors"
                      >
                        {removingRole === role.roleId ? 'Quitando...' : 'Quitar'}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-muted-foreground">Sin roles asignados.</p>}
            </div>
          )}

          {error && <p role="alert" className={errorBox}>{error}</p>}
          {success && <p role="status" className={successBox}>{success}</p>}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            {editingUser && (
              <button
                type="button"
                onClick={cancelEdit}
                disabled={removingRole !== null}
                className="min-h-[44px] px-4 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
            )}
            <Button
              type="submit"
              disabled={busy || removingRole !== null}
              className="min-h-[44px] bg-primary hover:bg-uno-ciruela text-primary-foreground rounded-xl shadow-sm"
            >
              {busy ? 'Guardando...' : editingUser ? 'Actualizar Usuario' : 'Guardar Usuario'}
            </Button>
          </div>
        </form>
      </div>

      {/* 2. Barra de búsqueda */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nombre o correo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`${fieldClass} pl-10 pr-4 bg-card`}
        />
      </div>

      {/* 3. Usuarios */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Escritorio y tablet horizontal: tabla */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider bg-secondary/70">
                <th className="py-3.5 px-6">Usuario</th>
                <th className="py-3.5 px-6">Correo</th>
                <th className="py-3.5 px-6">Estado</th>
                <th className="py-3.5 px-6">Roles</th>
                <th className="py-3.5 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {loadingUsers ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">Cargando usuarios...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">No hay usuarios registrados.</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.userId} className="hover:bg-secondary/50 transition-colors">
                    <td className="py-4 px-6 font-semibold text-foreground">{user.username || 'Sin nombre'}</td>
                    <td className="py-4 px-6 text-muted-foreground text-xs">{user.email}</td>
                    <td className="py-4 px-6">{renderStatus(user)}</td>
                    <td className="py-4 px-6">{renderRoles(user)}</td>
                    <td className="py-4 px-6 text-right">{renderRowActions(user)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Móvil: tarjetas apiladas */}
        <div className="md:hidden divide-y divide-border">
          {loadingUsers ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Cargando usuarios...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No hay usuarios registrados.</p>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.userId} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground break-words">{user.username || 'Sin nombre'}</p>
                    <p className="text-xs text-muted-foreground break-all">{user.email}</p>
                  </div>
                  <div className="shrink-0">{renderStatus(user)}</div>
                </div>
                <div>{renderRoles(user)}</div>
                {renderRowActions(user)}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. Tarjeta de Asignar Rol a Usuario */}
      <div className="bg-card p-4 md:p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground">Cambiar rol de usuario</h2>
            <p className="text-xs text-muted-foreground">El rol seleccionado reemplazará todos los roles actuales del usuario.</p>
          </div>
        </div>

        <form onSubmit={handleAssignRole} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Usuario</label>
              <select
                value={selectedUser}
                onChange={(e) => { setSelectedUser(e.target.value); setSelectedRole(''); setError(''); setSuccess(''); }}
                disabled={assignLoading || removingRole !== null}
                required
                className={fieldClass}
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
              <label className={labelClass}>Rol</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                required
                className={fieldClass}
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

          {error && <p role="alert" className={errorBox}>{error}</p>}
          {success && <p role="status" className={successBox}>{success}</p>}

          <div className="flex sm:justify-end">
            <Button
              type="submit"
              disabled={assignLoading || removingRole !== null}
              className="w-full sm:w-auto min-h-[44px] bg-primary hover:bg-uno-ciruela text-primary-foreground rounded-xl shadow-sm"
            >
              {assignLoading ? 'Guardando...' : 'Guardar rol'}
            </Button>
          </div>
        </form>
      </div>

    </div>
  );
}