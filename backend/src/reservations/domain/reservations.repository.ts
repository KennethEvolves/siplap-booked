import type {
  CreateReservation,
  Reservation,
  ReservationList,
  UpdateReservation,
} from '@shared/contracts';

export abstract class ReservationsRepository {
  abstract permissions(userId: string): Promise<string[]>;
  abstract creators(): Promise<
    { userId: string; username: string | null; email: string }[]
  >;
  abstract list(
    query: ReservationList,
    creatorId?: string,
  ): Promise<{ reservations: Reservation[]; total: number }>;
  abstract find(
    reservationId: string,
    creatorId?: string,
  ): Promise<Reservation | null>;
  abstract create(
    input: CreateReservation & { creatorId: string },
  ): Promise<Reservation>;
  abstract update(
    reservationId: string,
    input: UpdateReservation,
    creatorId?: string,
  ): Promise<Reservation>;
  abstract delete(reservationId: string, creatorId?: string): Promise<void>;
}
