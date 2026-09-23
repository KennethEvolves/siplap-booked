export interface CreateRoleDto {
  name: string;
  description?: string;
}

export interface CreateRoleResultDto {
  roleId: string;
  name: string | null;
  description: string | null;
  createdAt: Date | null;
}