'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BackendActivity, BackendReservation } from '@/lib/api';
import { Button } from '@/components/ui/Button';

interface Props {
  reservations: BackendReservation[];
  activities: BackendActivity[];
  loading?: boolean;
}

export function ReservationsCalendar({ reservations, activities, loading = false }: Props) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const { cells, eventsByDate } = useMemo(() => {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (firstDay.getDay() + 6) % 7;
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells: Array<number | null> = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)];
    while (cells.length % 7) cells.push(null);
    const eventsByDate = new Map<string, Array<{ id: string; title: string; kind: 'reservation' | 'activity'; status: string }>>();
    const add = (date: string | null, event: { id: string; title: string; kind: 'reservation' | 'activity'; status: string }, dateOnly = false) => {
      if (!date) return;
      const parsed = new Date(date);
      const key = dateOnly ? date.slice(0, 10) : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
      eventsByDate.set(key, [...(eventsByDate.get(key) || []), event]);
    };
    reservations.forEach((reservation) => add(reservation.startTime, { id: reservation.reservationId, title: reservation.title || 'Reservación', kind: 'reservation', status: reservation.status || 'pending' }));
    activities.forEach((activity) => add(activity.startDate, { id: activity.activityId, title: activity.title || 'Actividad', kind: 'activity', status: activity.status }, true));
    return { cells, eventsByDate };
  }, [month, reservations, activities]);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-foreground">Calendario global de actividades y reservaciones</h2>
          <p className="text-xs text-muted-foreground">Se muestran los elementos que tu sesión tiene permiso para consultar.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" aria-label="Mes anterior" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-32 text-center text-sm font-semibold capitalize">{month.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</span>
          <Button variant="outline" size="sm" aria-label="Mes siguiente" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Cargando calendario…</p> : (
        <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-border">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => <div key={day} className="bg-secondary/70 p-2 text-center text-xs font-bold">{day}</div>)}
          {cells.map((day, index) => {
            const date = day ? `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
            const events = eventsByDate.get(date) || [];
            return <div key={`${date || 'empty'}-${index}`} className="min-h-24 border-t border-r border-border p-1.5 sm:min-h-28 sm:p-2">
              {day && <><span className="text-xs font-semibold text-muted-foreground">{day}</span><div className="mt-1 space-y-1">
                {events.slice(0, 3).map((event) => <div key={`${event.kind}-${event.id}`} title={`${event.kind === 'activity' ? 'Actividad' : 'Reservación'} · ${event.status}`} className={`truncate rounded px-1.5 py-1 text-[10px] sm:text-xs ${event.kind === 'activity' ? 'bg-primary/10 text-primary' : event.status === 'reserved' || event.status === 'active' ? 'bg-uno-verde text-uno-negro' : 'bg-uno-mostaza/30 text-uno-negro'}`}>{event.title}</div>)}
                {events.length > 3 && <p className="text-[10px] text-muted-foreground">+{events.length - 3} más</p>}
              </div></>}
            </div>;
          })}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground"><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded bg-primary/30" />Actividad</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded bg-uno-mostaza/50" />Reservación pendiente</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded bg-uno-verde" />Reservado</span></div>
    </section>
  );
}
