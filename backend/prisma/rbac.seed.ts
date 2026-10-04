import type { PrismaClient } from '../src/generated/prisma/client.js';

export const BASE_PERMISSIONS = [
  'manage:all',
  'users:create',
  'users:read',
  'users:update',
  'users:delete',
  'activities:create',
  'activities:read',
  'activities:update',
  'activities:delete',
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

  // 4. Módulo de Actividades
  { slug: 'activities:create', name: 'CREAR ACTIVIDADES', description: 'Registrar actividades ordinarias y extraordinarias' },
  { slug: 'activities:read', name: 'CONSULTAR ACTIVIDADES', description: 'Ver el listado y agenda de actividades' },
  { slug: 'activities:update', name: 'EDITAR ACTIVIDADES', description: 'Modificar actividades no aprobadas' },
  { slug: 'activities:delete', name: 'ELIMINAR ACTIVIDADES', description: 'Cancelar o remover actividades' },
  { slug: 'activities:approve', name: 'APROBAR ACTIVIDADES', description: 'Dictamen de aprobación por las 3 direcciones' },

  // 5. Módulo de Espacios
  { slug: 'spaces:create', name: 'CREAR ESPACIOS', description: 'Registrar recintos, auditorios y salas' },
  { slug: 'spaces:read', name: 'CONSULTAR ESPACIOS', description: 'Ver disponibilidad y catálogo de espacios' },
  { slug: 'spaces:update', name: 'EDITAR ESPACIOS', description: 'Modificar aforo y condiciones del espacio' },
  { slug: 'spaces:delete', name: 'ELIMINAR ESPACIOS', description: 'Retirar espacios del catálogo' },

  // 6. Módulo de Recursos
  { slug: 'resources:create', name: 'CREAR RECURSOS', description: 'Registrar bienes, insumos y equipos' },
  { slug: 'resources:read', name: 'CONSULTAR RECURSOS', description: 'Consultar inventario y disponibilidad en tiempo real' },
  { slug: 'resources:update', name: 'EDITAR RECURSOS', description: 'Ajustar cantidades y estados de recursos' },
  { slug: 'resources:delete', name: 'ELIMINAR RECURSOS', description: 'Dar de baja equipos y recursos obsoletos' },

  // 7. Módulo de Reservaciones
  { slug: 'reservations:create', name: 'CREAR RESERVACIONES', description: 'Reservar espacios y solicitar recursos' },
  { slug: 'reservations:read', name: 'CONSULTAR RESERVACIONES', description: 'Ver la agenda general y calendario institucional' },
  { slug: 'reservations:update', name: 'EDITAR RESERVACIONES', description: 'Reprogramar o ajustar reservas' },
  { slug: 'reservations:delete', name: 'CANCELAR RESERVACIONES', description: 'Liberar fechas y cancelar reservas' },

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

  const assignedPermissions: string[] = [];

  // 2. Sembrar permisos sin depender de restricción única en slug
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

    // 3. Vincular el permiso al rol SUPERUSUARIO si aún no lo tiene
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

  return {
    role: superRole.name ?? 'SUPERUSUARIO',
    permissions: assignedPermissions,
  };
}

export default seedRbac;