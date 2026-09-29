import { describe, expect, it } from 'vitest';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import { BASE_PERMISSIONS, seedRbac } from './rbac.seed.js';

// In-memory database boundary: exercise seed behavior without touching local data.
function database() {
  type Permission = {
    permission_id: string;
    slug: string;
    name?: string;
    description?: string;
  };
  type Role = { role_id: string; name: string; description?: string };
  type Link = {
    role_id: string;
    permission_id: string;
    created_at?: Date | null;
    updated_at?: Date | null;
  };
  const roles: Role[] = [];
  const permissions: Permission[] = [];
  let links: Link[] = [];
  let sequence = 0;
  const tx = {
    roles: {
      upsert: ({
        where,
        create,
      }: {
        where: { name: string };
        create: Omit<Role, 'role_id'>;
      }) => {
        let role = roles.find((item) => item.name === where.name);
        if (!role) {
          role = { ...create, role_id: `role-${++sequence}` };
          roles.push(role);
        }
        return role;
      },
    },
    permissions: {
      findUnique: ({ where }: { where: { slug: string } }) =>
        permissions.find((item) => item.slug === where.slug) ?? null,
      upsert: ({
        where,
        create,
      }: {
        where: { slug: string };
        create: Omit<Permission, 'permission_id'>;
      }) => {
        let permission = permissions.find((item) => item.slug === where.slug);
        if (!permission) {
          permission = { ...create, permission_id: `permission-${++sequence}` };
          permissions.push(permission);
        }
        return permission;
      },
      update: ({
        where,
        data,
      }: {
        where: { permission_id: string };
        data: { slug: string };
      }) => {
        const permission = permissions.find(
          (item) => item.permission_id === where.permission_id,
        )!;
        permission.slug = data.slug;
        return permission;
      },
      delete: ({ where }: { where: { permission_id: string } }) => {
        permissions.splice(
          permissions.findIndex(
            (item) => item.permission_id === where.permission_id,
          ),
          1,
        );
      },
    },
    role_permissions: {
      findMany: ({ where }: { where: { permission_id: string } }) =>
        links.filter((item) => item.permission_id === where.permission_id),
      upsert: ({ create }: { create: Link }) => {
        if (
          !links.some(
            (item) =>
              item.role_id === create.role_id &&
              item.permission_id === create.permission_id,
          )
        )
          links.push(create);
      },
      deleteMany: ({ where }: { where: { permission_id: string } }) => {
        links = links.filter(
          (item) => item.permission_id !== where.permission_id,
        );
      },
    },
  };
  const prisma = {
    $transaction: async (
      operation: (client: typeof tx) => Promise<unknown>,
    ) => {
      const snapshot = structuredClone({ roles, permissions, links });
      try {
        return await operation(tx);
      } catch (error) {
        roles.splice(0, roles.length, ...snapshot.roles);
        permissions.splice(0, permissions.length, ...snapshot.permissions);
        links = snapshot.links;
        throw error;
      }
    },
  } as unknown as PrismaClient;
  return {
    prisma,
    roles,
    permissions,
    get links() {
      return links;
    },
  };
}

describe('RBAC-05 seed', () => {
  it('creates exactly the base catalog, links it to SUPERUSUARIO and is idempotent', async () => {
    const db = database();
    db.roles.push({ role_id: 'reader', name: 'LECTOR' });
    await seedRbac(db.prisma);
    expect(db.permissions.map((p) => p.slug).sort()).toEqual([
      'activities:create',
      'activities:delete',
      'activities:read',
      'activities:update',
      'manage:all',
      'users:create',
      'users:delete',
      'users:read',
      'users:update',
    ]);
    const superuser = db.roles.find((r) => r.name === 'SUPERUSUARIO')!;
    expect(db.links).toHaveLength(9);
    expect(db.links.every((link) => link.role_id === superuser.role_id)).toBe(
      true,
    );
    const before = structuredClone({
      roles: db.roles,
      permissions: db.permissions,
      links: db.links,
    });
    await seedRbac(db.prisma);
    expect({
      roles: db.roles,
      permissions: db.permissions,
      links: db.links,
    }).toEqual(before);
  });

  it('renames equivalent dotted permissions without replacing their IDs or existing role links', async () => {
    const db = database();
    db.roles.push({ role_id: 'coordinator', name: 'COORDINADOR' });
    db.permissions.push({
      permission_id: 'legacy',
      slug: 'activities.read',
      description: 'Custom description',
    });
    db.links.push({ role_id: 'coordinator', permission_id: 'legacy' });
    await seedRbac(db.prisma);
    expect(
      db.permissions.find((p) => p.permission_id === 'legacy'),
    ).toMatchObject({
      slug: 'activities:read',
      description: 'Custom description',
    });
    expect(db.links.filter((link) => link.role_id === 'coordinator')).toEqual([
      { role_id: 'coordinator', permission_id: 'legacy' },
    ]);
  });

  it('merges dotted aliases into existing canonical permissions without losing or duplicating assignments', async () => {
    const db = database();
    db.roles.push(
      { role_id: 'reader', name: 'LECTOR' },
      { role_id: 'coordinator', name: 'COORDINADOR' },
    );
    db.permissions.push(
      { permission_id: 'legacy', slug: 'users.read' },
      { permission_id: 'canonical', slug: 'users:read', name: 'Custom name' },
      { permission_id: 'unrelated', slug: 'spaces:read' },
    );
    db.links.push(
      { role_id: 'reader', permission_id: 'legacy' },
      { role_id: 'reader', permission_id: 'canonical' },
      { role_id: 'coordinator', permission_id: 'legacy' },
      { role_id: 'coordinator', permission_id: 'unrelated' },
    );
    await seedRbac(db.prisma);
    expect(
      db.permissions.find((p) => p.permission_id === 'legacy'),
    ).toBeUndefined();
    expect(
      db.permissions.find((p) => p.permission_id === 'canonical')?.name,
    ).toBe('Custom name');
    expect(db.links.filter((link) => link.role_id === 'reader')).toEqual([
      { role_id: 'reader', permission_id: 'canonical' },
    ]);
    expect(
      db.links.filter((link) => link.role_id === 'coordinator'),
    ).toHaveLength(2);
    expect(db.links).toContainEqual({
      role_id: 'coordinator',
      permission_id: 'unrelated',
    });
    expect(
      db.links.some(
        (link) =>
          link.role_id === 'coordinator' && link.permission_id === 'canonical',
      ),
    ).toBe(true);
    expect(db.permissions).toHaveLength(BASE_PERMISSIONS.length + 1);
  });
});
