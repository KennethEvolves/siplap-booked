import { describe, it, expect, vi } from 'vitest';
import { LoginUseCase } from './login.use-case.js';
import { InvalidCredentialsError, InactiveUserError } from '../errors/auth.errors.js';
import type { AuthUser } from '../../domain/entities/auth-user.entity.js';

const account: AuthUser = {
  userId: 'test-user', email: 'user@example.test', username: 'Usuario',
  passwordHash: 'hash', status: 'ACTIVE', roles: [],
};
function setup(user: AuthUser | null = account, valid = true) {
  const repository = { findByEmail: vi.fn().mockResolvedValue(user) };
  const hasher = { compare: vi.fn().mockResolvedValue(valid) };
  const tokens = { sign: vi.fn().mockReturnValue('jwt') };
  return { useCase: new LoginUseCase(repository, hasher, tokens), repository, tokens };
}
describe('login de todas las cuentas activas', () => {
  it.each([[], ['MAESTRO'], ['COORDINADOR'], ['JEFE DE PLAZA'], ['SUPERUSUARIO']].map(roles => ({ roles })))('admite roles $roles sin elevar privilegios', async ({ roles }) => {
    const c = setup({ ...account, roles });
    const result = await c.useCase.execute({ email: ' USER@example.test ', password: 'password' });
    expect(c.repository.findByEmail).toHaveBeenCalledWith('user@example.test');
    expect(result.accessToken).toBe('jwt');
    expect(result.user.roles).toEqual(roles);
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(c.tokens.sign).toHaveBeenCalledWith({ sub: account.userId, email: account.email, roles });
  });
  it('rechaza contraseña incorrecta', async () => {
    const c = setup(account, false);
    await expect(c.useCase.execute({ email: account.email, password: 'wrong' })).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(c.tokens.sign).not.toHaveBeenCalled();
  });
  it('rechaza cuenta inexistente', async () => {
    const c = setup(null);
    await expect(c.useCase.execute({ email: account.email, password: 'password' })).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
  it('rechaza cuenta inactiva', async () => {
    const c = setup({ ...account, status: 'INACTIVE' });
    await expect(c.useCase.execute({ email: account.email, password: 'password' })).rejects.toBeInstanceOf(InactiveUserError);
    expect(c.tokens.sign).not.toHaveBeenCalled();
  });
});
