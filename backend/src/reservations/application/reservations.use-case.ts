import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  RESERVATION_PERMISSIONS as P,
  type CreateReservation,
  type Reservation,
  type ReservationList,
  type UpdateReservation,
} from '@shared/contracts';
import { ReservationsPolicy } from '../domain/reservations.policy.js';
import { ReservationsRepository } from '../domain/reservations.repository.js';

export class ReservationsUseCase {
  constructor(private readonly repository: ReservationsRepository) {}

  private async policy(userId: string) {
    return new ReservationsPolicy(
      userId,
      await this.repository.permissions(userId),
    );
  }

  private require(allowed: boolean) {
    if (!allowed)
      throw new ForbiddenException(
        'No tienes permiso para realizar esta operación',
      );
  }

  private present(reservation: Reservation, policy: ReservationsPolicy) {
    return {
      ...reservation,
      actions: policy.actions(reservation.creator.userId),
    };
  }

  async list(userId: string, query: ReservationList) {
    const policy = await this.policy(userId);
    this.require(policy.canViewAll || policy.canViewOwn);
    const result = await this.repository.list(
      query,
      policy.canViewAll ? undefined : userId,
    );
    return {
      ...result,
      reservations: result.reservations.map((item) =>
        this.present(item, policy),
      ),
      capabilities: {
        canCreate: policy.canCreate,
        canManage: policy.manages,
        canViewAll: policy.canViewAll,
      },
      ...query,
    };
  }

  async creators(userId: string) {
    const policy = await this.policy(userId);
    this.require(policy.manages);
    return this.repository.creators();
  }

  async get(userId: string, reservationId: string) {
    const policy = await this.policy(userId);
    this.require(policy.canViewAll || policy.canViewOwn);
    const reservation = await this.repository.find(
      reservationId,
      policy.canViewAll ? undefined : userId,
    );
    if (!reservation)
      throw new NotFoundException('Reservación no encontrada');
    return this.present(reservation, policy);
  }

  async create(userId: string, input: CreateReservation) {
    const policy = await this.policy(userId);
    this.require(policy.canCreate);
    return this.present(
      await this.repository.create({
        ...input,
        creatorId: policy.manages ? (input.creatorId ?? userId) : userId,
      }),
      policy,
    );
  }

  async update(
    userId: string,
    reservationId: string,
    input: UpdateReservation,
  ) {
    const policy = await this.policy(userId);
    const manageAll = policy.manages;
    this.require(manageAll || policy.has(P.updateOwn));
    return this.present(
      await this.repository.update(
        reservationId,
        input,
        manageAll ? undefined : userId,
      ),
      policy,
    );
  }

  async delete(userId: string, reservationId: string) {
    const policy = await this.policy(userId);
    const manageAll = policy.manages;
    this.require(manageAll || policy.has(P.deleteOwn));
    await this.repository.delete(
      reservationId,
      manageAll ? undefined : userId,
    );
  }
}
