import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface User {
    id?: string;
    accessToken?: string;
    roles?: string[];
    permissions?: string[];
  }

  interface Session {
    user: DefaultSession['user'] & {
      id?: string;
      accessToken?: string;
      roles?: string[];
      permissions?: string[];
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    roles?: string[];
    permissions?: string[];
    userId?: string;
  }
}