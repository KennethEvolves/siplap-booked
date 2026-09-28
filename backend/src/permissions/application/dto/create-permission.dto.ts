export type { CreatePermission as CreatePermissionDto } from '@shared/contracts';

export interface CreatePermissionResultDto {
  permissionId: string;
  name: string | null;
  slug: string;
  description: string | null;
  createdAt: Date | null;
}
