'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/Button';
import { ReservationTable } from '@/components/reservations/ReservationTable';
import { ReservationModal } from '@/components/reservations/ReservationModal';
import {
  getReservations,
  getReservationCreators,
  createReservation,
  updateReservation,
  deleteReservation,
  BackendReservation,
  ReservationCreatorOption,
} from '@/lib/api';
import {
  CalendarDays,
  ShieldCheck,
  Plus,
  Loader2,
  Check,
  AlertTriangle,
} from 'lucide-react';

export default function ReservationsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const currentUserId = user?.id;
  const permissions: string[] = (user?.permissions as string[]) || [];

  const isSuperUser = useMemo(() => {
    return (
      permissions.includes('manage:all') ||
      user?.role === 'superuser' ||
      user?.role === 'reservation_manager'
    );
  }, [permissions, user?.role]);

  const [reservations, setReservations] = useState<BackendReservation[]>([]);
  const [creatorsList, setCreatorsList] = useState<ReservationCreatorOption[]>([]);
  const [capabilities, setCapabilities] = useState({
    canCreate: true,
    canManage: false,
    canViewAll: false,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'mine' | 'all'>('mine');
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] =
    useState<BackendReservation | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getReservations();
      setReservations(res.reservations || []);
      setCapabilities(
        res.capabilities || { canCreate: true, canManage: false, canViewAll: false }
      );

      if (res.capabilities?.canManage || isSuperUser) {
        try {
          const creatorsRes = await getReservationCreators();
          setCreatorsList(creatorsRes.users || []);
        } catch (e) {
          console.warn('No se pudo cargar la lista de creadores:', e);
        }
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Error al sincronizar reservaciones del servidor.');
    } finally {
      setLoading(false);
    }
  }, [isSuperUser]);

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session, loadData]);

  const canShowAllTabs = capabilities.canViewAll || isSuperUser;

  const filteredReservations = reservations.filter((r) => {
    if (canShowAllTabs && activeTab === 'mine') {
      const isOwner =
        (currentUserId && r.creator?.userId === currentUserId) ||
        r.actions?.canUpdate === true;
      if (!isOwner) return false;
    }

    if (filterStatus === 'TODOS') return true;
    return r.status?.toUpperCase() === filterStatus.toUpperCase();
  });

  const handleSave = async (payload: any) => {
    try {
      if (selectedReservation?.reservationId) {
        await updateReservation(selectedReservation.reservationId, payload);
        showToast('success', 'Reservación actualizada exitosamente.');
      } else {
        await createReservation(payload);
        showToast('success', 'Reservación creada exitosamente.');
      }
      await loadData();
    } catch (error: any) {
      showToast('error', error.message || 'Error al guardar la reservación.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Deseas cancelar o eliminar esta reservación?')) return;
    try {
      await deleteReservation(id);
      showToast('success', 'Reservación eliminada exitosamente.');
      await loadData();
    } catch (error: any) {
      showToast('error', error.message || 'Error al eliminar la reservación.');
    }
  };

  return (
    <div className="flex min-h-screen bg-secondary/40">
      <Sidebar />

      <main className="flex-1 min-w-0 p-4 pt-16 md:p-6 md:pt-16 lg:p-8 lg:pt-8 overflow-y-auto">
        {toastMessage && (
          <div className="fixed top-3 right-3 left-16 sm:left-auto sm:top-6 sm:right-6 z-[60] animate-in fade-in slide-in-from-top-4 duration-200">
            <div
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium text-white ${
                toastMessage.type === 'success'
                  ? 'bg-uno-olivo border-uno-olivo'
                  : 'bg-uno-terracota border-uno-terracota'
              }`}
            >
              {toastMessage.type === 'success' ? (
                <Check className="h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              )}
              {toastMessage.text}
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 md:p-6 rounded-2xl border border-border shadow-sm">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                  <CalendarDays className="h-6 w-6 text-primary" />
                  Módulo de Reservaciones
                </h1>
                {isSuperUser && (
                  <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-uno-negro bg-uno-mostaza/30 px-2 py-0.5 rounded-md border border-uno-mostaza">
                    <ShieldCheck className="h-3 w-3" />
                    Acceso Total
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {isSuperUser
                  ? 'Panel de administración general y consulta de solicitudes institucionales.'
                  : 'Consulta, agenda y gestiona tus propias reservaciones.'}
              </p>
            </div>

            {capabilities.canCreate !== false && (
              <Button
                onClick={() => {
                  setSelectedReservation(null);
                  setIsModalOpen(true);
                }}
                className="bg-primary hover:bg-uno-ciruela text-primary-foreground min-h-[40px] px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Plus className="h-4 w-4" />
                Nueva Reservación
              </Button>
            )}
          </div>

          {canShowAllTabs && (
            <div className="flex items-center gap-2 bg-card p-2 rounded-2xl border border-border shadow-sm">
              <Button
                size="sm"
                variant={activeTab === 'mine' ? 'default' : 'outline'}
                onClick={() => setActiveTab('mine')}
                className={`rounded-xl text-xs font-semibold ${
                  activeTab === 'mine'
                    ? 'bg-primary hover:bg-uno-ciruela text-primary-foreground'
                    : 'text-foreground border-border hover:bg-secondary'
                }`}
              >
                Mis Reservaciones
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'all' ? 'default' : 'outline'}
                onClick={() => setActiveTab('all')}
                className={`flex items-center gap-1.5 rounded-xl text-xs font-semibold ${
                  activeTab === 'all'
                    ? 'bg-primary hover:bg-uno-ciruela text-primary-foreground'
                    : 'text-foreground border-border hover:bg-secondary'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Todas las Reservaciones (Administración)
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2 bg-card p-3 md:p-4 rounded-2xl border border-border shadow-sm overflow-x-auto">
            <span className="shrink-0 text-xs font-bold text-muted-foreground uppercase tracking-wider mr-2">
              Filtrar estado:
            </span>
            {[
              { key: 'TODOS', label: 'TODOS' },
              { key: 'ACTIVE', label: 'ACTIVA' },
              { key: 'IN_USE', label: 'EN USO' },
              { key: 'COMPLETED', label: 'COMPLETADA' },
              { key: 'CANCELLED', label: 'CANCELADA' },
            ].map((st) => (
              <Button
                key={st.key}
                size="sm"
                variant={filterStatus === st.key ? 'default' : 'outline'}
                onClick={() => setFilterStatus(st.key)}
                className={`shrink-0 whitespace-nowrap min-h-[36px] rounded-xl text-xs font-semibold ${
                  filterStatus === st.key
                    ? 'bg-primary hover:bg-uno-ciruela text-primary-foreground'
                    : 'text-foreground border-border hover:bg-secondary'
                }`}
              >
                {st.label}
              </Button>
            ))}
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <ReservationTable
              reservations={filteredReservations}
              isLoading={loading}
              onEdit={(item) => {
                setSelectedReservation(item);
                setIsModalOpen(true);
              }}
              onDelete={handleDelete}
            />
          </div>

          <ReservationModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSave}
            initialData={selectedReservation}
            canManage={capabilities.canManage || isSuperUser}
            creatorsList={creatorsList}
          />
        </div>
      </main>
    </div>
  );
}