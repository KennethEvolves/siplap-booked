import { RolesRepository } from '../../domain/ports/roles.repository.js';
import { RbacError } from '../../../common/domain/rbac.error.js';
export class DeleteRoleUseCase {
  constructor(private readonly repository: RolesRepository) {}
  async execute(id: string) {
    const current = await this.repository.findById(id);
    if (!current) throw new RbacError('not_found', 'El rol no existe');
    if (current.name === 'SUPERUSUARIO')
      throw new RbacError(
        'conflict',
        'No se puede eliminar el rol SUPERUSUARIO',
      );

    await this.repository.delete(id);
  }
}
