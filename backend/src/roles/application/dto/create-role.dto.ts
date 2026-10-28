export type { CreateRole as CreateRoleDto } from '@shared/contracts';

export interface CreateRoleResultDto {
  roleId: string;
  name: string | null;
  description: string | null;
  createdAt: Date | null;
}
