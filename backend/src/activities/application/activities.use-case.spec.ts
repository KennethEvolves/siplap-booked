import { describe, expect, it, vi } from 'vitest';
import {
  ACTIVITY_PERMISSIONS as P,
  approveActivitySchema,
  createActivitySchema,
  updateActivitySchema,
} from '@shared/contracts';
import { ActivityPolicy } from '../domain/activity-policy.js';
import { ActivitiesUseCase } from './activities.use-case.js';
import type { ActivitiesRepository } from '../domain/activities.repository.js';

describe('Permisos de actividades', () => {
  it('lead solo consulta y modifica actividades propias, sin aprobar ni eliminar', () => {
    const policy = new ActivityPolicy('lead', [
      P.createOwn,
      P.viewOwn,
      P.updateOwn,
    ]);
    expect(policy.canCreate).toBe(true);
    expect(policy.actions('lead')).toEqual({
      canView: true,
      canUpdate: true,
      canApprove: false,
      canDelete: false,
    });
    expect(policy.actions('other')).toEqual({
      canView: false,
      canUpdate: false,
      canApprove: false,
      canDelete: false,
    });
  });
  it('directive consulta, actualiza y aprueba todas pero no elimina', () => {
    const policy = new ActivityPolicy('directive', [
      P.viewAll,
      P.updateAll,
      P.approveAll,
      P.createOwn,
      P.viewOwn,
      P.updateOwn,
    ]);
    expect(policy.actions('other')).toEqual({
      canView: true,
      canUpdate: true,
      canApprove: true,
      canDelete: false,
    });
    expect(policy.canCreate).toBe(true);
  });
  it('activity:manage permite todas las operaciones', () => {
    const policy = new ActivityPolicy('superuser', [P.manage]);
    expect(policy.canCreate).toBe(true);
    expect(policy.actions('other')).toEqual({
      canView: true,
      canUpdate: true,
      canApprove: true,
      canDelete: true,
    });
  });
  it('manage:all también concede control total sobre actividades', () => {
    const policy = new ActivityPolicy('admin', ['manage:all']);
    expect(policy.canCreate).toBe(true);
    expect(policy.actions('other')).toEqual({
      canView: true,
      canUpdate: true,
      canApprove: true,
      canDelete: true,
    });
  });
  it('permisos antiguos no conceden acceso implícito', () => {
    expect(
      new ActivityPolicy('user', ['activities:create']).canCreate,
    ).toBe(false);
  });
  it('rechaza asignar otro creador antes de escribir para create_own', async () => {
    const create = vi.fn();
    const repository = {
      permissions: vi.fn().mockResolvedValue([P.createOwn]),
      create,
    } as unknown as ActivitiesRepository;
    await expect(
      new ActivitiesUseCase(repository).create('lead', {
        title: 'Actividad',
        startDate: '2026-10-20',
        endDate: '2026-10-21',
        creatorId: 'other',
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(create).not.toHaveBeenCalled();
  });
  it('aplica filtro del creador a la consulta y consulta permisos cada vez', async () => {
    const list = vi.fn().mockResolvedValue({ activities: [], total: 0 });
    const repository = {
      permissions: vi
        .fn()
        .mockResolvedValueOnce([P.viewOwn])
        .mockResolvedValueOnce([]),
      list,
    } as unknown as ActivitiesRepository;
    const useCase = new ActivitiesUseCase(repository);
    await useCase.list('lead', { page: 1, limit: 20 });
    expect(list).toHaveBeenCalledWith({ page: 1, limit: 20 }, 'lead');
    await expect(
      useCase.list('lead', { page: 1, limit: 20 }),
    ).rejects.toMatchObject({ status: 403 });
  });
  it('valida fechas, permite que PATCH valide creatorId y rechaza campos desconocidos', () => {
    const body = {
      title: 'Actividad',
      startDate: '2026-10-20',
      endDate: '2026-10-21',
    };
    expect(createActivitySchema.safeParse(body).success).toBe(true);
    expect(
      createActivitySchema.safeParse({ ...body, startDate: '2026-02-30' })
        .success,
    ).toBe(false);
    expect(
      createActivitySchema.safeParse({ ...body, endDate: '2026-10-19' })
        .success,
    ).toBe(false);
    expect(updateActivitySchema.safeParse({ status: 'approved' }).success).toBe(
      false,
    );
    expect(
      updateActivitySchema.safeParse({
        creatorId: '550e8400-e29b-41d4-a716-446655440000',
      }).success,
    ).toBe(true);
    expect(updateActivitySchema.safeParse({}).success).toBe(false);
    expect(approveActivitySchema.safeParse({ status: 'pending' }).success).toBe(
      false,
    );
  });

  it('solo SUPERUSUARIO puede reasignar una actividad y valida al nuevo responsable', async () => {
    const find = vi.fn().mockResolvedValue({
      creator: { userId: 'current' },
    });
    const activeCreator = vi.fn().mockResolvedValue(true);
    const update = vi.fn().mockResolvedValue({
      creator: { userId: 'new-owner', username: 'Nuevo responsable' },
    });
    const repository = {
      permissions: vi.fn().mockResolvedValue([P.manage]),
      find,
      activeCreator,
      update,
    } as unknown as ActivitiesRepository;

    await new ActivitiesUseCase(repository).update('admin', 'activity-1', {
      creatorId: 'new-owner',
    });

    expect(activeCreator).toHaveBeenCalledWith('new-owner');
    expect(update).toHaveBeenCalledWith(
      'activity-1',
      { creatorId: 'new-owner' },
      undefined,
    );
  });

  it('rechaza que lead cambie el responsable incluso si envía su propio usuario', async () => {
    const update = vi.fn();
    const repository = {
      permissions: vi.fn().mockResolvedValue([P.updateOwn]),
      update,
    } as unknown as ActivitiesRepository;

    await expect(
      new ActivitiesUseCase(repository).update('lead', 'activity-1', {
        creatorId: 'lead',
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(update).not.toHaveBeenCalled();
  });
});
