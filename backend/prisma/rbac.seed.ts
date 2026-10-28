import type { PrismaClient } from '../src/generated/prisma/client.js';

export const BASE_PERMISSIONS = [
  'manage:all',
  'users:create',
  'users:read',
  'users:update',
  'users:delete',
  // Módulo de Actividades oficial (Tarea #101326)
  'activity:manage',
  'activity:view_all',
  'activity:approve_all',
  'activity:update_all',
  'activity:create_own',
  'activity:view_own',
  'activity:update_own',
  'reservation:manage',
  'reservation:view_all',
  'reservation:create_own',
  'reservation:view_own',
  'reservation:update_own',
  'reservation:delete_own',
] as const;

export const FULL_PERMISSIONS_CATALOG = [
  // 1. Administración Global
  { slug: 'manage:all', name: 'ADMINISTRACIÓN GLOBAL', description: 'Acceso total sin restricciones al sistema' },

  // 2. Módulo de Usuarios
  { slug: 'users:create', name: 'CREAR USUARIOS', description: 'Dar de alta nuevas cuentas en el sistema' },
  { slug: 'users:read', name: 'CONSULTAR USUARIOS', description: 'Visualizar directorio y detalles de usuarios' },
  { slug: 'users:update', name: 'EDITAR USUARIOS', description: 'Modificar credenciales y perfiles de usuarios' },
  { slug: 'users:delete', name: 'ELIMINAR USUARIOS', description: 'Eliminar o desactivar cuentas de usuario' },

  // 3. Módulo de Roles y Permisos
  { slug: 'roles:create', name: 'CREAR ROLES', description: 'Definir nuevos roles institucionales' },
  { slug: 'roles:read', name: 'CONSULTAR ROLES', description: 'Listar y ver catálogo de roles' },
  { slug: 'roles:update', name: 'EDITAR ROLES', description: 'Modificar información de roles existentes' },
  { slug: 'roles:delete', name: 'ELIMINAR ROLES', description: 'Dar de baja roles del sistema' },
  { slug: 'permissions:assign', name: 'ASIGNAR PERMISOS', description: 'Vincular y desvincular permisos a roles' },

  // 4. Módulo de Actividades (Oficial según requerimiento)
  { slug: 'activity:manage', name: 'GESTIONAR ACTIVIDADES', description: 'Control total: asignar creador, ver, modificar, aprobar y eliminar actividades' },
  { slug: 'activity:view_all', name: 'CONSULTAR TODAS LAS ACTIVIDADES', description: 'Ver la totalidad de las actividades institucionales' },
  { slug: 'activity:approve_all', name: 'APROBAR ACTIVIDADES', description: 'Dictamen de aprobación (aprobado, no aprobado, reprogramación, cancelación)' },
  { slug: 'activity:update_all', name: 'EDITAR TODAS LAS ACTIVIDADES', description: 'Modificar cualquier actividad del sistema' },
  { slug: 'activity:create_own', name: 'CREAR ACTIVIDADES PROPIAS', description: 'Registrar actividades ordinarias y extraordinarias' },
  { slug: 'activity:view_own', name: 'CONSULTAR ACTIVIDADES PROPIAS', description: 'Ver el listado y agenda de actividades propias' },
  { slug: 'activity:update_own', name: 'EDITAR ACTIVIDADES PROPIAS', description: 'Modificar actividades propias no aprobadas' },

  // 5. Módulo de Reservaciones
  { slug: 'reservation:manage', name: 'GESTIONAR TODAS LAS RESERVACIONES', description: 'Crear, consultar, editar y eliminar cualquier reservación' },
  { slug: 'reservation:view_all', name: 'CONSULTAR TODAS LAS RESERVACIONES', description: 'Consultar reservaciones de todos los usuarios' },
  { slug: 'reservation:create_own', name: 'CREAR RESERVACIONES PROPIAS', description: 'Registrar reservaciones a nombre del usuario autenticado' },
  { slug: 'reservation:view_own', name: 'CONSULTAR RESERVACIONES PROPIAS', description: 'Consultar reservaciones del usuario autenticado' },
  { slug: 'reservation:update_own', name: 'EDITAR RESERVACIONES PROPIAS', description: 'Modificar reservaciones propias' },
  { slug: 'reservation:delete_own', name: 'ELIMINAR RESERVACIONES PROPIAS', description: 'Eliminar reservaciones propias' },

  // 6. Módulo de Espacios
  { slug: 'spaces:create', name: 'CREAR ESPACIOS', description: 'Registrar recintos, auditorios y salas' },
  { slug: 'spaces:read', name: 'CONSULTAR ESPACIOS', description: 'Ver disponibilidad y catálogo de espacios' },
  { slug: 'spaces:update', name: 'EDITAR ESPACIOS', description: 'Modificar aforo y condiciones del espacio' },
  { slug: 'spaces:delete', name: 'ELIMINAR ESPACIOS', description: 'Retirar espacios del catálogo' },

  // 7. Módulo de Recursos
  { slug: 'resources:create', name: 'CREAR RECURSOS', description: 'Registrar bienes, insumos y equipos' },
  { slug: 'resources:read', name: 'CONSULTAR RECURSOS', description: 'Consultar inventario y disponibilidad en tiempo real' },
  { slug: 'resources:update', name: 'EDITAR RECURSOS', description: 'Ajustar cantidades y estados de recursos' },
  { slug: 'resources:delete', name: 'ELIMINAR RECURSOS', description: 'Dar de baja equipos y recursos obsoletos' },

  // 8. Módulo de Reportes y Evidencias
  { slug: 'reports:create', name: 'GENERAR REPORTES', description: 'Crear planning reports oficiales con evidencias' },
  { slug: 'reports:read', name: 'CONSULTAR REPORTES', description: 'Visualizar reportes institucionales generados' },
];

export async function seedRbac(prisma: PrismaClient) {
  // 1. Obtener o crear el rol SUPERUSUARIO
  let superRole = await prisma.roles.findFirst({
    where: { name: 'SUPERUSUARIO' },
  });

  if (!superRole) {
    superRole = await prisma.roles.create({
      data: {
        name: 'SUPERUSUARIO',
        description: 'Usuario con acceso administrativo completo',
      },
    });
  }

  // El gestor de reservaciones tiene alcance global solo para este módulo.
  let reservationManagerRole = null;
  for (const name of [
    'RESERVATION_MANAGER',
    'reservation_manager',
    'RESERVATION MANAGER',
  ]) {
    reservationManagerRole = await prisma.roles.findFirst({ where: { name } });
    if (reservationManagerRole) break;
  }
  if (!reservationManagerRole) {
    reservationManagerRole = await prisma.roles.create({
      data: {
        name: 'RESERVATION_MANAGER',
        description: 'Gestiona todas las reservaciones del sistema',
      },
    });
  }

  // 2. Limpiar permisos viejos/obsoletos de actividades para evitar duplicados en la UI
  const obsoleteSlugs = [
    'activities:create',
    'activities:read',
    'activities:update',
    'activities:delete',
    'activities:approve',
  ];

  for (const oldSlug of obsoleteSlugs) {
    const oldPerm = await prisma.permissions.findFirst({
      where: { slug: oldSlug },
    });
    if (oldPerm) {
      // Eliminar dependencias en role_permissions y luego el permiso
      await prisma.role_permissions.deleteMany({
        where: { permission_id: oldPerm.permission_id },
      });
      await prisma.permissions.delete({
        where: { permission_id: oldPerm.permission_id },
      });
    }
  }

  const assignedPermissions: string[] = [];

  // 3. Sembrar catálogo limpio de permisos
  for (const item of FULL_PERMISSIONS_CATALOG) {
    let perm = await prisma.permissions.findFirst({
      where: { slug: item.slug },
    });

    if (perm) {
      perm = await prisma.permissions.update({
        where: { permission_id: perm.permission_id },
        data: {
          name: item.name,
          description: item.description,
        },
      });
    } else {
      perm = await prisma.permissions.create({
        data: {
          slug: item.slug,
          name: item.name,
          description: item.description,
        },
      });
    }

    // 4. Vincular al rol SUPERUSUARIO
    const existingLink = await prisma.role_permissions.findFirst({
      where: {
        role_id: superRole.role_id,
        permission_id: perm.permission_id,
      },
    });

    if (!existingLink) {
      await prisma.role_permissions.create({
        data: {
          role_id: superRole.role_id,
          permission_id: perm.permission_id,
        },
      });
    }

    assignedPermissions.push(perm.slug);
  }

  // Migrar asignaciones existentes antes de retirar los slugs plurales.
  const reservationPermissionMigration = {
    'reservations:create': 'reservation:create_own',
    'reservations:read': 'reservation:view_all',
    'reservations:update': 'reservation:update_own',
    'reservations:delete': 'reservation:delete_own',
  } as const;
  for (const [oldSlug, newSlug] of Object.entries(
    reservationPermissionMigration,
  )) {
    const oldPermission = await prisma.permissions.findFirst({
      where: { slug: oldSlug },
    });
    const newPermission = await prisma.permissions.findFirst({
      where: { slug: newSlug },
    });
    if (!oldPermission || !newPermission) continue;

    const oldAssignments = await prisma.role_permissions.findMany({
      where: { permission_id: oldPermission.permission_id },
      select: { role_id: true },
    });
    for (const { role_id } of oldAssignments) {
      const existingAssignment = await prisma.role_permissions.findFirst({
        where: { role_id, permission_id: newPermission.permission_id },
      });
      if (!existingAssignment) {
        await prisma.role_permissions.create({
          data: { role_id, permission_id: newPermission.permission_id },
        });
      }
    }

    await prisma.role_permissions.deleteMany({
      where: { permission_id: oldPermission.permission_id },
    });
    await prisma.permissions.delete({
      where: { permission_id: oldPermission.permission_id },
    });
  }

  const reservationManagePermission = await prisma.permissions.findFirst({
    where: { slug: 'reservation:manage' },
  });
  if (reservationManagePermission) {
    const managerLink = await prisma.role_permissions.findFirst({
      where: {
        role_id: reservationManagerRole.role_id,
        permission_id: reservationManagePermission.permission_id,
      },
    });
    if (!managerLink) {
      await prisma.role_permissions.create({
        data: {
          role_id: reservationManagerRole.role_id,
          permission_id: reservationManagePermission.permission_id,
        },
      });
    }
  }

  const ownReservationPermissionSlugs = [
    'reservation:view_all',
    'reservation:create_own',
    'reservation:view_own',
    'reservation:update_own',
    'reservation:delete_own',
  ];
  const reservationRoleAliases = [
    ['DIRECTIVE', 'DIRECTIVO'],
    ['LEAD', 'JEFE DE DEPARTAMENTO'],
    ['TEACHER', 'DOCENTE', 'MAESTRO'],
    ['PERSONAL'],
  ];
  for (const aliases of reservationRoleAliases) {
    for (const name of aliases) {
      const role = await prisma.roles.findFirst({ where: { name } });
      if (!role) continue;

      for (const slug of ownReservationPermissionSlugs) {
        const permission = await prisma.permissions.findFirst({
          where: { slug },
        });
        if (!permission) continue;
        const existing = await prisma.role_permissions.findFirst({
          where: {
            role_id: role.role_id,
            permission_id: permission.permission_id,
          },
        });
        if (!existing) {
          await prisma.role_permissions.create({
            data: {
              role_id: role.role_id,
              permission_id: permission.permission_id,
            },
          });
        }
      }
    }
  }

  return {
    role: superRole.name ?? 'SUPERUSUARIO',
    permissions: assignedPermissions,
  };
}

export default seedRbac;
