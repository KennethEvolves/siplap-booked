import type { PrismaClient } from '../src/generated/prisma/client.js';

export const BASE_PERMISSIONS = [
  {
    slug: 'users:create',
    name: 'CREAR USUARIOS',
    description: 'Crear usuarios.',
  },
  {
    slug: 'users:read',
    name: 'CONSULTAR USUARIOS',
    description: 'Consultar usuarios.',
  },
  {
    slug: 'users:update',
    name: 'ACTUALIZAR USUARIOS',
    description: 'Actualizar usuarios.',
  },
  {
    slug: 'users:delete',
    name: 'ELIMINAR USUARIOS',
    description: 'Eliminar usuarios.',
  },
  {
    slug: 'activities:create',
    name: 'CREAR ACTIVIDADES',
    description: 'Crear actividades.',
  },
  {
    slug: 'activities:read',
    name: 'CONSULTAR ACTIVIDADES',
    description: 'Consultar actividades.',
  },
  {
    slug: 'activities:update',
    name: 'ACTUALIZAR ACTIVIDADES',
    description: 'Actualizar actividades.',
  },
  {
    slug: 'activities:delete',
    name: 'ELIMINAR ACTIVIDADES',
    description: 'Eliminar actividades.',
  },
  {
    slug: 'manage:all',
    name: 'ADMINISTRACIÓN GLOBAL',
    description: 'Permiso maestro del superusuario.',
  },
] as const;

/** Seed only the RBAC catalog. Never create accounts or grant roles to users. */
export async function seedRbac(prisma: PrismaClient) {
  return prisma.$transaction(
    async (tx) => {
      const superuser = await tx.roles.upsert({
        where: { name: 'SUPERUSUARIO' },
        update: {},
        create: {
          name: 'SUPERUSUARIO',
          description: 'Administración del sistema.',
        },
      });

      for (const definition of BASE_PERMISSIONS) {
        // Only migrate the equivalent dotted spelling, never infer new privileges.
        const legacy = await tx.permissions.findUnique({
          where: { slug: definition.slug.replace(':', '.') },
        });
        const existing = await tx.permissions.findUnique({
          where: { slug: definition.slug },
        });

        const permission =
          legacy && !existing
            ? await tx.permissions.update({
                where: { permission_id: legacy.permission_id },
                data: { slug: definition.slug, updated_at: new Date() },
              })
            : await tx.permissions.upsert({
                where: { slug: definition.slug },
                update: {},
                create: definition,
              });

        if (legacy && existing) {
          const assignments = await tx.role_permissions.findMany({
            where: { permission_id: legacy.permission_id },
          });
          for (const assignment of assignments) {
            await tx.role_permissions.upsert({
              where: {
                role_id_permission_id: {
                  role_id: assignment.role_id,
                  permission_id: permission.permission_id,
                },
              },
              update: {},
              create: {
                role_id: assignment.role_id,
                permission_id: permission.permission_id,
                created_at: assignment.created_at,
                updated_at: assignment.updated_at,
              },
            });
          }
          await tx.role_permissions.deleteMany({
            where: { permission_id: legacy.permission_id },
          });
          await tx.permissions.delete({
            where: { permission_id: legacy.permission_id },
          });
        }

        await tx.role_permissions.upsert({
          where: {
            role_id_permission_id: {
              role_id: superuser.role_id,
              permission_id: permission.permission_id,
            },
          },
          update: {},
          create: {
            role_id: superuser.role_id,
            permission_id: permission.permission_id,
          },
        });
      }

      return {
        role: superuser.name,
        permissions: BASE_PERMISSIONS.map(({ slug }) => slug),
      };
    },
    { maxWait: 10_000, timeout: 30_000 },
  );
}
