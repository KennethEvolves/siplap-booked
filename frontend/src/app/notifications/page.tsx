'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Loader2, RefreshCw } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/Button';
import { getNotifications, markNotificationRead, UserNotification } from '@/lib/api';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const result = await getNotifications({ limit: 100 });
      setNotifications(result.notifications || []);
      setUnread(result.unread || 0);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las notificaciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), 15000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [load]);

  const markRead = async (notification: UserNotification) => {
    if (notification.isRead) return;
    try {
      await markNotificationRead(notification.notificationId);
      setNotifications((items) => items.map((item) => item.notificationId === notification.notificationId ? { ...item, isRead: true } : item));
      setUnread((count) => Math.max(0, count - 1));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar la notificación.');
    }
  };

  return <div className="flex min-h-screen bg-secondary/40"><Sidebar /><main className="min-w-0 flex-1 p-4 pt-16 md:p-6 lg:p-8 lg:pt-8">
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div><h1 className="flex items-center gap-2 text-2xl font-extrabold"><Bell className="h-6 w-6 text-primary" />Notificaciones</h1><p className="mt-1 text-sm text-muted-foreground">Avisos sobre actividades, reservaciones y solicitudes de servicio.</p></div>
        <div className="flex items-center gap-3"><span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{unread} sin leer</span><Button variant="outline" onClick={() => void load(true)}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button></div>
      </header>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {loading ? <div className="flex items-center justify-center gap-2 p-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Cargando notificaciones…</div> : notifications.length === 0 ? <div className="p-12 text-center text-sm text-muted-foreground">Todavía no tienes notificaciones.</div> : <ul className="divide-y divide-border">
          {notifications.map((notification) => <li key={notification.notificationId} className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between ${notification.isRead ? '' : 'bg-primary/[0.04]'}`}>
            <div className="min-w-0"><div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${notification.isRead ? 'bg-muted' : 'bg-primary'}`} /><h2 className="font-semibold">{notification.title}</h2>{!notification.isRead && <span className="text-[10px] font-bold uppercase text-primary">Nueva</span>}</div><p className="mt-1 text-sm text-muted-foreground">{notification.message}</p><time className="mt-2 block text-xs text-muted-foreground" dateTime={notification.createdAt}>{new Date(notification.createdAt).toLocaleString('es-MX')}</time>
              {(notification.activityId || notification.reservationId) && <div className="mt-2 flex gap-3 text-xs font-semibold text-primary">{notification.activityId && <Link href="/activities">Ver actividades</Link>}{notification.reservationId && <Link href="/reservations">Ver reservaciones</Link>}</div>}
            </div>
            {!notification.isRead && <Button size="sm" variant="outline" onClick={() => void markRead(notification)} className="shrink-0"><CheckCheck className="mr-1.5 h-4 w-4" />Marcar leída</Button>}
          </li>)}
        </ul>}
      </section>
    </div>
  </main></div>;
}
