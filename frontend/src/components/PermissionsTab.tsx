// src/components/PermissionsTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/lib/api';

interface Permission {
  permission_id: string;
  name: string;
  slug: string;
  description: string;
}

export default function PermissionsTab() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Campos basados en la tabla permissions del SQL
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
  });

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const response: any = await apiFetch('/permissions', { method: 'GET' });
      
      // El backend nos manda los permisos dentro de la propiedad .permissions
      if (response && Array.isArray(response.permissions)) {
        setPermissions(response.permissions);
      } else if (Array.isArray(response)) {
        setPermissions(response);
      } else {
        setPermissions([]);
      }
    } catch (err) {
      console.error('Error al cargar permisos:', err);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
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
      await apiFetch('/permissions', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setFormData({ name: '', slug: '', description: '' });
      setShowForm(false);
      fetchPermissions(); // Recargamos la lista
    } catch (err: any) {
      alert(err.message || 'Error al crear el permiso');
    }
  };

  return (
    <div>
      <Card title="Gestión de Permisos">
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">Administra los permisos detallados que se asignarán a los roles del sistema.</p>
          <Button variant="primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : '+ Nuevo Permiso'}
          </Button>
        </div>

        {/* Formulario para nuevo permiso */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 space-y-4">
            <h3 className="font-bold text-gray-700">Crear Nuevo Permiso</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del permiso</label>
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Ej. Crear Usuarios"
                className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug (Identificador único)</label>
              <input 
                type="text" 
                name="slug"
                value={formData.slug}
                onChange={handleInputChange}
                required
                placeholder="Ej. users:create"
                className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea 
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Breve detalle de lo que permite hacer..."
                className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <Button variant="primary" type="submit">Guardar Permiso</Button>
          </form>
        )}

        {/* Tabla de Permisos */}
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-sm border-b border-gray-200">
                <th className="p-3">Permiso</th>
                <th className="p-3">Slug</th>
                <th className="p-3">Descripción</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-600">
              {loading ? (
                <tr><td colSpan={4} className="p-4 text-center text-gray-400">Cargando permisos...</td></tr>
              ) : permissions.length === 0 ? (
                <tr><td colSpan={4} className="p-4 text-center text-gray-400">No hay permisos registrados.</td></tr>
              ) : (
                permissions.map((perm) => (
                  <tr key={perm.permission_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-800">{perm.name}</td>
                    <td className="p-3 font-mono text-xs bg-gray-100 rounded px-1">{perm.slug}</td>
                    <td className="p-3">{perm.description || 'Sin descripción'}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => alert(`Editar permiso: ${perm.permission_id}`)} className="text-blue-600 hover:underline text-xs mr-2">Editar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}