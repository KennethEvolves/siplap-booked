export interface RolePermissionAssignment {
  roleId: string;
  permissionId: string;
  createdAt: Date | null;
}

export abstract class RolePermissionRepository {
  abstract roleExists(
    roleId: string,
  ): Promise<boolean>;

  abstract permissionExists(
    permissionId: string,
  ): Promise<boolean>;

  abstract assignmentExists(
    roleId: string,
    permissionId: string,
  ): Promise<boolean>;

  abstract assignPermission(
    roleId: string,
    permissionId: string,
  ): Promise<RolePermissionAssignment>;
}