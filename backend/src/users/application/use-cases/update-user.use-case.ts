import type { UpdateUser } from '@shared/contracts';
import { UsersRepository } from '../../domain/ports/users.repository.js';
import { RbacError } from '../../../common/domain/rbac.error.js';
import { PasswordEncoderPort } from '../../domain/ports/password-encoder.port.js';
export class UpdateUserUseCase {
  constructor(
    private readonly repository: UsersRepository,
    private readonly encoder: PasswordEncoderPort,
  ) {}
  async execute(id: string, input: UpdateUser) {
    const current = await this.repository.findById(id);
    if (!current) throw new RbacError('not_found', 'El usuario no existe');

    if (
      input.email !== undefined &&
      (await this.repository.existsByEmail(input.email, id))
    )
      throw new RbacError('conflict', 'Ya existe un usuario con ese correo');
    const { password, ...data } = input;
    return this.repository.update(id, {
      ...data,
      ...(password === undefined
        ? {}
        : { passwordHash: await this.encoder.hash(password) }),
    });
  }
}
