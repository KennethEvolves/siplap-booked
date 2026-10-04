'use client';

import { useEffect } from 'react';
import { getSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';

// Refleja cambios de rol realizados desde otra cuenta sin volver a iniciar sesión.
export default function SessionSync() {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    let disposed = false;
    let pending = false;
    const sync = async () => {
      if (pending) return;
      pending = true;
      try {
        const session = await getSession();
        if (disposed) return;
        if (!session?.user?.accessToken) { router.replace('/login'); return; }
        const admin = session.user.roles?.includes('SUPERUSUARIO');
        
        // Bloquear acceso a /admin si NO es superusuario
        if (pathname.startsWith('/admin') && !admin) {
          router.replace('/dashboard');
        } else if (pathname.startsWith('/dashboard')) {
          router.refresh();
        }
      } finally { pending = false; }
    };
    const check = () => { void sync().catch(() => { /* Reintenta en el siguiente foco o intervalo. */ }); };
    check();
    window.addEventListener('focus', check);
    const timer = window.setInterval(check, 30000);
    return () => { disposed = true; window.removeEventListener('focus', check); window.clearInterval(timer); };
  }, [pathname, router]);
  return null;
}