'use client';

import React from 'react';
import { Pencil, Trash2, Clock, User as UserIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BackendReservation, ReservationStatus } from '@/lib/api';

interface ReservationTableProps {
  reservations: BackendReservation[];
  onEdit: (reservation: BackendReservation) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export function ReservationTable({
  reservations,
  onEdit,
  onDelete,
  isLoading = false,
}: ReservationTableProps) {
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'No definida';
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: ReservationStatus | null) => {
    const base =
      'inline-block whitespace-nowrap px-3 py-1 text-xs rounded-full font-semibold border';
    switch (status) {
      case 'active':
        return (
          <span className={`${base} bg-uno-verde text-uno-negro border-uno-olivo`}>
            Activa
          </span>
        );
      case 'in_use':
        return (
          <span className={`${base} bg-uno-oro/30 text-uno-negro border-uno-oro`}>
            En uso
          </span>
        );
      case 'completed':
        return (
          <span className={`${base} bg-uno-beige/50 text-uno-negro border-uno-beige`}>
            Completada
          </span>
        );
      case 'cancelled':
        return (
          <span className={`${base} bg-uno-terracota/15 text-uno-marron border-uno-terracota/60`}>
            Cancelada
          </span>
        );
      default:
        return (
          <span className={`${base} bg-uno-mostaza/30 text-uno-negro border-uno-mostaza`}>
            {status || 'Pendiente'}
          </span>
        );
    }
  };

  const actionBtn =
    'cursor-pointer h-9 md:h-8 rounded-lg text-xs font-semibold active:scale-95 transition-all';

  const renderActions = (res: BackendReservation) => {
    const canUpdate = res.actions?.canUpdate;
    const canDelete = res.actions?.canDelete;

    if (!canUpdate && !canDelete) {
      return (
        <span className="text-xs text-muted-foreground italic">Solo lectura</span>
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
        {canUpdate && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(res)}
            className={`${actionBtn} text-primary border-primary/40 hover:bg-secondary flex items-center gap-1`}
          >
            <Pencil className="h-3 w-3" />
            Editar
          </Button>
        )}
        {canDelete && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(res.reservationId)}
            className={`${actionBtn} text-uno-terracota border-uno-terracota/50 hover:bg-uno-terracota/10 flex items-center gap-1`}
          >
            <Trash2 className="h-3 w-3" />
            Eliminar
          </Button>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm">Cargando reservaciones del servidor...</p>
      </div>
    );
  }

  if (!reservations || reservations.length === 0) {
    return (
      <div className="text-center py-12 px-4 text-muted-foreground text-sm">
        No hay reservaciones registradas para mostrar.
      </div>
    );
  }

  return (
    <>
      {/* Vista de escritorio: Tabla estilizada */}
      <div className="hidden md:block">
        <Table>
          <TableHeader className="bg-secondary/70">
            <TableRow>
              <TableHead className="font-bold text-foreground">Título / Descripción</TableHead>
              <TableHead className="font-bold text-foreground">Estatus</TableHead>
              <TableHead className="font-bold text-foreground">Fecha Inicio</TableHead>
              <TableHead className="font-bold text-foreground">Fecha Fin</TableHead>
              <TableHead className="font-bold text-foreground">Creador</TableHead>
              <TableHead className="text-right font-bold text-foreground">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservations.map((res) => (
              <TableRow
                key={res.reservationId}
                className="hover:bg-secondary/50 transition-colors"
              >
                <TableCell>
                  <div className="font-semibold text-foreground">
                    {res.title || 'Sin título'}
                  </div>
                  {res.description && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {res.description}
                    </div>
                  )}
                </TableCell>
                <TableCell>{getStatusBadge(res.status)}</TableCell>
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDate(res.startTime)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDate(res.endTime)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  <div className="flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>{res.creator?.username || 'Usuario'}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">{renderActions(res)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Vista móvil: Tarjetas apiladas */}
      <div className="md:hidden divide-y divide-border">
        {reservations.map((res) => (
          <div key={res.reservationId} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <h3 className="min-w-0 font-semibold text-foreground break-words">
                {res.title || 'Sin título'}
              </h3>
              <div className="shrink-0">{getStatusBadge(res.status)}</div>
            </div>
            {res.description && (
              <p className="text-xs text-muted-foreground">{res.description}</p>
            )}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Inicio: <span className="text-foreground">{formatDate(res.startTime)}</span></p>
              <p>Fin: <span className="text-foreground">{formatDate(res.endTime)}</span></p>
              <p>Creado por: <span className="text-foreground">{res.creator?.username || 'Usuario'}</span></p>
            </div>
            {renderActions(res)}
          </div>
        ))}
      </div>
    </>
  );
}