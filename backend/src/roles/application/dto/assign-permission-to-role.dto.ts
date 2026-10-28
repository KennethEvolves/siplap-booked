export type { AssignPermission as AssignPermissionToRoleDto } from '@shared/contracts';

export interface AssignPermissionToRoleResultDto {
  roleId: string;
  permissionId: string;
  createdAt: Date | null;
}
