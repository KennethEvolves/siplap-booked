export type { AssignRole as AssignRoleToUserDto } from '@shared/contracts';

export interface AssignRoleToUserResultDto {
  userId: string;
  roleId: string;
  createdAt: Date | null;
}
