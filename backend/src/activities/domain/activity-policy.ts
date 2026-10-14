import {
  ACTIVITY_PERMISSIONS as P,
  type ActivityActions,
} from '@shared/contracts';

export class ActivityPolicy {
  constructor(
    readonly userId: string,
    private readonly permissions: readonly string[],
  ) {}
  has(permission: string) {
    return this.permissions.includes(permission);
  }
  get manages() {
    return this.has(P.manage);
  }
  get canCreate() {
    return this.manages || this.has(P.createOwn);
  }
  get canViewAll() {
    return this.manages || this.has(P.viewAll);
  }
  get canViewOwn() {
    return this.has(P.viewOwn);
  }
  get canUpdateAll() {
    return this.manages || this.has(P.updateAll);
  }
  get canApprove() {
    return this.manages || this.has(P.approveAll);
  }
  actions(creatorId: string): ActivityActions {
    const own = creatorId === this.userId;
    return {
      canView: this.canViewAll || (own && this.canViewOwn),
      canUpdate: this.canUpdateAll || (own && this.has(P.updateOwn)),
      canApprove: this.canApprove,
      canDelete: this.manages,
    };
  }
}
