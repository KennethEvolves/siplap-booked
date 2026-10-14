'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ActivityModal } from '@/components/activities/ActivityModal';
import { Button } from '@/components/ui/Button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

export default function ActivitiesPage() {
  // Puedes alternar entre 'superuser', 'directive' o 'lead' para probar la interfaz
  const [userRole, setUserRole] = useState<'superuser' | 'directive' | 'lead'>('superuser');
  
  const [activities, setActivities] = useState([
    { id: 1, title: 'Mantenimiento Preventivo de Servidores', status: 'Pendiente', owner: 'Jefe de Sistemas' },
    { id: 2, title: 'Capacitación en Plataforma SIPLAP', status: 'Aprobado', owner: 'Coordinación Académica' },
  ]);

  const handleCreateActivity = (newData: { title: string; description: string; assignedUser?: string }) => {
    const newActivityItem = {
      id: Date.now(),
      title: newData.title,
      status: 'Pendiente',
      owner: newData.assignedUser || 'Nuria Gutierrez (Tú)'
    };
    setActivities([newActivityItem, ...activities]);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* 1. Barra lateral */}
      <Sidebar />

      {/* 2. Contenido principal */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Panel de prueba rápido de roles (Opcional para desarrollo) */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Simular Vista por Rol:</span>
            <div className="flex gap-2">
              <Button size="sm" variant={userRole === 'superuser' ? 'default' : 'outline'} onClick={() => setUserRole('superuser')} className="rounded-xl text-xs">Superuser</Button>
              <Button size="sm" variant={userRole === 'directive' ? 'default' : 'outline'} onClick={() => setUserRole('directive')} className="rounded-xl text-xs">Directive</Button>
              <Button size="sm" variant={userRole === 'lead' ? 'default' : 'outline'} onClick={() => setUserRole('lead')} className="rounded-xl text-xs">Lead</Button>
            </div>
          </div>

          {/* Encabezado del Módulo */}
          <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Gestión de Actividades</h1>
              <p className="text-sm text-slate-500 mt-0.5">Visualiza, aprueba y programa las actividades institucionales según tu rol ({userRole}).</p>
            </div>
            
            {/* Botón que despliega el Modal de Nueva Actividad */}
            <ActivityModal userRole={userRole} onSave={handleCreateActivity} />
          </div>

          {/* Filtros de Estado */}
          <div className="flex items-center gap-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Filtrar estado:</span>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold">TODOS</Button>
            <Button size="sm" variant="outline" className="rounded-xl text-xs text-slate-600 border-slate-200">PENDIENTE</Button>
            <Button size="sm" variant="outline" className="rounded-xl text-xs text-slate-600 border-slate-200">APROBADO</Button>
            <Button size="sm" variant="outline" className="rounded-xl text-xs text-slate-600 border-slate-200">NO_APROBADO</Button>
            <Button size="sm" variant="outline" className="rounded-xl text-xs text-slate-600 border-slate-200">REPROGRAMACION</Button>
            <Button size="sm" variant="outline" className="rounded-xl text-xs text-slate-600 border-slate-200">CANCELADO</Button>
          </div>

          {/* Tabla de Actividades */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/70">
                <TableRow>
                  <TableHead className="font-bold text-slate-700">Título</TableHead>
                  <TableHead className="font-bold text-slate-700">Creado por</TableHead>
                  <TableHead className="font-bold text-slate-700">Estatus</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => (
                  <TableRow key={activity.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-semibold text-slate-900">{activity.title}</TableCell>
                    <TableCell className="text-slate-600 text-sm">{activity.owner}</TableCell>
                    <TableCell>
                      <span className="px-3 py-1 text-xs rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        {activity.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {userRole === 'directive' ? (
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 h-8 rounded-lg text-xs font-semibold">Aprobar</Button>
                          <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50 h-8 rounded-lg text-xs font-semibold">Rechazar</Button>
                          <Button size="sm" variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50 h-8 rounded-lg text-xs font-semibold">Reprogramar</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" className="text-slate-600 hover:text-slate-900 rounded-lg text-xs font-medium">Ver detalles</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

        </div>
      </main>
    </div>
  );
}