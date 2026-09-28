export type { CreateUser as CreateUserDto } from '@shared/contracts';

export interface CreateUserResultDto {
  userId: string;
  username: string | null;
  email: string;
  status: string | null;
  createdAt: Date | null;
}
