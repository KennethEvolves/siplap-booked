import { describe, expect, it } from 'vitest';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import {
  BASE_PERMISSIONS,
  FULL_PERMISSIONS_CATALOG,
  seedRbac,
} from './rbac.seed.js';

function database() {
  type Permission = {
    permission_id: string;
    slug: string;
    name?: string | null;
    description?: string | null;
  };
  type Role = {
    role_id: string;
    name: string | null;
    description?: string | null;
  };
  type Link = { role_id: string; permission_id: string };
  const roles: Role[] = [];
  const permissions: Permission[] = [];
  const links: Link[] = [];
  let sequence = 0;

  const prisma = {
    roles: {
      findFirst: async ({ where }: { where: { name: string } }) =>
        roles.find((role) => role.name === where.name) ?? null,
      create: async ({ data }: { data: Omit<Role, 'role_id'> }) => {
        const role = { ...data, role_id: `role-${++sequence}` };
        roles.push(role);
        return role;
      },
    },
    permissions: {
      findFirst: async ({ where }: { where: { slug: string } }) =>
        permissions.find((permission) => permission.slug === where.slug) ?? null,
      create: async ({ data }: { data: Omit<Permission, 'permission_id'> }) => {
        const permission = { ...data, permission_id: `permission-${++sequence}` };
        permissions.push(permission);
        return permission;
      },
      update: async ({
        where,
        data,
      }: {
        where: { permission_id: string };
        data: { name?: string; description?: string };
      }) => {
        const permission = permissions.find(
          (item) => item.permission_id === where.permission_id,
        )!;
        Object.assign(permission, data);
        return permission;
      },
      delete: async ({ where }: { where: { permission_id: string } }) => {
        const index = permissions.findIndex(
          (permission) => permission.permission_id === where.permission_id,
        );
        if (index >= 0) permissions.splice(index, 1);
      },
    },
    role_permissions: {
      findMany: async ({
        where,
      }: {
        where: { permission_id: string };
        select: { role_id: true };
      }) =>
        links
          .filter((link) => link.permission_id === where.permission_id)
          .map(({ role_id }) => ({ role_id })),
      findFirst: async ({
        where,
      }: {
        where: { role_id: string; permission_id: string };
      }) =>
        links.find(
          (link) =>
            link.role_id === where.role_id &&
            link.permission_id === where.permission_id,
        ) ?? null,
      create: async ({ data }: { data: Link }) => {
        links.push(data);
        return data;
      },
      deleteMany: async ({ where }: { where: { permission_id: string } }) => {
        for (let index = links.length - 1; index >= 0; index -= 1) {
          if (links[index]?.permission_id === where.permission_id)
            links.splice(index, 1);
        }
      },
    },
  } as unknown as PrismaClient;

  return { prisma, roles, permissions, links };
}

describe('RBAC seed', () => {
  it('creates and links the full catalog to SUPERUSUARIO idempotently', async () => {
    const db = database();
    db.roles.push({ role_id: 'reader', name: 'LECTOR' });
    db.roles.push({ role_id: 'directive', name: 'DIRECTIVO' });
    db.roles.push({ role_id: 'lead', name: 'JEFE DE DEPARTAMENTO' });
    db.roles.push({ role_id: 'teacher', name: 'DOCENTE' });
    db.roles.push({ role_id: 'personal', name: 'PERSONAL' });

    const result = await seedRbac(db.prisma);
    const superuser = db.roles.find((role) => role.name === 'SUPERUSUARIO')!;
    const reservationManager = db.roles.find(
      (role) => role.name === 'RESERVATION_MANAGER',
    )!;
    expect(result.permissions).toEqual(
      FULL_PERMISSIONS_CATALOG.map(({ slug }) => slug),
    );
    expect(db.permissions.map(({ slug }) => slug).sort()).toEqual(
      [...FULL_PERMISSIONS_CATALOG.map(({ slug }) => slug)].sort(),
    );
    const ownPermissionSlugs = [
      'reservation:view_all',
      'reservation:create_own',
      'reservation:view_own',
      'reservation:update_own',
      'reservation:delete_own',
    ];
    expect(db.links).toHaveLength(
      FULL_PERMISSIONS_CATALOG.length + 1 + ownPermissionSlugs.length * 4,
    );
    expect(
      db.links.filter((link) => link.role_id === superuser.role_id),
    ).toHaveLength(FULL_PERMISSIONS_CATALOG.length);
    expect(
      db.links.filter((link) => link.role_id === reservationManager.role_id),
    ).toEqual([
      {
        role_id: reservationManager.role_id,
        permission_id: db.permissions.find(
          ({ slug }) => slug === 'reservation:manage',
        )?.permission_id,
      },
    ]);
    for (const roleId of ['directive', 'lead', 'teacher', 'personal']) {
      const assignments = db.links.filter((link) => link.role_id === roleId);
      expect(assignments).toHaveLength(ownPermissionSlugs.length);
      for (const slug of ownPermissionSlugs) {
        const permission = db.permissions.find((item) => item.slug === slug)!;
        expect(assignments).toContainEqual({
          role_id: roleId,
          permission_id: permission.permission_id,
        });
      }
    }
    expect(BASE_PERMISSIONS.every((slug) => result.permissions.includes(slug))).toBe(
      true,
    );

    const before = structuredClone({
      roles: db.roles,
      permissions: db.permissions,
      links: db.links,
    });
    await seedRbac(db.prisma);
    expect({ roles: db.roles, permissions: db.permissions, links: db.links }).toEqual(
      before,
    );
  });

  it('removes obsolete plural activity permissions and their assignments', async () => {
    const db = database();
    db.roles.push({ role_id: 'lead', name: 'JEFE DE DEPARTAMENTO' });
    db.permissions.push({ permission_id: 'old', slug: 'activities:update' });
    db.links.push({ role_id: 'lead', permission_id: 'old' });

    await seedRbac(db.prisma);

    expect(db.permissions.some(({ slug }) => slug === 'activities:update')).toBe(
      false,
    );
    expect(db.links.some(({ permission_id }) => permission_id === 'old')).toBe(
      false,
    );
  });

  it('migra permisos plurales de reservaciones conservando su alcance por rol', async () => {
    const db = database();
    db.roles.push({ role_id: 'directive', name: 'DIRECTIVE' });
    db.permissions.push({ permission_id: 'old-create', slug: 'reservations:create' });
    db.permissions.push({ permission_id: 'old-read', slug: 'reservations:read' });
    db.links.push(
      { role_id: 'directive', permission_id: 'old-create' },
      { role_id: 'directive', permission_id: 'old-read' },
    );

    await seedRbac(db.prisma);

    expect(db.permissions.some(({ slug }) => slug.startsWith('reservations:'))).toBe(
      false,
    );
    const createPermission = db.permissions.find(
      ({ slug }) => slug === 'reservation:create_own',
    )!;
    const viewPermission = db.permissions.find(
      ({ slug }) => slug === 'reservation:view_all',
    )!;
    expect(db.links).toContainEqual({
      role_id: 'directive',
      permission_id: createPermission.permission_id,
    });
    expect(db.links).toContainEqual({
      role_id: 'directive',
      permission_id: viewPermission.permission_id,
    });
  });
});
