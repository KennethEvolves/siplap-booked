import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

export const { handlers, signIn, signOut, auth } = NextAuth({
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

          if (!response.ok) {
            return null;
          }

          const data = await response.json();

          // Retornamos el objeto usuario con los datos devueltos por NestJS
          return {
            id: data.user?.userId || data.user?.id,
            name: data.user?.username || data.user?.name,
            email: data.user?.email,
            roles: data.user?.roles || [],
            accessToken: data.accessToken,
          };
        } catch (error) {
          console.error('Error al autenticar contra NestJS:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    // 1. Inyectar el accessToken y roles al JWT de sesión de Auth.js
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as any).accessToken;
        token.roles = (user as any).roles;
        token.userId = (user as any).id;
      }
      return token;
    },
    // 2. Exponer el token y roles cuando se consulte la sesión con auth()
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).accessToken = token.accessToken;
        (session.user as any).roles = token.roles;
        (session.user as any).id = token.userId;
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