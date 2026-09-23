import type {
  AssignPermissionToRoleDto,
  AssignPermissionToRoleResultDto,
} from '../dto/assign-permission-to-role.dto.js';

import {
  InvalidRolePermissionDataError,
  PermissionNotFoundError,
  RoleAlreadyHasPermissionError,
  RoleNotFoundError,
} from '../errors/role-permission.errors.js';

import { RolePermissionRepository } from '../../domain/ports/role-permission.repository.js';

export class AssignPermissionToRoleUseCase {
  constructor(
    private readonly rolePermissionRepository: RolePermissionRepository,
  ) {}

  async execute(
    input: AssignPermissionToRoleDto,
  ): Promise<AssignPermissionToRoleResultDto> {
    const roleId = input.roleId?.trim();
    const permissionId = input.permissionId?.trim();

    if (!roleId) {
      throw new InvalidRolePermissionDataError(
        'El roleId es obligatorio',
      );
    }

    if (!permissionId) {
      throw new InvalidRolePermissionDataError(
        'El permissionId es obligatorio',
      );
    }

    const roleExists =
      await this.rolePermissionRepository.roleExists(
        roleId,
      );

    if (!roleExists) {
      throw new RoleNotFoundError();
    }

    const permissionExists =
      await this.rolePermissionRepository.permissionExists(
        permissionId,
      );

    if (!permissionExists) {
      throw new PermissionNotFoundError();
    }

    const alreadyAssigned =
      await this.rolePermissionRepository.assignmentExists(
        roleId,
        permissionId,
      );

    if (alreadyAssigned) {
      throw new RoleAlreadyHasPermissionError();
    }

    const assignment =
      await this.rolePermissionRepository.assignPermission(
        roleId,
        permissionId,
      );

    return {
      roleId: assignment.roleId,
      permissionId: assignment.permissionId,
      createdAt: assignment.createdAt,
    };
  }
}