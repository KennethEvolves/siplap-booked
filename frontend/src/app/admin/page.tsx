'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

import {
  createUserSchema,
  createRoleSchema,
  createPermissionSchema,
  updateUserSchema,
  updateRoleSchema,
  updatePermissionSchema,
  type ZodType,
} from '@shared/contracts';
import { useRouter } from 'next/navigation';

import { ApiError, apiFetch, removeToken } from '../../lib/api';

interface UserItem {
  userId: string;
  username: string | null;
  email: string;
  status: string | null;
}

interface RoleItem {
  roleId: string;
  name: string | null;
  description: string | null;
}

interface PermissionItem {
  permissionId: string;
  name: string | null;
  slug: string;
  description: string | null;
}

export default function AdminPage() {
  const router = useRouter();
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editingPermission, setEditingPermission] = useState<string | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  function validatedBody(schema: ZodType, value: unknown) {
    const result = schema.safeParse(value);
    if (!result.success)
      throw new Error(
        result.error.issues.map((issue) => issue.message).join('. '),
      );
    return JSON.stringify(result.data);
  }
  async function submit(
    event: FormEvent<HTMLFormElement>,
    action: (event: FormEvent<HTMLFormElement>) => Promise<void>,
  ) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await action(event);
    } finally {
      setBusy(false);
    }
  }
  function cancelUser() {
    setEditingUser(null);
    setUsername('');
    setUserEmail('');
    setUserPassword('');
  }
  function cancelRole() {
    setEditingRole(null);
    setRoleName('');
    setRoleDescription('');
  }
  function cancelPermission() {
    setEditingPermission(null);
    setPermissionName('');
    setPermissionSlug('');
    setPermissionDescription('');
  }
  async function deleteItem(
    resource: 'users' | 'roles' | 'permissions',
    id: string,
    name: string,
  ) {
    if (
      busy ||
      !window.confirm(
        '¿Eliminar "' + name + '"? Se quitarán también sus asignaciones.',
      )
    )
      return;
    clearMessages();
    setBusy(true);
    try {
      await apiFetch('/' + resource + '/' + id, { method: 'DELETE' });
      if (resource === 'users') {
        if (editingUser === id) cancelUser();
        setAssignUserId('');
      }
      if (resource === 'roles') {
        if (editingRole === id) cancelRole();
        setAssignRoleId('');
        setPermissionRoleId('');
      }
      if (resource === 'permissions') {
        if (editingPermission === id) cancelPermission();
        setAssignPermissionId('');
      }
      setMessage('Registro eliminado correctamente');
      await loadData();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo eliminar');
    } finally {
      setBusy(false);
    }
  }

  const [users, setUsers] = useState<UserItem[]>([]);

  const [roles, setRoles] = useState<RoleItem[]>([]);

  const [permissions, setPermissions] = useState<PermissionItem[]>([]);

  const [loadingData, setLoadingData] = useState(true);

  const [message, setMessage] = useState('');

  const [error, setError] = useState('');

  // ======================
  // {editingUser ? 'Editar usuario' : 'Crear usuario'}
  // ======================

  const [username, setUsername] = useState('');

  const [userEmail, setUserEmail] = useState('');

  const [userPassword, setUserPassword] = useState('');

  // ======================
  // {editingRole ? 'Editar rol' : 'Crear rol'}
  // ======================

  const [roleName, setRoleName] = useState('');

  const [roleDescription, setRoleDescription] = useState('');

  // ======================
  // {editingPermission ? 'Editar permiso' : 'Crear permiso'}
  // ======================

  const [permissionName, setPermissionName] = useState('');

  const [permissionSlug, setPermissionSlug] = useState('');

  const [permissionDescription, setPermissionDescription] = useState('');

  // ======================
  // Asignar rol
  // ======================

  const [assignUserId, setAssignUserId] = useState('');

  const [assignRoleId, setAssignRoleId] = useState('');

  // ======================
  // Asignar permiso
  // ======================

  const [permissionRoleId, setPermissionRoleId] = useState('');

  const [assignPermissionId, setAssignPermissionId] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoadingData(true);

      const [usersResponse, rolesResponse, permissionsResponse] =
        await Promise.all([
          apiFetch<{
            users: UserItem[];
          }>('/users'),

          apiFetch<{
            roles: RoleItem[];
          }>('/roles'),

          apiFetch<{
            permissions: PermissionItem[];
          }>('/permissions'),
        ]);

      setUsers(usersResponse.users);

      setRoles(rolesResponse.roles);

      setPermissions(permissionsResponse.permissions);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        removeToken();

        router.replace('/login');

        return;
      }

      setError(
        error instanceof Error
          ? error.message
          : 'No se pudo cargar la información',
      );
    } finally {
      setLoadingData(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function clearMessages() {
    setMessage('');
    setError('');
  }

  function showResult(result: unknown) {
    setMessage(
      typeof result === 'object' && result !== null && 'message' in result
        ? String(result.message)
        : 'Operación completada',
    );
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    clearMessages();

    try {
      const result = await apiFetch(
        editingUser ? `/users/${editingUser}` : '/users',

        {
          method: editingUser ? 'PATCH' : 'POST',

          body: validatedBody(
            editingUser ? updateUserSchema : createUserSchema,
            {
              username,

              email: userEmail,

              ...(!editingUser || userPassword
                ? { password: userPassword }
                : {}),
            },
          ),
        },
      );

      showResult(result);
      setEditingUser(null);

      setUsername('');
      setUserEmail('');
      setUserPassword('');

      await loadData();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Error al crear usuario',
      );
    }
  }

  async function createRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    clearMessages();

    try {
      const result = await apiFetch(
        editingRole ? `/roles/${editingRole}` : '/roles',

        {
          method: editingRole ? 'PATCH' : 'POST',

          body: validatedBody(
            editingRole ? updateRoleSchema : createRoleSchema,
            {
              name: roleName,

              description: roleDescription,
            },
          ),
        },
      );

      showResult(result);
      setEditingRole(null);

      setRoleName('');
      setRoleDescription('');

      await loadData();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al crear rol');
    }
  }

  async function createPermission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    clearMessages();

    try {
      const result = await apiFetch(
        editingPermission
          ? `/permissions/${editingPermission}`
          : '/permissions',

        {
          method: editingPermission ? 'PATCH' : 'POST',

          body: validatedBody(
            editingPermission ? updatePermissionSchema : createPermissionSchema,
            {
              name: permissionName,

              slug: permissionSlug,

              description: permissionDescription,
            },
          ),
        },
      );

      showResult(result);
      setEditingPermission(null);

      setPermissionName('');
      setPermissionSlug('');
      setPermissionDescription('');

      await loadData();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Error al crear permiso',
      );
    }
  }

  async function assignRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    clearMessages();

    if (!assignUserId || !assignRoleId) {
      setError('Selecciona un usuario y un rol');

      return;
    }

    try {
      const result = await apiFetch(
        `/users/${assignUserId}/roles/${assignRoleId}`,

        {
          method: 'POST',
        },
      );

      showResult(result);

      setAssignUserId('');
      setAssignRoleId('');

      await loadData();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al asignar rol');
    }
  }

  async function assignPermission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    clearMessages();

    if (!permissionRoleId || !assignPermissionId) {
      setError('Selecciona un rol y un permiso');

      return;
    }

    try {
      const result = await apiFetch(
        `/roles/${permissionRoleId}/permissions/${assignPermissionId}`,

        {
          method: 'POST',
        },
      );

      showResult(result);

      setPermissionRoleId('');

      setAssignPermissionId('');

      await loadData();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Error al asignar permiso',
      );
    }
  }

  function logout() {
    removeToken();

    router.replace('/login');
  }

  const cardStyle = {
    background: '#fff',

    border: '1px solid #e5e7eb',

    borderRadius: '14px',

    padding: '20px',

    boxShadow: '0 4px 12px rgba(0,0,0,.04)',
  };

  const inputStyle = {
    width: '100%',

    boxSizing: 'border-box' as const,

    padding: '10px',

    marginTop: '5px',

    marginBottom: '12px',

    border: '1px solid #d1d5db',

    borderRadius: '8px',
  };

  const buttonStyle = {
    border: 'none',

    background: '#111827',

    color: '#fff',

    padding: '10px 16px',

    borderRadius: '8px',

    cursor: 'pointer',

    fontWeight: 'bold' as const,
  };

  return (
    <main
      style={{
        minHeight: '100vh',

        background: '#f3f4f6',

        padding: '30px',

        fontFamily: 'Arial, sans-serif',
      }}
    >
      <header
        style={{
          display: 'flex',

          justifyContent: 'space-between',

          alignItems: 'center',

          marginBottom: '30px',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
            }}
          >
            Panel SUPERUSUARIO
          </h1>

          <p
            style={{
              color: '#6b7280',
            }}
          >
            Administración SIPLAP
          </p>
        </div>

        <button
          onClick={logout}
          style={{
            ...buttonStyle,

            background: '#dc2626',
          }}
        >
          Cerrar sesión
        </button>
      </header>

      {loadingData && <p>Cargando información...</p>}

      <section
        style={{
          display: 'grid',

          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',

          gap: '20px',

          marginBottom: '30px',
        }}
      >
        {/* CREAR USUARIO */}

        <form
          id="form-usuario"
          onSubmit={(event) => submit(event, createUser)}
          style={cardStyle}
        >
          <h2>{editingUser ? 'Editar usuario' : 'Crear usuario'}</h2>

          <label>Nombre</label>

          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={inputStyle}
          />

          <label>Correo</label>

          <input
            type="email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            required
            style={inputStyle}
          />

          <label>Contraseña</label>

          <input
            type="password"
            value={userPassword}
            onChange={(e) => setUserPassword(e.target.value)}
            required={!editingUser}
            minLength={8}
            placeholder={
              editingUser ? 'Dejar vacía para conservar la contraseña' : ''
            }
            style={inputStyle}
          />

          <button
            type="submit"
            disabled={busy || loadingData}
            style={buttonStyle}
          >
            {editingUser ? 'Guardar cambios' : 'Crear usuario'}
          </button>
          {editingUser && (
            <button
              type="button"
              disabled={busy}
              style={{ ...buttonStyle, marginLeft: 8 }}
              onClick={cancelUser}
            >
              Cancelar edición
            </button>
          )}
        </form>

        {/* CREAR ROL */}

        <form
          id="form-rol"
          onSubmit={(event) => submit(event, createRole)}
          style={cardStyle}
        >
          <h2>{editingRole ? 'Editar rol' : 'Crear rol'}</h2>

          <label>Nombre</label>

          <input
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            required
            style={inputStyle}
          />

          <label>Descripción</label>

          <textarea
            value={roleDescription}
            onChange={(e) => setRoleDescription(e.target.value)}
            style={{
              ...inputStyle,
              minHeight: '80px',
            }}
          />

          <button
            type="submit"
            disabled={busy || loadingData}
            style={buttonStyle}
          >
            {editingRole ? 'Guardar cambios' : 'Crear rol'}
          </button>
          {editingRole && (
            <button
              type="button"
              disabled={busy}
              style={{ ...buttonStyle, marginLeft: 8 }}
              onClick={cancelRole}
            >
              Cancelar edición
            </button>
          )}
        </form>

        {/* CREAR PERMISO */}

        <form
          id="form-permiso"
          onSubmit={(event) => submit(event, createPermission)}
          style={cardStyle}
        >
          <h2>{editingPermission ? 'Editar permiso' : 'Crear permiso'}</h2>

          <label>Nombre</label>

          <input
            value={permissionName}
            onChange={(e) => setPermissionName(e.target.value)}
            style={inputStyle}
          />

          <label>Slug</label>

          <input
            placeholder="users.create"
            value={permissionSlug}
            onChange={(e) => setPermissionSlug(e.target.value)}
            required
            style={inputStyle}
          />

          <label>Descripción</label>

          <textarea
            value={permissionDescription}
            onChange={(e) => setPermissionDescription(e.target.value)}
            style={{
              ...inputStyle,

              minHeight: '70px',
            }}
          />

          <button
            type="submit"
            disabled={busy || loadingData}
            style={buttonStyle}
          >
            {editingPermission ? 'Guardar cambios' : 'Crear permiso'}
          </button>
          {editingPermission && (
            <button
              type="button"
              disabled={busy}
              style={{ ...buttonStyle, marginLeft: 8 }}
              onClick={cancelPermission}
            >
              Cancelar edición
            </button>
          )}
        </form>
      </section>

      {/* ASIGNACIONES */}

      <section
        style={{
          display: 'grid',

          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',

          gap: '20px',

          marginBottom: '30px',
        }}
      >
        <form onSubmit={(event) => submit(event, assignRole)} style={cardStyle}>
          <h2>Asignar rol a usuario</h2>

          <label>Usuario</label>

          <select
            value={assignUserId}
            onChange={(e) => setAssignUserId(e.target.value)}
            style={inputStyle}
          >
            <option value="">Selecciona un usuario</option>

            {users.map((user) => (
              <option key={user.userId} value={user.userId}>
                {user.username ?? 'Sin nombre'} — {user.email}
              </option>
            ))}
          </select>

          <label>Rol</label>

          <select
            value={assignRoleId}
            onChange={(e) => setAssignRoleId(e.target.value)}
            style={inputStyle}
          >
            <option value="">Selecciona un rol</option>

            {roles.map((role) => (
              <option key={role.roleId} value={role.roleId}>
                {role.name ?? 'Sin nombre'}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={busy || loadingData}
            style={buttonStyle}
          >
            Asignar rol
          </button>
        </form>

        <form
          onSubmit={(event) => submit(event, assignPermission)}
          style={cardStyle}
        >
          <h2>Asignar permiso a rol</h2>

          <label>Rol</label>

          <select
            value={permissionRoleId}
            onChange={(e) => setPermissionRoleId(e.target.value)}
            style={inputStyle}
          >
            <option value="">Selecciona un rol</option>

            {roles.map((role) => (
              <option key={role.roleId} value={role.roleId}>
                {role.name ?? 'Sin nombre'}
              </option>
            ))}
          </select>

          <label>Permiso</label>

          <select
            value={assignPermissionId}
            onChange={(e) => setAssignPermissionId(e.target.value)}
            style={inputStyle}
          >
            <option value="">Selecciona un permiso</option>

            {permissions.map((permission) => (
              <option
                key={permission.permissionId}
                value={permission.permissionId}
              >
                {permission.name ?? 'Sin nombre'} — {permission.slug}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={busy || loadingData}
            style={buttonStyle}
          >
            Asignar permiso
          </button>
        </form>
      </section>

      {/* RESULTADO */}

      {(message || error) && (
        <section
          style={{
            ...cardStyle,

            marginBottom: '30px',
          }}
        >
          <h2>Resultado</h2>

          {error && (
            <div
              role="alert"
              style={{
                color: '#991b1b',

                background: '#fee2e2',

                padding: '12px',

                borderRadius: '8px',
              }}
            >
              {error}
            </div>
          )}

          {message && (
            <pre
              role="status"
              style={{
                background: '#111827',

                color: '#f9fafb',

                padding: '15px',

                borderRadius: '8px',

                overflowX: 'auto',
              }}
            >
              {message}
            </pre>
          )}
        </section>
      )}

      {/* TABLA USUARIOS */}

      <section
        style={{
          ...cardStyle,

          marginBottom: '25px',

          overflowX: 'auto',
        }}
      >
        <h2>Usuarios</h2>

        <table
          style={{
            width: '100%',

            borderCollapse: 'collapse',
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'left',

                  padding: '10px',

                  borderBottom: '1px solid #ddd',
                }}
              >
                Usuario
              </th>

              <th
                style={{
                  textAlign: 'left',

                  padding: '10px',

                  borderBottom: '1px solid #ddd',
                }}
              >
                Correo
              </th>

              <th
                style={{
                  textAlign: 'left',

                  padding: '10px',

                  borderBottom: '1px solid #ddd',
                }}
              >
                Estado
              </th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr key={user.userId}>
                <td
                  style={{
                    padding: '10px',

                    borderBottom: '1px solid #eee',
                  }}
                >
                  {user.username ?? 'Sin nombre'}
                </td>

                <td
                  style={{
                    padding: '10px',

                    borderBottom: '1px solid #eee',
                  }}
                >
                  {user.email}
                </td>

                <td
                  style={{
                    padding: '10px',

                    borderBottom: '1px solid #eee',
                  }}
                >
                  {user.status ?? 'Sin estado'}
                </td>
                <td style={{ padding: 10, whiteSpace: 'nowrap' }}>
                  <button
                    type="button"
                    disabled={busy || loadingData}
                    style={buttonStyle}
                    aria-label={'Editar ' + user.email}
                    onClick={() => {
                      clearMessages();
                      setEditingUser(user.userId);
                      setUsername(user.username ?? '');
                      setUserEmail(user.email);
                      setUserPassword('');
                      document
                        .getElementById('form-usuario')
                        ?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={busy || loadingData}
                    style={{
                      ...buttonStyle,
                      background: '#dc2626',
                      marginLeft: 8,
                    }}
                    aria-label={'Eliminar ' + user.email}
                    onClick={() => deleteItem('users', user.userId, user.email)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* TABLA ROLES */}

      <section
        style={{
          ...cardStyle,

          marginBottom: '25px',

          overflowX: 'auto',
        }}
      >
        <h2>Roles</h2>

        <table
          style={{
            width: '100%',

            borderCollapse: 'collapse',
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'left',

                  padding: '10px',
                }}
              >
                Rol
              </th>

              <th
                style={{
                  textAlign: 'left',

                  padding: '10px',
                }}
              >
                Descripción
              </th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {roles.map((role) => (
              <tr key={role.roleId}>
                <td
                  style={{
                    padding: '10px',

                    borderTop: '1px solid #eee',
                  }}
                >
                  {role.name ?? 'Sin nombre'}
                </td>

                <td
                  style={{
                    padding: '10px',

                    borderTop: '1px solid #eee',
                  }}
                >
                  {role.description ?? '-'}
                </td>
                <td style={{ padding: 10, whiteSpace: 'nowrap' }}>
                  <button
                    type="button"
                    disabled={busy || loadingData}
                    style={buttonStyle}
                    aria-label={'Editar ' + (role.name ?? 'Rol')}
                    onClick={() => {
                      clearMessages();
                      setEditingRole(role.roleId);
                      setRoleName(role.name ?? '');
                      setRoleDescription(role.description ?? '');
                      document
                        .getElementById('form-rol')
                        ?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={
                      busy || loadingData || role.name === 'SUPERUSUARIO'
                    }
                    style={{
                      ...buttonStyle,
                      background: '#dc2626',
                      marginLeft: 8,
                    }}
                    aria-label={'Eliminar ' + (role.name ?? 'Rol')}
                    onClick={() =>
                      deleteItem('roles', role.roleId, role.name ?? 'Rol')
                    }
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* TABLA PERMISOS */}

      <section
        style={{
          ...cardStyle,

          overflowX: 'auto',
        }}
      >
        <h2>Permisos</h2>

        <table
          style={{
            width: '100%',

            borderCollapse: 'collapse',
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'left',

                  padding: '10px',
                }}
              >
                Permiso
              </th>

              <th
                style={{
                  textAlign: 'left',

                  padding: '10px',
                }}
              >
                Slug
              </th>

              <th
                style={{
                  textAlign: 'left',

                  padding: '10px',
                }}
              >
                Descripción
              </th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {permissions.map((permission) => (
              <tr key={permission.permissionId}>
                <td
                  style={{
                    padding: '10px',

                    borderTop: '1px solid #eee',
                  }}
                >
                  {permission.name ?? 'Sin nombre'}
                </td>

                <td
                  style={{
                    padding: '10px',

                    borderTop: '1px solid #eee',
                  }}
                >
                  {permission.slug}
                </td>

                <td
                  style={{
                    padding: '10px',

                    borderTop: '1px solid #eee',
                  }}
                >
                  {permission.description ?? '-'}
                </td>
                <td style={{ padding: 10, whiteSpace: 'nowrap' }}>
                  <button
                    type="button"
                    disabled={busy || loadingData}
                    style={buttonStyle}
                    aria-label={'Editar ' + permission.slug}
                    onClick={() => {
                      clearMessages();
                      setEditingPermission(permission.permissionId);
                      setPermissionName(permission.name ?? '');
                      setPermissionSlug(permission.slug);
                      setPermissionDescription(permission.description ?? '');
                      document
                        .getElementById('form-permiso')
                        ?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={busy || loadingData}
                    style={{
                      ...buttonStyle,
                      background: '#dc2626',
                      marginLeft: 8,
                    }}
                    aria-label={'Eliminar ' + permission.slug}
                    onClick={() =>
                      deleteItem(
                        'permissions',
                        permission.permissionId,
                        permission.slug,
                      )
                    }
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
