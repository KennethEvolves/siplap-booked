import 'dotenv/config';
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { NestFactory } from '@nestjs/core';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../dist/generated/prisma/client.js';
import { AppModule } from '../dist/app.module.js';
import { ACTIVITY_PERMISSIONS as P } from '@shared/contracts';

// Run only against a disposable/local development database. Fixture IDs delimit cleanup.
const databaseUrl = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1', '[::1]'].includes(databaseUrl.hostname))
  throw new Error('La prueba requiere PostgreSQL local');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const prefix = 'activity-test-' + randomUUID();
const userIds = [],
  roleIds = [],
  createdPermissionIds = [];
let app;
let checks = 0;
try {
  const status = await prisma.user_statuses.findFirstOrThrow({
    where: { name: 'ACTIVE' },
  });
  const permissionIds = new Map();
  for (const slug of Object.values(P)) {
    let permission = await prisma.permissions.findFirst({ where: { slug } });
    if (!permission) {
      permission = await prisma.permissions.create({ data: { slug } });
      createdPermissionIds.push(permission.permission_id);
    }
    permissionIds.set(slug, permission.permission_id);
  }
  const password = randomUUID();
  const hash = await bcrypt.hash(password, 10);
  const actors = {};
  for (const [name, slugs] of Object.entries({
    superuser: [P.manage],
    directive: [
      P.viewAll,
      P.updateAll,
      P.approveAll,
      P.createOwn,
      P.viewOwn,
      P.updateOwn,
    ],
    lead: [P.createOwn, P.viewOwn, P.updateOwn],
    other: [P.createOwn, P.viewOwn, P.updateOwn],
    none: [],
  })) {
    const role = await prisma.roles.create({
      data: { name: prefix + '-' + name },
    });
    roleIds.push(role.role_id);
    const user = await prisma.users.create({
      data: {
        username: name,
        email: prefix + '-' + name + '@example.invalid',
        password_hash: hash,
        status_id: status.status_id,
      },
    });
    userIds.push(user.user_id);
    await prisma.user_roles.create({
      data: { user_id: user.user_id, role_id: role.role_id },
    });
    for (const slug of slugs)
      await prisma.role_permissions.create({
        data: { role_id: role.role_id, permission_id: permissionIds.get(slug) },
      });
    actors[name] = { user, role };
  }
  app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(0, '127.0.0.1');
  const origin = await app.getUrl();
  async function call(actor, method, path, body, expected) {
    const response = await fetch(origin + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(actor?.token ? { Authorization: 'Bearer ' + actor.token } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    assert.equal(
      response.status,
      expected,
      method + ' ' + path + (path === '/auth/login' ? '' : ': ' + text),
    );
    checks++;
    return text ? JSON.parse(text) : undefined;
  }
  for (const actor of Object.values(actors)) {
    const login = await call(
      null,
      'POST',
      '/auth/login',
      { email: actor.user.email, password },
      200,
    );
    actor.token = login.accessToken;
    assert.ok(actor.token);
  }
  const { superuser, directive, lead, other, none } = actors;
  const base = '/api/activities';
  const input = {
    title: prefix,
    startDate: '2026-10-20',
    endDate: '2026-10-21',
  };
  await call(null, 'GET', base, undefined, 401);
  await call(none, 'GET', base, undefined, 403);
  await call(none, 'POST', base, input, 403);
  await call(
    lead,
    'POST',
    base,
    { ...input, creatorId: other.user.user_id },
    403,
  );
  await call(
    directive,
    'POST',
    base,
    { ...input, creatorId: lead.user.user_id },
    403,
  );
  await call(
    superuser,
    'POST',
    base,
    { ...input, creatorId: randomUUID() },
    400,
  );
  await call(lead, 'POST', base, { ...input, startDate: '2026-02-30' }, 400);
  await call(lead, 'POST', base, { ...input, overall_status: 'approved' }, 400);
  const own = (await call(lead, 'POST', base, input, 201)).activity;
  const foreign = (await call(other, 'POST', base, input, 201)).activity;
  const delegated = (
    await call(
      superuser,
      'POST',
      base,
      { ...input, creatorId: lead.user.user_id },
      201,
    )
  ).activity;
  assert.equal(delegated.creator.userId, lead.user.user_id);
  const reassigned = await call(
    superuser,
    'PATCH',
    base + '/' + delegated.activityId,
    { creatorId: other.user.user_id },
    200,
  );
  assert.equal(reassigned.activity.creator.userId, other.user.user_id);
  assert.equal(
    (
      await prisma.activities.findUniqueOrThrow({
        where: { activity_id: delegated.activityId },
      })
    ).creator_id,
    other.user.user_id,
  );
  const reassignedBack = await call(
    superuser,
    'PATCH',
    base + '/' + delegated.activityId,
    { creatorId: lead.user.user_id },
    200,
  );
  assert.equal(reassignedBack.activity.creator.userId, lead.user.user_id);
  assert.equal(own.status, 'pending');
  assert.equal(own.actions.canApprove, false);
  const leadList = await call(lead, 'GET', base, undefined, 200);
  assert.equal(leadList.total, 2);
  assert.ok(
    leadList.activities.every((a) => a.creator.userId === lead.user.user_id),
  );
  await call(lead, 'GET', base + '/' + foreign.activityId, undefined, 404);
  await call(
    lead,
    'PATCH',
    base + '/' + foreign.activityId,
    { title: 'Forbidden' },
    404,
  );
  await call(
    lead,
    'PATCH',
    base + '/' + own.activityId,
    { title: 'Updated' },
    200,
  );
  await call(
    lead,
    'PATCH',
    base + '/' + own.activityId,
    { startDate: '2026-10-22' },
    400,
  );
  await call(
    lead,
    'PATCH',
    base + '/' + own.activityId,
    { creatorId: other.user.user_id },
    403,
  );
  await call(
    lead,
    'PATCH',
    base + '/' + own.activityId,
    { status: 'approved' },
    400,
  );
  await call(
    lead,
    'PATCH',
    base + '/' + own.activityId + '/approval',
    { status: 'approved' },
    403,
  );
  await call(lead, 'DELETE', base + '/' + own.activityId, undefined, 403);
  await call(directive, 'GET', base + '/' + foreign.activityId, undefined, 200);
  await call(directive, 'GET', base, undefined, 200);
  await call(directive, 'POST', base, input, 201);
  await call(
    directive,
    'PATCH',
    base + '/' + foreign.activityId,
    { title: 'Directive update' },
    200,
  );
  await call(
    directive,
    'PATCH',
    base + '/' + foreign.activityId,
    { creatorId: lead.user.user_id },
    403,
  );
  await call(
    directive,
    'DELETE',
    base + '/' + foreign.activityId,
    undefined,
    403,
  );
  for (const status of ['approved', 'rejected', 'cancelled', 'rescheduled']) {
    const response = await call(
      directive,
      'PATCH',
      base + '/' + foreign.activityId + '/approval',
      { status },
      200,
    );
    assert.equal(response.activity.status, status);
    assert.equal(
      (
        await prisma.activities.findUniqueOrThrow({
          where: { activity_id: foreign.activityId },
        })
      ).overall_status,
      status,
    );
  }
  await call(
    directive,
    'PATCH',
    base + '/' + foreign.activityId + '/approval',
    { status: 'unknown' },
    400,
  );
  await call(
    superuser,
    'PATCH',
    base + '/' + foreign.activityId + '/approval',
    { status: 'approved' },
    200,
  );
  const caps = await call(
    directive,
    'GET',
    base + '/capabilities',
    undefined,
    200,
  );
  assert.equal(caps.canAssignCreator, false);
  assert.equal(caps.approvalOptions.length, 4);
  assert.equal(
    (await call(lead, 'GET', base + '/capabilities', undefined, 200))
      .approvalOptions.length,
    0,
  );
  await call(lead, 'GET', base + '/creators', undefined, 403);
  await call(directive, 'GET', base + '/creators', undefined, 403);
  const creators = await call(
    superuser,
    'GET',
    base + '/creators',
    undefined,
    200,
  );
  assert.ok(
    creators.users.every((u) => !('password_hash' in u) && !('email' in u)),
  );
  await call(lead, 'GET', base + '?limit=0', undefined, 400);
  await call(
    lead,
    'GET',
    base + '?creatorId=' + other.user.user_id,
    undefined,
    400,
  );
  await call(lead, 'GET', base + '/invalid-id', undefined, 400);
  await call(lead, 'GET', '/activities/' + own.activityId, undefined, 200);
  await prisma.role_permissions.delete({
    where: {
      role_id_permission_id: {
        role_id: lead.role.role_id,
        permission_id: permissionIds.get(P.updateOwn),
      },
    },
  });
  await call(
    lead,
    'PATCH',
    base + '/' + own.activityId,
    { title: 'Revoked' },
    403,
  );
  await call(
    superuser,
    'DELETE',
    base + '/' + foreign.activityId,
    undefined,
    204,
  );
  assert.equal(
    await prisma.activities.findUnique({
      where: { activity_id: foreign.activityId },
    }),
    null,
  );
  console.log(
    `${checks} peticiones HTTP verificadas contra PostgreSQL real; permisos, aislamiento y persistencia correctos.`,
  );
} finally {
  if (app) await app.close();
  await prisma.activities.deleteMany({
    where: { creator_id: { in: userIds } },
  });
  await prisma.user_roles.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.users.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.role_permissions.deleteMany({
    where: { role_id: { in: roleIds } },
  });
  await prisma.roles.deleteMany({ where: { role_id: { in: roleIds } } });
  // Preserve any permission linked by another session while this test ran.
  await prisma.permissions.deleteMany({
    where: {
      permission_id: { in: createdPermissionIds },
      role_permissions: { none: {} },
    },
  });
  await prisma.$disconnect();
  console.log('Fixtures temporales eliminadas.');
}
