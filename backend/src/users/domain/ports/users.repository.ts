import type { User } from '../entities/user.entity.js';

export interface CreateUserData {
  username: string | null;
  email: string;
  passwordHash: string;
}

export abstract class UsersRepository {
  abstract findById(id: string): Promise<User | null>;
  abstract update(id: string, data: Partial<CreateUserData>): Promise<User>;
  abstract delete(id: string): Promise<void>;
  abstract existsByEmail(email: string, excludeId?: string): Promise<boolean>;

  abstract create(data: CreateUserData): Promise<User>;

  abstract findAll(): Promise<User[]>;
}
