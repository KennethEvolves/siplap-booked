import type {
  AssignRoleToUserDto,
  AssignRoleToUserResultDto,
} from '../dto/assign-role-to-user.dto.js';

import {
  InvalidUserRoleDataError,
  RoleNotFoundError,
  UserAlreadyHasRoleError,
  UserNotFoundError,
} from '../errors/user-role.errors.js';

import { UserRoleRepository } from '../../domain/ports/user-role.repository.js';

export class AssignRoleToUserUseCase {
  constructor(
    private readonly userRoleRepository: UserRoleRepository,
  ) {}

  async execute(
    input: AssignRoleToUserDto,
    replace = false,
    actorId?: string,
  ): Promise<AssignRoleToUserResultDto> {
    const userId = input.userId?.trim();
    const roleId = input.roleId?.trim();

    if (!userId) {
      throw new InvalidUserRoleDataError(
        'El userId es obligatorio',
      );
    }

    if (!roleId) {
      throw new InvalidUserRoleDataError(
        'El roleId es obligatorio',
      );
    }

    const userExists =
      await this.userRoleRepository.userExists(userId);

    if (!userExists) {
      throw new UserNotFoundError();
    }

    const roleExists =
      await this.userRoleRepository.roleExists(roleId);

    if (!roleExists) {
      throw new RoleNotFoundError();
    }

    if (replace) {
      if (userId === actorId) {
        throw new InvalidUserRoleDataError('No puedes reemplazar tus propios roles. Solicita el cambio a otro superusuario.');
      }
      return this.userRoleRepository.replaceRole(userId, roleId);
    }

    const alreadyAssigned =
      await this.userRoleRepository.assignmentExists(
        userId,
        roleId,
      );

    if (alreadyAssigned) {
      throw new UserAlreadyHasRoleError();
    }

    const assignment =
      await this.userRoleRepository.assignRole(
        userId,
        roleId,
      );

    return {
      userId: assignment.userId,
      roleId: assignment.roleId,
      createdAt: assignment.createdAt,
    };
  }
}