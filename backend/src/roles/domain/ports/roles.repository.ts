import type { Role } from '../entities/role.entity.js';

export interface CreateRoleData {
  name: string;
  description: string | null;
}

export abstract class RolesRepository {
  abstract findById(id: string): Promise<Role | null>;
  abstract update(id: string, data: Partial<CreateRoleData>): Promise<Role>;
  abstract delete(id: string): Promise<void>;
  abstract existsByName(name: string, excludeId?: string): Promise<boolean>;

  abstract create(data: CreateRoleData): Promise<Role>;

  abstract findAll(): Promise<Role[]>;
}
