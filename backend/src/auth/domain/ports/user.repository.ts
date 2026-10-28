import type { AuthUser } from '../entities/auth-user.entity.js';

export abstract class UserRepository {
  abstract findById(id: string): Promise<AuthUser | null>;
  abstract findByEmail(email: string): Promise<AuthUser | null>;
}