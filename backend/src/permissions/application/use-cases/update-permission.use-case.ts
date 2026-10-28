import type { UpdatePermission } from '@shared/contracts';
import { PermissionsRepository } from '../../domain/ports/permissions.repository.js';
import { RbacError } from '../../../common/domain/rbac.error.js';

export class UpdatePermissionUseCase {
  constructor(private readonly repository: PermissionsRepository) {}
  async execute(id: string, input: UpdatePermission) {
    const current = await this.repository.findById(id);
    if (!current) throw new RbacError('not_found', 'El permiso no existe');

    if (
      input.slug !== undefined &&
      (await this.repository.existsBySlug(input.slug, id))
    )
      throw new RbacError('conflict', 'Ya existe un permiso con ese slug');
    return this.repository.update(id, input);
  }
}
