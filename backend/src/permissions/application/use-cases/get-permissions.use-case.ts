import type { Permission } from '../../domain/entities/permission.entity.js';

import { PermissionsRepository } from '../../domain/ports/permissions.repository.js';

export class GetPermissionsUseCase {
  constructor(
    private readonly permissionsRepository:
      PermissionsRepository,
  ) {}

  async execute(): Promise<
    Permission[]
  > {
    return this.permissionsRepository.findAll();
  }
}