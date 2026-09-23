import type { User } from '../entities/user.entity.js';

export interface CreateUserData {
  username: string | null;
  email: string;
  passwordHash: string;
}

export abstract class UsersRepository {
  abstract existsByEmail(
    email: string,
  ): Promise<boolean>;

  abstract create(
    data: CreateUserData,
  ): Promise<User>;

  abstract findAll(): Promise<User[]>;
}