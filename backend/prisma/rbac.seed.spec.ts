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

    const result = await seedRbac(db.prisma);
    const superuser = db.roles.find((role) => role.name === 'SUPERUSUARIO')!;
    expect(result.permissions).toEqual(
      FULL_PERMISSIONS_CATALOG.map(({ slug }) => slug),
    );
    expect(db.permissions.map(({ slug }) => slug).sort()).toEqual(
      [...FULL_PERMISSIONS_CATALOG.map(({ slug }) => slug)].sort(),
    );
    expect(db.links).toHaveLength(FULL_PERMISSIONS_CATALOG.length);
    expect(db.links.every((link) => link.role_id === superuser.role_id)).toBe(
      true,
    );
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
});
