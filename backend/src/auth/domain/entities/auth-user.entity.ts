export interface AuthUser {
  userId: string;
  username: string | null;
  email: string;
  passwordHash: string;
  status: string | null;
  roles: string[];
}