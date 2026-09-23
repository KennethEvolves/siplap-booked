export interface AssignRoleToUserDto {
  userId: string;
  roleId: string;
}

export interface AssignRoleToUserResultDto {
  userId: string;
  roleId: string;
  createdAt: Date | null;
}