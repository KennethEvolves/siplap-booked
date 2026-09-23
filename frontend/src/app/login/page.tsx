'use client';

import {
  FormEvent,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';

import {
  apiFetch,
  saveToken,
} from '../../lib/api';

interface LoginResponse {
  accessToken: string;

  user: {
    userId: string;
    username: string | null;
    email: string;
    roles: string[];
  };
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] =
    useState(
      'admin@siplap.com',
    );

  const [
    password,
    setPassword,
  ] = useState('');

  const [error, setError] =
    useState('');

  const [
    loading,
    setLoading,
  ] = useState(false);

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError('');
    setLoading(true);

    try {
      const response =
        await apiFetch<LoginResponse>(
          '/auth/login',

          {
            method: 'POST',

            body: JSON.stringify({
              email,
              password,
            }),
          },

          false,
        );

      saveToken(
        response.accessToken,
      );

      router.push('/admin');
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'No se pudo iniciar sesión',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',

        display: 'flex',

        justifyContent:
          'center',

        alignItems: 'center',

        background:
          '#f3f4f6',

        fontFamily:
          'Arial, sans-serif',
      }}
    >
      <form
        onSubmit={
          handleSubmit
        }
        style={{
          width: '380px',

          padding: '35px',

          background: '#fff',

          borderRadius: '16px',

          boxShadow:
            '0 10px 30px rgba(0,0,0,.1)',
        }}
      >
        <h1
          style={{
            marginBottom: 5,
          }}
        >
          SIPLAP
        </h1>

        <p
          style={{
            color: '#666',
            marginBottom: 25,
          }}
        >
          Panel de administración
        </p>

        <label>
          Correo electrónico
        </label>

        <input
          type="email"
          value={email}
          onChange={(event) =>
            setEmail(
              event.target.value,
            )
          }
          required
          style={{
            width: '100%',
            boxSizing:
              'border-box',
            padding: 12,
            marginTop: 6,
            marginBottom: 18,
            border:
              '1px solid #ccc',
            borderRadius: 8,
          }}
        />

        <label>
          Contraseña
        </label>

        <input
          type="password"
          value={password}
          onChange={(event) =>
            setPassword(
              event.target.value,
            )
          }
          required
          style={{
            width: '100%',
            boxSizing:
              'border-box',
            padding: 12,
            marginTop: 6,
            border:
              '1px solid #ccc',
            borderRadius: 8,
          }}
        />

        {error && (
          <div
            style={{
              marginTop: 15,
              padding: 10,
              background:
                '#fee2e2',
              color:
                '#991b1b',
              borderRadius: 8,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            marginTop: 20,
            padding: 12,
            border: 0,
            borderRadius: 8,
            background:
              '#111827',
            color: '#fff',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          {loading
            ? 'Iniciando...'
            : 'Iniciar sesión'}
        </button>
      </form>
    </main>
  );
}