export interface CreateUserDto {
  username?: string;
  email: string;
  password: string;
}

export interface CreateUserResultDto {
  userId: string;
  username: string | null;
  email: string;
  status: string | null;
  createdAt: Date | null;
}