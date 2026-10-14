'use client';

import { useState, type FormEvent } from 'react';
import { createPermissionSchema } from '@shared/contracts';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/Button';

export default function CreatePermissionForm({ onCreated }: { onCreated: () => Promise<void> }) {
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(''); setSuccess('');
    const result = createPermissionSchema.safeParse({ slug, ...(name.trim() ? { name } : {}) });
    if (!result.success) { setError(result.error.issues.map(issue => issue.message).join('. ')); return; }
    setBusy(true);
    try {
      await apiFetch('/permissions', { method: 'POST', body: JSON.stringify(result.data) });
      setSlug(''); setName('');
      await onCreated();
      setSuccess(`Permiso ${result.data.slug} creado.`);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'No se pudo crear el permiso');
    } finally { setBusy(false); }
  }
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="text-base font-bold text-slate-900">Crear permiso</h2>
    <form onSubmit={submit} className="mt-4 space-y-3">
      <div><label htmlFor="new-permission-slug" className="block text-sm font-medium">Identificador del permiso</label>
        <input id="new-permission-slug" value={slug} onChange={event => setSlug(event.target.value)} required maxLength={255} placeholder="activity:create_own" disabled={busy} className="mt-1 w-full rounded-lg border border-slate-300 p-2" /></div>
      <div><label htmlFor="new-permission-name" className="block text-sm font-medium">Nombre del permiso (opcional)</label>
        <input id="new-permission-name" value={name} onChange={event => setName(event.target.value)} maxLength={150} disabled={busy} className="mt-1 w-full rounded-lg border border-slate-300 p-2" /></div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {success && <p role="status" className="text-sm text-green-700">{success}</p>}
      <Button type="submit" disabled={busy}>{busy ? 'Creando...' : 'Crear permiso'}</Button>
    </form>
  </section>;
}
