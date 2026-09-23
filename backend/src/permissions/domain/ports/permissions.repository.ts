import type { Permission } from '../entities/permission.entity.js';

export interface CreatePermissionData {
  name: string | null;
  slug: string;
  description: string | null;
}

export abstract class PermissionsRepository {
  abstract existsBySlug(
    slug: string,
  ): Promise<boolean>;

  abstract create(
    data: CreatePermissionData,
  ): Promise<Permission>;

  abstract findAll(): Promise<
    Permission[]
  >;
}