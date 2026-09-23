export interface AuthTokenPayload {
  sub: string;
  email: string;
  roles: string[];
}

export abstract class TokenServicePort {
  abstract sign(payload: AuthTokenPayload): Promise<string> | string;
}