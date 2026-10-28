import type { AssignPermissionToRoleDto } from '../dto/assign-permission-to-role.dto.js';
import {
  InvalidRolePermissionDataError,
  PermissionNotFoundError,
  RoleNotFoundError,
} from '../errors/role-permission.errors.js';
import { RolePermissionRepository } from '../../domain/ports/role-permission.repository.js';

export class RemovePermissionFromRoleUseCase {
  constructor(
    private readonly rolePermissionRepository: RolePermissionRepository,
  ) {}

  async execute(input: AssignPermissionToRoleDto): Promise<void> {
    const roleId = input.roleId?.trim();
    const permissionId = input.permissionId?.trim();

    if (!roleId) {
      throw new InvalidRolePermissionDataError('El roleId es obligatorio');
    }

    if (!permissionId) {
      throw new InvalidRolePermissionDataError('El permissionId es obligatorio');
    }

    const roleExists = await this.rolePermissionRepository.roleExists(roleId);
    if (!roleExists) {
      throw new RoleNotFoundError();
    }

    const permissionExists = await this.rolePermissionRepository.permissionExists(permissionId);
    if (!permissionExists) {
      throw new PermissionNotFoundError();
    }

    await this.rolePermissionRepository.removePermission(roleId, permissionId);
  }
}