import type { UpdateRole } from '@shared/contracts';
import { RolesRepository } from '../../domain/ports/roles.repository.js';
import { RbacError } from '../../../common/domain/rbac.error.js';

export class UpdateRoleUseCase {
  constructor(private readonly repository: RolesRepository) {}
  async execute(id: string, input: UpdateRole) {
    const current = await this.repository.findById(id);
    if (!current) throw new RbacError('not_found', 'El rol no existe');
    if (
      current.name === 'SUPERUSUARIO' &&
      input.name !== undefined &&
      input.name !== current.name
    )
      throw new RbacError(
        'conflict',
        'No se puede renombrar el rol SUPERUSUARIO',
      );
    if (
      input.name !== undefined &&
      (await this.repository.existsByName(input.name, id))
    )
      throw new RbacError('conflict', 'Ya existe un rol con ese nombre');
    return this.repository.update(id, input);
  }
}
