import { UsersRepository } from '../../domain/ports/users.repository.js';
import { RbacError } from '../../../common/domain/rbac.error.js';
export class DeleteUserUseCase {
  constructor(private readonly repository: UsersRepository) {}
  async execute(id: string, actorId: string) {
    const current = await this.repository.findById(id);
    if (!current) throw new RbacError('not_found', 'El usuario no existe');

    if (id === actorId)
      throw new RbacError('conflict', 'No puedes eliminar tu propia cuenta');
    await this.repository.delete(id);
  }
}
