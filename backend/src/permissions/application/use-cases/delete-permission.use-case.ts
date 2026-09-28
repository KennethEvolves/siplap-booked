import { PermissionsRepository } from '../../domain/ports/permissions.repository.js';
import { RbacError } from '../../../common/domain/rbac.error.js';
export class DeletePermissionUseCase {
  constructor(private readonly repository: PermissionsRepository) {}
  async execute(id: string) {
    const current = await this.repository.findById(id);
    if (!current) throw new RbacError('not_found', 'El permiso no existe');

    await this.repository.delete(id);
  }
}
