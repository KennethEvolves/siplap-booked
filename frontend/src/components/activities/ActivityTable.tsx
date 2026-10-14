'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

interface ActivityTableProps {
  activities: Array<{ id: number; title: string; status: string; owner: string }>;
  userRole: 'superuser' | 'directive' | 'lead';
  onActionClick: (action: string, id: number) => void;
}

export default function ActivityTable({ activities, userRole, onActionClick }: ActivityTableProps) {
  const isDirective = userRole === 'directive';
  const isLead = userRole === 'lead';

  return (
    <div className="border rounded-md bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Responsable</TableHead>
            <TableHead>Estatus</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activities.map((activity) => (
            <TableRow key={activity.id}>
              <TableCell className="font-medium">{activity.title}</TableCell>
              <TableCell>{activity.owner}</TableCell>
              <TableCell>
                <span className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700 font-medium">
                  {activity.status}
                </span>
              </TableCell>
              <TableCell className="text-right">
                {/* REQUISITO: La directiva gestiona los estados de aprobación */}
                {isDirective ? (
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="outline" onClick={() => onActionClick('aprobar', activity.id)} className="text-green-600 h-8 px-2 text-xs">Aprobar</Button>
                    <Button size="sm" variant="outline" onClick={() => onActionClick('rechazar', activity.id)} className="text-red-600 h-8 px-2 text-xs">No aprobado</Button>
                    <Button size="sm" variant="outline" onClick={() => onActionClick('reprogramar', activity.id)} className="text-amber-600 h-8 px-2 text-xs">Reprogramar</Button>
                  </div>
                ) : isLead ? (
                  /* REQUISITO: Vista limpia para el lead (solo sus propias actividades sin botones de aprobación) */
                  <Button size="sm" variant="ghost" onClick={() => onActionClick('ver', activity.id)}>
                    Ver detalles
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => onActionClick('editar', activity.id)}>
                    Editar
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}