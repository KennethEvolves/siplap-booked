import type {
  CreateRoleDto,
  CreateRoleResultDto,
} from '../dto/create-role.dto.js';

import {
  InvalidRoleDataError,
  RoleAlreadyExistsError,
} from '../errors/role.errors.js';

import { RolesRepository } from '../../domain/ports/roles.repository.js';

export class CreateRoleUseCase {
  constructor(
    private readonly rolesRepository: RolesRepository,
  ) {}

  async execute(
    input: CreateRoleDto,
  ): Promise<CreateRoleResultDto> {
    const name = input.name?.trim().toUpperCase();

    const description =
      input.description?.trim() || null;

    if (!name) {
      throw new InvalidRoleDataError(
        'El nombre del rol es obligatorio',
      );
    }

    if (name.length > 100) {
      throw new InvalidRoleDataError(
        'El nombre del rol no puede superar los 100 caracteres',
      );
    }

    if (description && description.length > 255) {
      throw new InvalidRoleDataError(
        'La descripción no puede superar los 255 caracteres',
      );
    }

    const alreadyExists =
      await this.rolesRepository.existsByName(name);

    if (alreadyExists) {
      throw new RoleAlreadyExistsError();
    }

    const role = await this.rolesRepository.create({
      name,
      description,
    });

    return {
      roleId: role.roleId,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt,
    };
  }
}