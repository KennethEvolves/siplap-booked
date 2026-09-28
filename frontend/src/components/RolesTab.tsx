// src/components/RolesTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/lib/api';

interface Role {
  role_id: string;
  name: string;
  description: string;
}

interface Permission {
  permission_id: string;
  name: string;
  slug: string;
}

export default function RolesTab() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Formulario para nuevo rol
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  // Estados para la tarjeta de "Asignar permiso a rol"
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedPermission, setSelectedPermission] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignMessage, setAssignMessage] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      // Cargar Roles
      const roleRes: any = await apiFetch('/roles', { method: 'GET' });
      if (roleRes && Array.isArray(roleRes.roles)) {
        setRoles(roleRes.roles);
      } else if (Array.isArray(roleRes)) {
        setRoles(roleRes);
      }

      // Cargar Permisos para el selector de abajo
      const permRes: any = await apiFetch('/permissions', { method: 'GET' });
      if (permRes && Array.isArray(permRes.permissions)) {
        setPermissions(permRes.permissions);
      } else if (Array.isArray(permRes)) {
        setPermissions(permRes);
      }
    } catch (err) {
      console.error('Error al cargar datos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/roles', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setFormData({ name: '', description: '' });
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error al crear el rol');
    }
  };

  // Función para asignar permiso a rol usando el endpoint del controlador: /roles/:roleId/permissions/:permissionId
  const handleAssignPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !selectedPermission) {
      alert('Por favor selecciona un rol y un permiso.');
      return;
    }

    try {
      setAssignLoading(true);
      setAssignMessage('');

      await apiFetch(`/roles/${selectedRole}/permissions/${selectedPermission}`, {
        method: 'POST',
      });

      setAssignMessage('¡Permiso asignado al rol correctamente!');
      setSelectedRole('');
      setSelectedPermission('');
    } catch (err: any) {
      setAssignMessage(err.message || 'Error al asignar el permiso');
    } finally {
      setAssignLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Tarjeta de Gestión y Creación de Roles */}
      <Card title="Gestión de Roles">
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">Define los roles del sistema y sus descripciones.</p>
          <Button variant="primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : '+ Nuevo Rol'}
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 space-y-4">
            <h3 className="font-bold text-gray-700">Crear Nuevo Rol</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del rol</label>
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea 
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <Button variant="primary" type="submit">Guardar Rol</Button>
          </form>
        )}

        {/* Tabla de Roles */}
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-sm border-b border-gray-200">
                <th className="p-3">Rol</th>
                <th className="p-3">Descripción</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-600">
              {loading ? (
                <tr><td colSpan={3} className="p-4 text-center text-gray-400">Cargando roles...</td></tr>
              ) : roles.length === 0 ? (
                <tr><td colSpan={3} className="p-4 text-center text-gray-400">No hay roles registrados.</td></tr>
              ) : (
                roles.map((role) => (
                  <tr key={role.role_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-800">{role.name}</td>
                    <td className="p-3">{role.description || 'Sin descripción'}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => alert(`Editar rol: ${role.role_id}`)} className="text-blue-600 hover:underline text-xs mr-2">Editar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 2. Tarjeta de Asignar Permiso a Rol */}
      <Card title="Asignar permiso a rol">
        <form onSubmit={handleAssignPermission} className="space-y-4">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Permiso</label>
            <select
              value={selectedPermission}
              onChange={(e) => setSelectedPermission(e.target.value)}
              required
              className="w-full border border-gray-300 p-2 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="">Selecciona un permiso</option>
              {permissions.map((p) => (
                <option key={p.permission_id} value={p.permission_id}>
                  {p.name} ({p.slug})
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
            {assignLoading ? 'Asignando...' : 'Asignar permiso'}
          </Button>
        </form>
      </Card>
    </div>
  );
}