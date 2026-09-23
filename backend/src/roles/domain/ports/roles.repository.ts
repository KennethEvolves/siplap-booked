import type { Role } from '../entities/role.entity.js';

export interface CreateRoleData {
  name: string;
  description: string | null;
}

export abstract class RolesRepository {
  abstract existsByName(
    name: string,
  ): Promise<boolean>;

  abstract create(
    data: CreateRoleData,
  ): Promise<Role>;

  abstract findAll(): Promise<Role[]>;
}