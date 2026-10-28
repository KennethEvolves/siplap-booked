import { UserRoleRepository } from '../../domain/ports/user-role.repository.js';
import { InvalidUserRoleDataError, RoleNotFoundError, UserNotFoundError } from '../errors/user-role.errors.js';

export class RemoveRoleFromUserUseCase {
  constructor(private readonly repository: UserRoleRepository) {}

  async execute(userId: string, roleId: string, actorId: string): Promise<void> {
    if (!await this.repository.userExists(userId)) throw new UserNotFoundError();
    if (!await this.repository.roleExists(roleId)) throw new RoleNotFoundError();
    if (userId === actorId && await this.repository.roleName(roleId) === 'SUPERUSUARIO') {
      throw new InvalidUserRoleDataError('No puedes quitarte tu propio rol SUPERUSUARIO. Solicita el cambio a otro superusuario.');
    }
    await this.repository.removeRole(userId, roleId);
  }
}
