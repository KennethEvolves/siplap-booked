import type { UpdateProfile } from '@shared/contracts';
import { ProfileRepository } from '../../domain/ports/profile.repository.js';
import { UsersRepository } from '../../domain/ports/users.repository.js';
import { RbacError } from '../../../common/domain/rbac.error.js';
export class UserProfileUseCase {
  constructor(
    private readonly profiles: ProfileRepository,
    private readonly users: UsersRepository,
  ) {}
  async get(userId: string) {
    const profile = await this.profiles.findByUserId(userId);
    if (!profile) throw new RbacError('not_found', 'El usuario no existe');
    return profile;
  }
  async update(userId: string, input: UpdateProfile) {
    const current = await this.get(userId);
    if (
      input.email !== undefined &&
      (await this.users.existsByEmail(input.email, userId))
    ) {
      throw new RbacError('conflict', 'Ya existe un usuario con ese correo');
    }
    const personalFields = [
      'firstName',
      'lastName',
      'phoneNumber',
      'avatarUrl',
      'dateOfBirth',
      'bio',
    ] as const;
    if (
      !current.dateOfBirth &&
      personalFields.some((field) => input[field] !== undefined) &&
      !input.dateOfBirth
    ) {
      throw new RbacError(
        'invalid',
        'La fecha de nacimiento es obligatoria al crear el perfil',
      );
    }
    return this.profiles.update(userId, input);
  }
}
