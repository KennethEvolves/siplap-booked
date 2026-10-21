'use client';

import { useState, type FormEvent } from 'react';
import { createPermissionSchema } from '@shared/contracts';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/Button';

const fieldClass =
  'mt-1 w-full min-h-[44px] rounded-xl border border-input bg-background px-3.5 py-2.5 text-base sm:text-sm text-foreground ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60';

export default function CreatePermissionForm({ onCreated }: { onCreated: () => Promise<void> }) {
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');
    setSuccess('');
    const result = createPermissionSchema.safeParse({ slug, ...(name.trim() ? { name } : {}) });
    if (!result.success) {
      setError(result.error.issues.map(issue => issue.message).join('. '));
      return;
    }
    setBusy(true);
    try {
      await apiFetch('/permissions', { method: 'POST', body: JSON.stringify(result.data) });
      setSlug('');
      setName('');
      await onCreated();
      setSuccess(`Permiso ${result.data.slug} creado.`);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'No se pudo crear el permiso');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 md:p-5 shadow-sm">
      <h2 className="text-base font-bold text-foreground">Crear permiso</h2>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div>
          <label htmlFor="new-permission-slug" className="block text-sm font-medium text-foreground">
            Identificador del permiso
          </label>
          <input
            id="new-permission-slug"
            value={slug}
            onChange={event => setSlug(event.target.value)}
            required
            maxLength={255}
            placeholder="activity:create_own"
            disabled={busy}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="new-permission-name" className="block text-sm font-medium text-foreground">
            Nombre del permiso (opcional)
          </label>
          <input
            id="new-permission-name"
            value={name}
            onChange={event => setName(event.target.value)}
            maxLength={150}
            disabled={busy}
            className={fieldClass}
          />
        </div>
        {error && (
          <p role="alert" className="p-3 rounded-xl text-xs font-medium border border-uno-terracota/40 bg-uno-terracota/10 text-uno-marron">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="p-3 rounded-xl text-xs font-medium border border-uno-olivo/40 bg-uno-verde text-uno-negro">
            {success}
          </p>
        )}
        <Button
          type="submit"
          disabled={busy}
          className="w-full sm:w-auto min-h-[44px] bg-primary hover:bg-uno-ciruela text-primary-foreground rounded-xl"
        >
          {busy ? 'Creando...' : 'Crear permiso'}
        </Button>
      </form>
    </section>
  );
}