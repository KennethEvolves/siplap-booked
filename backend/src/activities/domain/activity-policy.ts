import {
  ACTIVITY_PERMISSIONS as P,
  type ActivityActions,
} from '@shared/contracts';

export type ActivityApprovalDirection = 'planning' | 'academic' | 'administrative';

export class ActivityPolicy {
  constructor(
    readonly userId: string,
    private readonly permissions: readonly string[],
  ) {}

  has(permission: string): boolean {
    return this.permissions.includes(permission);
  }

  get manages(): boolean {
    return this.has('manage:all') || this.has(P.manage);
  }

  get canCreate(): boolean {
    return this.manages || this.has(P.createOwn);
  }

  get canViewAll(): boolean {
    return this.manages || this.has(P.viewAll);
  }

  get canViewOwn(): boolean {
    return this.has(P.viewOwn);
  }

  get canViewAssigned(): boolean {
    return this.has(P.viewAssigned);
  }

  get canUpdateAll(): boolean {
    return this.manages || this.has(P.updateAll);
  }

  get canApprovePlanning(): boolean {
    return this.manages || this.has('activity:approve_planning') || this.has(P.approveAll);
  }

  get canApproveAcademic(): boolean {
    return this.manages || this.has('activity:approve_academic') || this.has(P.approveAll);
  }

  get canApproveAdministrative(): boolean {
    return this.manages || this.has('activity:approve_administrative') || this.has(P.approveAll);
  }

  get canApprove(): boolean {
    return (
      this.canApprovePlanning ||
      this.canApproveAcademic ||
      this.canApproveAdministrative
    );
  }

  canApproveDirection(direction: ActivityApprovalDirection): boolean {
    switch (direction) {
      case 'planning':
        return this.canApprovePlanning;
      case 'academic':
        return this.canApproveAcademic;
      case 'administrative':
        return this.canApproveAdministrative;
      default:
        return false;
    }
  }

  actions(creatorId: string): ActivityActions {
    const own = creatorId === this.userId;
    return {
      canView: this.canViewAll || (own && this.canViewOwn) || this.canViewAssigned,
      canUpdate: this.canUpdateAll || (own && this.has(P.updateOwn)),
      canApprove: this.canApprove,
      canDelete: this.manages,
    };
  }
}