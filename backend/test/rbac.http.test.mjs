import 'reflect-metadata';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from '../dist/app.module.js';
import { UserRepository } from '../dist/auth/domain/ports/user.repository.js';
import { PrismaService } from '../dist/prisma/prisma.service.js';
import { Prisma } from '../dist/generated/prisma/client.js';
import { createUserSchema, updateRoleSchema } from '@shared/contracts';

// Exercise the actual Nest modules, guards, pipes, use cases and Prisma adapters.
// The database boundary is an in-memory double; no real records are modified.
const rows = Object.fromEntries(
  [
    'users',
    'roles',
    'permissions',
    'user_roles',
    'role_permissions',
    'user_statuses',
  ].map((name) => [name, []]),
);
rows.user_statuses.push({ status_id: randomUUID(), name: 'ACTIVE' });
const keys = {
  users: 'user_id',
  roles: 'role_id',
  permissions: 'permission_id',
  user_statuses: 'status_id',
};
const unique = { users: 'email', roles: 'name', permissions: 'slug' };
const dbError = (code) =>
  new Prisma.PrismaClientKnownRequestError('Database constraint', {
    code,
    clientVersion: '7.10.0',
  });
const matches = (row, where = {}) =>
  Object.entries(where).every(
    ([key, value]) =>
      value === undefined ||
      (typeof value === 'object' ? row[key] !== value.not : row[key] === value),
  );
let failNextWrite;
const project = (row, select) =>
  row &&
  Object.fromEntries(
    Object.entries(select).map(([key, value]) => [
      key,
      value === true
        ? row[key]
        : project(
            rows.user_statuses.find(
              (status) => status.status_id === row.status_id,
            ),
            value.select,
          ),
    ]),
  );
const db = {};
for (const table of Object.keys(rows)) {
  db[table] = {
    async findFirst({ where, select }) {
      return (
        project(
          rows[table].find((row) => matches(row, where)),
          select,
        ) ?? null
      );
    },
    async findUnique(args) {
      return this.findFirst(args);
    },
    async findMany({ select }) {
      return rows[table].map((row) => project(row, select));
    },
    async create({ data, select }) {
      if (failNextWrite) {
        const code = failNextWrite;
        failNextWrite = undefined;
        throw dbError(code);
      }
      const field = unique[table];
      if (field && rows[table].some((row) => row[field] === data[field]))
        throw dbError('P2002');
      const row = {
        ...(keys[table] ? { [keys[table]]: randomUUID() } : {}),
        name: null,
        description: null,
        created_at: new Date(),
        updated_at: new Date(),
        type_id: null,
        department_id: null,
        ...data,
      };
      rows[table].push(row);
      return project(row, select);
    },
    async update({ where, data, select }) {
      const row = rows[table].find((row) => matches(row, where));
      if (!row) throw dbError('P2025');
      Object.assign(
        row,
        Object.fromEntries(
          Object.entries(data).filter(([, v]) => v !== undefined),
        ),
      );
      return project(row, select);
    },
    async deleteMany({ where }) {
      rows[table] = rows[table].filter((row) => !matches(row, where));
    },
    async delete({ where }) {
      if (failNextWrite) {
        const code = failNextWrite;
        failNextWrite = undefined;
        throw dbError(code);
      }
      const row = rows[table].find((row) => matches(row, where));
      if (!row) throw dbError('P2025');
      rows[table] = rows[table].filter((item) => item !== row);
      return row;
    },
  };
}
db.$transaction = async (operation) => {
  const snapshot = structuredClone(rows);
  try {
    return await operation(db);
  } catch (error) {
    Object.assign(rows, snapshot);
    throw error;
  }
};
let app, admin, ordinary;
const actorId = randomUUID();
const api = (method, path, token = admin) =>
  request(app.getHttpServer())
    [method](path)
    .set('Authorization', `Bearer ${token}`);
before(async () => {
  process.env.JWT_SECRET = 'rbac-test-only-secret';
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(UserRepository)
    .useValue({
      async findByEmail(email) {
        const user = rows.users.find(user => user.email === email);
        if (!user) return null;
        return {
          userId: user.user_id, username: user.username, email: user.email,
          passwordHash: user.password_hash,
          status: rows.user_statuses.find(status => status.status_id === user.status_id)?.name,
          roles: rows.user_roles.filter(link => link.user_id === user.user_id)
            .map(link => rows.roles.find(role => role.role_id === link.role_id)?.name).filter(Boolean),
        };
      },
    })
    .overrideProvider(PrismaService)
    .useValue(db)
    .compile();
  app = module.createNestApplication();
  await app.init();
  const jwt = module.get(JwtService);
  admin = jwt.sign({ sub: actorId, roles: ['SUPERUSUARIO'] });
  ordinary = jwt.sign({ sub: randomUUID(), roles: ['LECTOR'] });
});
after(async () => {
  await app?.close();
});

void test('guards protect all RBAC resources', async () => {
  for (const resource of ['users', 'roles', 'permissions']) {
    await request(app.getHttpServer())
      .get('/' + resource)
      .expect(401);
    for (const [method, path] of [
      ['get', '/' + resource],
      ['post', '/' + resource],
      ['patch', '/' + resource + '/' + randomUUID()],
      ['delete', '/' + resource + '/' + randomUUID()],
    ]) {
      await api(method, path, ordinary).send({}).expect(403);
    }
  }
});
void test('Zod rejects malformed, empty, oversized and unknown fields before persistence', async () => {
  for (const body of [
    { name: 123 },
    { name: '  ' },
    { name: 'x'.repeat(101) },
    { name: 'TEST', admin: true },
  ])
    await api('post', '/roles').send(body).expect(400);
  await api('post', '/users')
    .send({ email: 'bad', password: 'short' })
    .expect(400);
  await api('post', '/permissions').send({ slug: 10 }).expect(400);
  for (const slug of ['users.create', 'users', 'users:create:extra', ':read', 'users:']) {
    await api('post', '/permissions').send({ slug }).expect(400);
    await api('patch', '/permissions/' + randomUUID()).send({ slug }).expect(400);
  }
  await api('patch', '/roles/' + randomUUID())
    .send({})
    .expect(400);
  await api('patch', '/roles/not-a-uuid').send({ name: 'valid' }).expect(400);
  await api('post', '/users/bad/roles/bad').expect(400);
  assert.equal(
    createUserSchema.safeParse({ email: 'a@b.com', password: '😀'.repeat(19) })
      .success,
    false,
  );
  assert.equal(updateRoleSchema.safeParse({ description: '' }).success, true);
});
void test('roles and permissions: create, list, patch, duplicate, assign and delete', async () => {
  const role = (
    await api('post', '/roles')
      .send({ name: ' editor ', description: 'initial' })
      .expect(201)
  ).body.role;
  assert.equal(role.name, 'EDITOR');
  const permission = (
    await api('post', '/permissions')
      .send({ slug: ' Users:Update ', name: 'edit' })
      .expect(201)
  ).body.permission;
  assert.equal(permission.slug, 'users:update');
  await api('post', '/roles').send({ name: 'EDITOR' }).expect(409);
  await api('post', '/permissions').send({ slug: 'users:update' }).expect(409);
  const updated = (
    await api('patch', '/roles/' + role.roleId)
      .send({ description: 'updated' })
      .expect(200)
  ).body.role;
  assert.equal(updated.name, 'EDITOR');
  assert.equal(updated.description, 'updated');
  await api('patch', '/permissions/' + permission.permissionId)
    .send({ slug: 'users:read' })
    .expect(200);
  const other = (
    await api('post', '/roles').send({ name: 'OTHER' }).expect(201)
  ).body.role;
  await api('patch', '/roles/' + other.roleId)
    .send({ name: 'editor' })
    .expect(409);
  await api(
    'post',
    `/roles/${role.roleId}/permissions/${permission.permissionId}`,
  ).expect(201);
  await api(
    'post',
    `/roles/${role.roleId}/permissions/${permission.permissionId}`,
  ).expect(409);
  await api(
    'post',
    `/roles/${randomUUID()}/permissions/${permission.permissionId}`,
  ).expect(404);
  const listed = await api('get', '/roles').expect(200);
  assert.ok(listed.body.roles.some((item) => item.roleId === role.roleId));
  await api('delete', '/permissions/' + permission.permissionId).expect(204);
  assert.equal(rows.role_permissions.length, 0);
  await api('delete', '/roles/' + role.roleId).expect(204);
  await api('delete', '/roles/' + role.roleId).expect(404);
  await api('patch', '/permissions/' + randomUUID())
    .send({ name: 'Missing' })
    .expect(404);
});
void test('user editing preserves password when omitted, hashes replacements and removes role links', async () => {
  const user = (
    await api('post', '/users')
      .send({
        username: 'New',
        email: ' TEST@example.com ',
        password: 'password123',
      })
      .expect(201)
  ).body.user;
  assert.equal(user.email, 'test@example.com');
  assert.equal(user.passwordHash, undefined);
  const stored = rows.users.find((row) => row.user_id === user.userId),
    hash = stored.password_hash;
  assert.notEqual(hash, 'password123');
  await api('patch', '/users/' + user.userId)
    .send({ username: 'Edited' })
    .expect(200);
  assert.equal(stored.password_hash, hash);
  await api('patch', '/users/' + user.userId)
    .send({ password: 'new-password123' })
    .expect(200);
  assert.notEqual(stored.password_hash, hash);
  const role = (
    await api('post', '/roles').send({ name: 'MEMBER' }).expect(201)
  ).body.role;
  await api('post', `/users/${user.userId}/roles/${role.roleId}`).expect(201);
  await api('post', `/users/${user.userId}/roles/${role.roleId}`).expect(409);
  failNextWrite = 'P2003';
  await api('delete', '/users/' + user.userId).expect(409);
  assert.equal(
    rows.user_roles.length,
    1,
    'failed deletes roll back link removal',
  );
  await api('delete', '/users/' + user.userId).expect(204);
  assert.equal(rows.user_roles.length, 0);
});
void test('reserved superuser role and own account cannot be deleted', async () => {
  const role = (
    await api('post', '/roles').send({ name: 'SUPERUSUARIO' }).expect(201)
  ).body.role;
  await api('patch', '/roles/' + role.roleId)
    .send({ name: 'OTHER_NAME' })
    .expect(409);
  await api('delete', '/roles/' + role.roleId).expect(409);
  rows.users.push({
    user_id: actorId,
    email: 'self@test.com',
    status_id: rows.user_statuses[0].status_id,
  });
  await api('delete', '/users/' + actorId).expect(409);
});
void test('Prisma concurrency constraint errors become HTTP 409', async () => {
  failNextWrite = 'P2002';
  await api('post', '/roles').send({ name: 'CONCURRENT' }).expect(409);
});

void test('una cuenta creada sin roles inicia sesión sin obtener permisos administrativos', async () => {
  const email = 'login-regression@example.test';
  const password = 'LoginRegression2026!';
  await api('post', '/users').send({ username: 'Usuario login', email, password }).expect(201);
  const response = await request(app.getHttpServer()).post('/auth/login').send({ email, password }).expect(200);
  assert.ok(response.body.accessToken);
  assert.deepEqual(response.body.user.roles, []);
  await api('get', '/auth/me', response.body.accessToken).expect(200);
  for (const resource of ['users', 'roles', 'permissions']) {
    await api('get', '/' + resource, response.body.accessToken).expect(403);
  }
  await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'incorrecta' }).expect(401);
});
