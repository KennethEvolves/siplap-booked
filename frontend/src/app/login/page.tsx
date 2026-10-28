'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { Mail, Lock } from 'lucide-react';
import { removeToken } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await signIn('credentials', { email, password, redirect: false });
      if (!response?.ok || response.error) {
        const message = response?.code === 'inactive_account'
          ? 'Tu cuenta está inactiva. Contacta al administrador.'
          : response?.code === 'service_unavailable'
            ? 'No se pudo conectar con el servidor. Intenta nuevamente.'
            : 'Correo o contraseña incorrectos.';
        throw new Error(message);
      }
      removeToken();
      router.replace('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Contraseña incorrecta o error al conectar con el servidor'
      );
    } finally {
      setLoading(false);
    }
  }

  // Cápsula de cada campo (efecto vidrio)
  const pillClass =
    'flex items-center gap-2 rounded-full bg-white/70 backdrop-blur-sm border border-white/60 p-1 ' +
    'focus-within:ring-2 focus-within:ring-white transition-shadow';
  const iconClass =
    'h-9 w-9 shrink-0 rounded-full bg-white border-2 border-white/70 shadow flex items-center justify-center text-uno-negro';
  const inputClass =
    'flex-1 min-w-0 h-9 bg-transparent px-2 text-base sm:text-sm text-uno-negro ' +
    'placeholder:text-uno-negro/60 focus:outline-none';

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-8 bg-cover bg-center"
      style={{
        backgroundImage:
          "linear-gradient(rgba(91,23,26,0.55), rgba(30,30,30,0.55)), url('/fondo-uno.webp'), var(--uno-gradient)",
      }}
    >
      <div className="flex flex-col items-center gap-4 sm:gap-6">

        {/* Logo en blanco, sin contenedor */}
        <Image
          src="/logo-uno-blanco.png"
          alt="Universidad de Oriente, Valladolid, Yucatán"
          width={300}
          height={110}
          priority
          className="w-44 sm:w-60 h-auto brightness-0 invert drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
        />

        {/* Círculo de cristal */}
        <div className="relative w-[clamp(18.5rem,min(94vw,28rem,calc(100dvh_-_13rem)),28rem)] aspect-square">
          <form
            onSubmit={handleSubmit}
            className="h-full w-full rounded-full border border-white/40 bg-black/30 backdrop-blur-md shadow-2xl
              flex flex-col items-center justify-center py-[10%]"
          >
            <div className="w-[66%] flex flex-col gap-2.5 sm:gap-4">
              <h1 className="text-center text-base sm:text-2xl font-semibold uppercase tracking-wide text-white drop-shadow-md">
                Iniciar sesión
              </h1>

              {/* Correo: ícono a la izquierda */}
              <div className={pillClass}>
                <span className={iconClass}>
                  <Mail className="h-4 w-4" />
                </span>
                <label htmlFor="email" className="sr-only">Correo electrónico</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  placeholder="Correo electrónico"
                  className={inputClass}
                />
              </div>

              {/* Contraseña: ícono a la derecha */}
              <div className={pillClass}>
                <label htmlFor="password" className="sr-only">Contraseña</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Contraseña"
                  className={`${inputClass} pl-3`}
                />
                <span className={iconClass}>
                  <Lock className="h-4 w-4" />
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[44px] rounded-full bg-primary hover:bg-uno-ciruela text-primary-foreground
                  font-semibold uppercase tracking-widest shadow-lg transition-colors
                  disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </form>

          {/* El error va debajo del círculo para no deformar el diseño */}
          {error && (
            <div
              role="alert"
              className="absolute left-1/2 top-full mt-4 w-full max-w-sm -translate-x-1/2 rounded-2xl border border-uno-terracota/40 bg-white/95 px-4 py-2.5 text-center text-sm font-medium text-uno-marron shadow-lg"
            >
              {error}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}