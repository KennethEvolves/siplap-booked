import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

class InactiveAccountError extends CredentialsSignin { code = 'inactive_account'; }
class AuthenticationUnavailableError extends CredentialsSignin { code = 'service_unavailable'; }

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET || 'clave_secreta_super_segura_para_cookies_frontend_siplap_2026',
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Correo', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

          const response = await fetch(`${apiUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (response.status === 403) throw new InactiveAccountError();
          if (response.status >= 500) throw new AuthenticationUnavailableError();
          if (!response.ok) {
            return null;
          }

          const data = await response.json();

          if (typeof data.accessToken !== 'string' || !data.accessToken || !data.user) return null;
          return {
            id: data.user?.userId || data.user?.id,
            name: data.user?.username || data.user?.name,
            email: data.user?.email,
            roles: data.user?.roles || [],
            accessToken: data.accessToken,
          };
        } catch (error) {
          if (error instanceof CredentialsSignin) throw error;
          throw new AuthenticationUnavailableError();
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.roles = user.roles;
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.accessToken = typeof token.accessToken === 'string' ? token.accessToken : undefined;
        session.user.roles = Array.isArray(token.roles) ? token.roles.filter((role): role is string => typeof role === 'string') : [];
        session.user.id = typeof token.userId === 'string' ? token.userId : token.sub ?? '';
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
});