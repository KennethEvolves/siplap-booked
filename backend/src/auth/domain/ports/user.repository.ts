import type { AuthUser } from '../entities/auth-user.entity.js';

export abstract class UserRepository {
  abstract findByEmail(email: string): Promise<AuthUser | null>;
}