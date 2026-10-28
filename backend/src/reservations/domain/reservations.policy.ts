import {
  RESERVATION_PERMISSIONS as P,
  type ReservationActions,
} from '@shared/contracts';

export class ReservationsPolicy {
  constructor(
    readonly userId: string,
    private readonly permissions: readonly string[],
  ) {}

  has(permission: string) {
    return this.permissions.includes(permission);
  }

  get manages() {
    return this.has('manage:all') || this.has(P.manage);
  }

  get canCreate() {
    return this.manages || this.has(P.createOwn);
  }

  get canViewAll() {
    return this.manages || this.has(P.viewAll);
  }

  get canViewOwn() {
    return this.manages || this.has(P.viewOwn);
  }

  get canViewAssigned() {
    return this.has(P.viewAssigned);
  }

  actions(creatorId: string): ReservationActions {
    const own = creatorId === this.userId;
    return {
      canView: this.canViewAll || (own && this.canViewOwn) || this.canViewAssigned,
      canUpdate: this.manages || (own && this.has(P.updateOwn)),
      canDelete: this.manages || (own && this.has(P.deleteOwn)),
    };
  }
}
