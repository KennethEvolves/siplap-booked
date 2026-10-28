import type { Permission } from '../entities/permission.entity.js';

export interface CreatePermissionData {
  name: string | null;
  slug: string;
  description: string | null;
}

export abstract class PermissionsRepository {
  abstract findById(id: string): Promise<Permission | null>;
  abstract update(
    id: string,
    data: Partial<CreatePermissionData>,
  ): Promise<Permission>;
  abstract delete(id: string): Promise<void>;
  abstract existsBySlug(slug: string, excludeId?: string): Promise<boolean>;

  abstract create(data: CreatePermissionData): Promise<Permission>;

  abstract findAll(): Promise<Permission[]>;
}
