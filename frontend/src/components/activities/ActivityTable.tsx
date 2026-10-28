'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
    <div className="border border-border rounded-md bg-card shadow-sm overflow-x-auto">
      <Table>
        <TableHeader className="bg-secondary/70">
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
                <span className="px-2 py-1 text-xs rounded-full bg-secondary text-primary font-medium">
                  {activity.status}
                </span>
              </TableCell>
              <TableCell className="text-right">
                {isDirective ? (
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button size="sm" variant="outline" onClick={() => onActionClick('aprobar', activity.id)} className="text-uno-olivo h-8 px-2 text-xs">Aprobar</Button>
                    <Button size="sm" variant="outline" onClick={() => onActionClick('rechazar', activity.id)} className="text-uno-terracota h-8 px-2 text-xs">No aprobado</Button>
                    <Button size="sm" variant="outline" onClick={() => onActionClick('reprogramar', activity.id)} className="text-uno-marron h-8 px-2 text-xs">Reprogramar</Button>
                  </div>
                ) : isLead ? (
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