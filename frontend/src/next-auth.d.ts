import type { DefaultSession } from 'next-auth';
declare module 'next-auth' {
  interface User { accessToken?: string; roles?: string[]; }
  interface Session {
    user: DefaultSession['user'] & { id?: string; accessToken?: string; roles?: string[]; };
  }
}
declare module 'next-auth/jwt' {
  interface JWT { accessToken?: string; roles?: string[]; userId?: string; }
}
