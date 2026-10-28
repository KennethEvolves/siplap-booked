import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../dist/generated/prisma/client.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const file = new URL('../.thunder-run.json', import.meta.url);
const cleanup = process.argv.includes('--cleanup');

try {
  if (cleanup) {
    const state = JSON.parse(await (await import('node:fs/promises')).readFile(file, 'utf8'));
    const { reservationId, activityId, locationId, googlePlaceId, spaceId, userIds, roleId, permissionIds } = state;
    if (reservationId) {
      await prisma.reservation_spaces.deleteMany({ where: { reservation_id: reservationId } });
      await prisma.reservation_resources.deleteMany({ where: { reservation_id: reservationId } });
      await prisma.reservation_personnel.deleteMany({ where: { reservation_id: reservationId } });
      await prisma.notifications.deleteMany({ where: { reservation_id: reservationId } });
      await prisma.reservations.deleteMany({ where: { reservation_id: reservationId } });
    }
    if (activityId) {
      await prisma.activity_personnel.deleteMany({ where: { activity_id: activityId } });
      await prisma.notifications.deleteMany({ where: { activity_id: activityId } });
      await prisma.activity_reports.deleteMany({ where: { activity_id: activityId } });
      await prisma.activity_external_locations.deleteMany({ where: { activity_id: activityId } });
      await prisma.activities.deleteMany({ where: { activity_id: activityId } });
    }
    if (locationId) await prisma.external_locations.deleteMany({ where: { location_id: locationId } });
    if (googlePlaceId) await prisma.external_locations.deleteMany({ where: { google_place_id: googlePlaceId } });
    if (spaceId) await prisma.spaces.deleteMany({ where: { space_id: spaceId } });
    if (userIds?.length) {
      await prisma.user_roles.deleteMany({ where: { user_id: { in: userIds } } });
      await prisma.notifications.deleteMany({ where: { user_id: { in: userIds } } });
      await prisma.users.deleteMany({ where: { user_id: { in: userIds } } });
    }
    if (roleId) {
      await prisma.role_permissions.deleteMany({ where: { role_id: roleId } });
      await prisma.roles.deleteMany({ where: { role_id: roleId } });
    }
    if (permissionIds?.length) {
      await prisma.permissions.deleteMany({ where: { permission_id: { in: permissionIds }, role_permissions: { none: {} } } });
    }
    await (await import('node:fs/promises')).rm(file, { force: true });
    console.log('Thunder Client fixture cleanup completed.');
  } else {
    const db = new URL(process.env.DATABASE_URL);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(db.hostname)) throw new Error('Solo se permite PostgreSQL local');
    const tag = `tc-${randomUUID()}`;
    const active = await prisma.user_statuses.findFirstOrThrow({ where: { name: 'ACTIVE' } });
    const permissionIds = [];
    const newPermissionIds = [];
    for (const slug of ['activity:manage', 'reservation:manage']) {
      let row = await prisma.permissions.findUnique({ where: { slug } });
      if (!row) {
        row = await prisma.permissions.create({ data: { slug } });
        newPermissionIds.push(row.permission_id);
      }
      permissionIds.push(row.permission_id);
    }
    const role = await prisma.roles.create({ data: { name: `${tag}-test` } });
    await prisma.role_permissions.createMany({ data: permissionIds.map((permission_id) => ({ role_id: role.role_id, permission_id })) });
    const password = randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    const actor = await prisma.users.create({ data: {
      username: `${tag}-admin`, email: `${tag}-admin@example.invalid`, password_hash: passwordHash, status_id: active.status_id,
    } });
    await prisma.user_roles.create({ data: { user_id: actor.user_id, role_id: role.role_id } });
    const creator = await prisma.users.create({ data: {
      username: `${tag}-creator`, email: `${tag}-creator@example.invalid`, password_hash: passwordHash, status_id: active.status_id,
    } });
    const space = await prisma.spaces.create({ data: {
      name: `${tag} space`, description: 'Espacio temporal para Thunder Client', capacity: 1, status: 'active',
    } });
    await writeFile(file, JSON.stringify({
      tag, email: actor.email, password, creatorId: creator.user_id, spaceId: space.space_id,
      userIds: [actor.user_id, creator.user_id], roleId: role.role_id, permissionIds: newPermissionIds,
    }), { flag: 'wx' });
    console.log('Thunder Client fixture ready (credentials stored locally; not printed).');
  }
} finally {
  await prisma.$disconnect();
}
