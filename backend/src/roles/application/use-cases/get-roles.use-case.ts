import type { Role } from '../../domain/entities/role.entity.js';

import { RolesRepository } from '../../domain/ports/roles.repository.js';

export class GetRolesUseCase {
  constructor(
    private readonly rolesRepository:
      RolesRepository,
  ) {}

  async execute(): Promise<Role[]> {
    return this.rolesRepository.findAll();
  }
}