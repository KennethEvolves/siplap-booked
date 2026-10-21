import { describe, expect, it, vi } from 'vitest';
import {
  RESERVATION_PERMISSIONS as P,
  createReservationSchema,
  patchReservationSchema,
  putReservationSchema,
} from '@shared/contracts';
import { ReservationsPolicy } from '../domain/reservations.policy.js';
import { ReservationsUseCase } from './reservations.use-case.js';
import type { ReservationsRepository } from '../domain/reservations.repository.js';

const own = {
  reservationId: 'reservation-1',
  title: 'Reserva de sala',
  description: null,
  activityId: null,
  status: 'active' as const,
  startTime: '2026-10-20T09:00:00.000Z',
  endTime: '2026-10-20T10:00:00.000Z',
  creator: { userId: 'user-1', username: 'Ana' },
  createdAt: '2026-10-19T12:00:00.000Z',
  updatedAt: '2026-10-19T12:00:00.000Z',
};

describe('Permisos de reservaciones', () => {
  it('superusuario y reservation_manager gestionan reservaciones de cualquiera', () => {
    for (const permission of [P.manage, 'manage:all']) {
      const policy = new ReservationsPolicy('manager', [permission]);
      expect(policy.canCreate).toBe(true);
      expect(policy.canViewAll).toBe(true);
      expect(policy.actions('other')).toEqual({
        canView: true,
        canUpdate: true,
        canDelete: true,
      });
    }
  });

  it('un rol con view_all ve de todos y modifica/elimina solo lo propio', () => {
    const policy = new ReservationsPolicy('directive', [
      P.viewAll,
      P.createOwn,
      P.viewOwn,
      P.updateOwn,
      P.deleteOwn,
    ]);
    expect(policy.actions('directive')).toEqual({
      canView: true,
      canUpdate: true,
      canDelete: true,
    });
    expect(policy.actions('other')).toEqual({
      canView: true,
      canUpdate: false,
      canDelete: false,
    });
  });

  it('lista todas las reservaciones para view_all', async () => {
    const list = vi.fn().mockResolvedValue({ reservations: [], total: 0 });
    const repository = {
      permissions: vi.fn().mockResolvedValue([P.viewAll]),
      list,
    } as unknown as ReservationsRepository;

    await new ReservationsUseCase(repository).list('directive', {
      page: 1,
      limit: 20,
    });

    expect(list).toHaveBeenCalledWith({ page: 1, limit: 20 }, undefined);
  });

  it('filtra las consultas por propietario cuando solo tiene permisos propios', async () => {
    const list = vi.fn().mockResolvedValue({ reservations: [own], total: 1 });
    const repository = {
      permissions: vi.fn().mockResolvedValue([P.viewOwn]),
      list,
    } as unknown as ReservationsRepository;

    const result = await new ReservationsUseCase(repository).list('user-1', {
      page: 1,
      limit: 20,
    });

    expect(list).toHaveBeenCalledWith({ page: 1, limit: 20 }, 'user-1');
    expect(result.reservations[0]?.actions).toEqual({
      canView: true,
      canUpdate: false,
      canDelete: false,
    });
  });

  it('rechaza create sin permiso y evita que usuarios propios cambien al creador', async () => {
    const create = vi.fn().mockResolvedValue(own);
    const repository = {
      permissions: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([P.createOwn]),
      create,
    } as unknown as ReservationsRepository;
    const useCase = new ReservationsUseCase(repository);
    const input = {
      title: 'Reserva de sala',
      creatorId: '00000000-0000-4000-8000-000000000002',
      startTime: '2026-10-20T09:00:00Z',
      endTime: '2026-10-20T10:00:00Z',
    };

    await expect(useCase.create('user-1', input)).rejects.toMatchObject({
      status: 403,
    });
    await useCase.create('user-1', input);
    expect(create).toHaveBeenCalledWith({ ...input, creatorId: 'user-1' });
  });

  it('permite al rol gestor crear una reservación para otro usuario', async () => {
    const create = vi.fn().mockResolvedValue(own);
    const repository = {
      permissions: vi.fn().mockResolvedValue([P.manage]),
      create,
    } as unknown as ReservationsRepository;
    const input = {
      title: 'Reserva para el equipo',
      creatorId: '00000000-0000-4000-8000-000000000002',
      startTime: '2026-10-20T09:00:00Z',
      endTime: '2026-10-20T10:00:00Z',
    };

    await new ReservationsUseCase(repository).create('manager', input);

    expect(create).toHaveBeenCalledWith(input);
  });

  it('solo permite al gestor consultar usuarios para asignar reservaciones', async () => {
    const users = [
      { userId: 'user-2', username: 'Luis', email: 'luis@example.com' },
    ];
    const creators = vi.fn().mockResolvedValue(users);
    const repository = {
      permissions: vi.fn().mockResolvedValueOnce([P.manage]).mockResolvedValueOnce([P.viewAll]),
      creators,
    } as unknown as ReservationsRepository;
    const useCase = new ReservationsUseCase(repository);

    await expect(useCase.creators('manager')).resolves.toEqual(users);
    await expect(useCase.creators('directive')).rejects.toMatchObject({
      status: 403,
    });
    expect(creators).toHaveBeenCalledTimes(1);
  });

  it('limita actualizaciones y eliminaciones ordinarias al propietario', async () => {
    const update = vi.fn().mockResolvedValue(own);
    const remove = vi.fn();
    const repository = {
      permissions: vi.fn().mockResolvedValue([P.updateOwn, P.deleteOwn]),
      update,
      delete: remove,
    } as unknown as ReservationsRepository;
    const useCase = new ReservationsUseCase(repository);

    await useCase.update('user-1', own.reservationId, { title: 'Actualizada' });
    await useCase.delete('user-1', own.reservationId);
    expect(update).toHaveBeenCalledWith(
      own.reservationId,
      { title: 'Actualizada' },
      'user-1',
    );
    expect(remove).toHaveBeenCalledWith(own.reservationId, 'user-1');
  });

  it('rechaza modificar o eliminar una reservación ajena aunque pueda verla', async () => {
    const update = vi.fn().mockRejectedValue({ status: 404 });
    const remove = vi.fn().mockRejectedValue({ status: 404 });
    const repository = {
      permissions: vi.fn().mockResolvedValue([P.viewAll, P.updateOwn, P.deleteOwn]),
      update,
      delete: remove,
    } as unknown as ReservationsRepository;
    const useCase = new ReservationsUseCase(repository);

    await expect(
      useCase.update('user-2', own.reservationId, { title: 'Intrusión' }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(useCase.delete('user-2', own.reservationId)).rejects.toMatchObject({
      status: 404,
    });
    expect(update).toHaveBeenCalledWith(
      own.reservationId,
      { title: 'Intrusión' },
      'user-2',
    );
    expect(remove).toHaveBeenCalledWith(own.reservationId, 'user-2');
  });

  it('valida fechas, campos estrictos y PUT completo', () => {
    const body = {
      title: 'Reserva de sala',
      startTime: '2026-10-20T09:00:00Z',
      endTime: '2026-10-20T10:00:00Z',
    };
    expect(createReservationSchema.safeParse(body).success).toBe(true);
    expect(
      createReservationSchema.safeParse({
        ...body,
        endTime: '2026-10-20T09:00:00Z',
      }).success,
    ).toBe(false);
    expect(
      createReservationSchema.safeParse({ ...body, creatorId: 'no-es-uuid' })
        .success,
    ).toBe(false);
    expect(
      createReservationSchema.safeParse({
        ...body,
        startTime: '2026-10-20T10:00:00+02:00',
        endTime: '2026-10-20T07:30:00Z',
      }).success,
    ).toBe(false);
    expect(patchReservationSchema.safeParse({ title: 'Nueva' }).success).toBe(
      true,
    );
    expect(patchReservationSchema.safeParse({}).success).toBe(false);
    expect(putReservationSchema.safeParse(body).success).toBe(false);
    expect(
      putReservationSchema.safeParse({
        ...body,
        description: null,
        activityId: null,
        status: 'active',
      }).success,
    ).toBe(true);
  });
});
