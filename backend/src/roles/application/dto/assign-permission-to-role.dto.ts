export interface AssignPermissionToRoleDto {
  roleId: string;
  permissionId: string;
}

export interface AssignPermissionToRoleResultDto {
  roleId: string;
  permissionId: string;
  createdAt: Date | null;
}