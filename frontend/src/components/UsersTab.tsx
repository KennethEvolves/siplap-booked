// src/components/UsersTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/lib/api';
import { createUserSchema } from '@/validations/schemas'; // <--- 1. Importas tu esquema de Zod aquí

interface User {
  user_id: string;
  username: string;
  email: string;
}

interface Role {
  role_id: string;
  name: string;
}

export default function UsersTab() {
  const [showForm, setShowForm] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Estados para crear usuario
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });

  // Estados para la tarjeta de "Asignar rol a usuario"
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignMessage, setAssignMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Cargar usuarios y roles para los selectores
  const fetchData = async () => {
    try {
      setLoadingUsers(true);
      const userRes: any = await apiFetch('/users', { method: 'GET' });
      if (userRes && Array.isArray(userRes.users)) {
        setUsers(userRes.users);
      } else if (Array.isArray(userRes)) {
        setUsers(userRes);
      }

      const roleRes: any = await apiFetch('/roles', { method: 'GET' });
      if (roleRes && Array.isArray(roleRes.roles)) {
        setRoles(roleRes.roles);
      } else if (Array.isArray(roleRes)) {
        setRoles(roleRes);
      }
    } catch (err: any) {
      console.error('Error al cargar datos:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // --- 2. AQUÍ VALIDAS CON ZOD ANTES DE MANDAR AL BACKEND ---
   const validationResult = createUserSchema.safeParse(formData);

    if (!validationResult.success) {
      // Usamos format() o un acceso directo seguro para TypeScript
      const firstError = validationResult.error.issues[0]?.message || 'Datos inválidos';
      setError(firstError);
      return; 
    }
    // -----------------------------------------------------------

    setLoading(true);

    try {
      await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      setSuccess('¡Usuario creado con éxito!');
      setFormData({ username: '', email: '', password: '' });
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error al registrar el usuario');
    } finally {
      setLoading(false);
    }
  };

  // Función para asignar rol a usuario (conectando con la lógica del backend)
  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !selectedRole) {
      alert('Por favor selecciona un usuario y un rol.');
      return;
    }

    try {
      setAssignLoading(true);
      setAssignMessage('');

      await apiFetch(`/users/${selectedUser}/roles/${selectedRole}`, {
        method: 'POST',
      });

      setAssignMessage('¡Rol asignado al usuario correctamente!');
      setSelectedUser('');
      setSelectedRole('');
    } catch (err: any) {
      setAssignMessage(err.message || 'Error al asignar el rol');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este usuario?')) {
      try {
        await apiFetch(`/users/${id}`, { method: 'DELETE' });
        fetchData();
      } catch (err: any) {
        alert(err.message || 'No se pudo eliminar');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Tarjeta de Gestión y Creación de Usuarios */}
      <Card title="Gestión de Usuarios">
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">Administra el alta y los accesos de los usuarios del sistema.</p>
          <Button variant="primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : '+ Nuevo Usuario'}
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleCreateUser} className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 space-y-4">
            <h3 className="font-bold text-gray-700">Registrar Nuevo Usuario</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de usuario</label>
              <input 
                type="text" 
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input 
                type="password" 
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}
            {success && <p className="text-green-600 text-sm">{success}</p>}

            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Usuario'}
            </Button>
          </form>
        )}

        {/* Tabla de Usuarios */}
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-sm border-b border-gray-200">
                <th className="p-3">Usuario</th>
                <th className="p-3">Correo</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-600">
              {loadingUsers ? (
                <tr><td colSpan={3} className="p-4 text-center text-gray-400">Cargando usuarios...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={3} className="p-4 text-center text-gray-400">No hay usuarios registrados.</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.user_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-800">{user.username || 'Sin nombre'}</td>
                    <td className="p-3">{user.email}</td>
                    <td className="p-3 text-center space-x-2">
                      <button onClick={() => alert(`Editar usuario: ${user.user_id}`)} className="text-blue-600 hover:underline text-xs font-medium">Editar</button>
                      <button onClick={() => handleDelete(user.user_id)} className="text-red-600 hover:underline text-xs font-medium">Eliminar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 2. Tarjeta de Asignar Rol a Usuario */}
      <Card title="Asignar rol a usuario">
        <form onSubmit={handleAssignRole} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              required
              className="w-full border border-gray-300 p-2 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="">Selecciona un usuario</option>
              {users.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.username || u.email}
                </option>
              ))}
            </select>
          </div>

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
                <option key={r.role_id} value={r.role_id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {assignMessage && (
            <p className={`text-sm ${assignMessage.includes('éxito') ? 'text-green-600' : 'text-red-600'}`}>
              {assignMessage}
            </p>
          )}

          <Button variant="primary" type="submit" disabled={assignLoading}>
            {assignLoading ? 'Asignando...' : 'Asignar rol'}
          </Button>
        </form>
      </Card>
    </div>
  );
}