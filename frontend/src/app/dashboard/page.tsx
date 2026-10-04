import SessionSync from '@/components/SessionSync';
import { redirect } from 'next/navigation';
import { auth, signOut } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.accessToken) redirect('/login');
  if (session.user.roles?.includes('SUPERUSUARIO')) redirect('/admin');
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <SessionSync />
      <section className="mx-auto max-w-2xl rounded-xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold">Bienvenido a  SIPLAP</h1>
        <p className="mt-4">{session.user.name || session.user.email}</p>
        <p className="mt-2">Tu sesión está iniciada correctamente.</p>
        <p className="mt-2">Roles: {session.user.roles?.join(', ') || 'Sin rol asignado'}</p>
        {!session.user.roles?.length && <p className="mt-2">Solicita al administrador los permisos que necesitas.</p>}
        <form action={async () => {
          'use server';
          await signOut({ redirectTo: '/login' });
        }}>
          <button className="mt-6 rounded bg-gray-900 px-4 py-2 text-white" type="submit">Cerrar sesión</button>
        </form>
      </section>
    </main>
  );
}
