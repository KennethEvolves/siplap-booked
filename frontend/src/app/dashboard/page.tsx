import SessionSync from '@/components/SessionSync';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import DashboardContent from './DashboardContent';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.accessToken) {
    redirect('/login');
  }

  return (
    <>
      <SessionSync />
      <DashboardContent user={session.user} />
    </>
  );
}