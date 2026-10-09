import { describe, it, expect, vi } from 'vitest';
import { UserProfileUseCase } from './user-profile.use-case.js';
import { ProfileRepository } from '../../domain/ports/profile.repository.js';
import { UsersRepository } from '../../domain/ports/users.repository.js';

describe('caso de uso de perfil', () => {
  function setup(dateOfBirth: string | null = null) {
    const profiles = {
      findByUserId: vi.fn().mockResolvedValue({ userId: 'owner', dateOfBirth }),
      update: vi.fn().mockResolvedValue({ userId: 'owner' }),
    };
    const users = { existsByEmail: vi.fn().mockResolvedValue(false) };
    const useCase = new UserProfileUseCase(
      profiles as unknown as ProfileRepository,
      users as unknown as UsersRepository,
    );
    return { useCase, profiles, users };
  }
  it('usa únicamente el ID autenticado y conserva campos omitidos', async () => {
    const c = setup('1990-01-01');
    await c.useCase.update('owner', { bio: null });
    expect(c.profiles.update).toHaveBeenCalledWith('owner', { bio: null });
  });
  it('requiere fecha real para el primer perfil personal', async () => {
    const c = setup();
    await expect(
      c.useCase.update('owner', { firstName: 'Ana' }),
    ).rejects.toMatchObject({ kind: 'invalid' });
    expect(c.profiles.update).not.toHaveBeenCalled();
  });
  it('permite editar la cuenta sin crear un perfil incompleto', async () => {
    const c = setup();
    await c.useCase.update('owner', { username: 'Usuario' });
    expect(c.profiles.update).toHaveBeenCalled();
  });
  it('rechaza correos duplicados y no persiste cambios', async () => {
    const c = setup();
    c.users.existsByEmail.mockResolvedValue(true);
    await expect(
      c.useCase.update('owner', { email: 'other@example.test' }),
    ).rejects.toMatchObject({ kind: 'conflict' });
    expect(c.profiles.update).not.toHaveBeenCalled();
  });
  it('devuelve no encontrado si desaparece la cuenta', async () => {
    const c = setup();
    c.profiles.findByUserId.mockResolvedValue(null);
    await expect(c.useCase.get('owner')).rejects.toMatchObject({
      kind: 'not_found',
    });
  });
});
