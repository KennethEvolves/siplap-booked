export interface CreatePermissionDto {
  name?: string;
  slug: string;
  description?: string;
}

export interface CreatePermissionResultDto {
  permissionId: string;
  name: string | null;
  slug: string;
  description: string | null;
  createdAt: Date | null;
}