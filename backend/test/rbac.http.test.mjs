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
    'profiles',
    'departments',
    'user_types',
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
  row && (!select ? { ...row } :
  Object.fromEntries(
    Object.entries(select).map(([key, value]) => [
      key,
      value === true
        ? row[key]
        : key === 'profiles'
          ? project(rows.profiles.find(profile => profile.user_id === row.user_id), value.select) ?? null
          : key === 'departments'
            ? project(rows.departments.find(department => department.department_id === row.department_id), value.select) ?? null
          : key === 'user_types'
            ? project(rows.user_types.find(type => type.type_id === row.type_id), value.select) ?? null
        : key === 'role_permissions'
          ? rows.role_permissions.filter(link => link.role_id === row.role_id).map(link => project(link, value.select))
          : key === 'permissions'
            ? project(rows.permissions.find(permission => permission.permission_id === row.permission_id), value.select)
        : key === 'user_roles'
          ? rows.user_roles.filter(link => link.user_id === row.user_id).map(link => project(link, value.select))
          : key === 'roles'
            ? project(rows.roles.find(role => role.role_id === row.role_id), value.select)
            : project(
            rows.user_statuses.find(
              (status) => status.status_id === row.status_id,
            ),
            value.select,
          ),
    ]),
  ));
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
    async findUniqueOrThrow(args) {
      const row = await this.findFirst(args);
      if (!row) throw dbError('P2025');
      return row;
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
const ordinaryId = randomUUID();
const api = (method, path, token = admin) =>
  request(app.getHttpServer())
    [method](path)
    .set('Authorization', `Bearer ${token}`);
before(async () => {
  process.env.JWT_SECRET = 'rbac-test-only-secret';
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(UserRepository)
    .useValue({
      async findById(id) {
        // Fixed actors authenticate existing authorization fixtures.
        if (id === actorId) return { userId: id, email: 'admin@test.com', status: 'ACTIVE', roles: ['SUPERUSUARIO'] };
        if (id === ordinaryId) return { userId: id, email: 'reader@test.com', status: 'ACTIVE', roles: ['LECTOR'] };
        const row = rows.users.find(user => user.user_id === id);
        return row ? this.findByEmail(row.email) : null;
      },
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
  ordinary = jwt.sign({ sub: ordinaryId, roles: ['LECTOR'] });
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

void test('reemplazar roles actualiza el listado y los permisos de tokens ya emitidos', async () => {
  const superRole = (await api('get', '/roles').expect(200)).body.roles.find(role => role.name === 'SUPERUSUARIO');
  const deptRole = (await api('post', '/roles').send({ name: 'JEFE DE DEPARTAMENTO' }).expect(201)).body.role;
  const create = async email => (await api('post', '/users').send({ email, username: email, password: 'RoleSwap2026!' }).expect(201)).body.user;
  const first = await create('swap-first@example.test');
  const second = await create('swap-second@example.test');
  const put = (user, role) => api('put', '/users/' + user.userId + '/roles/' + role.roleId);
  await put(first, superRole).expect(200);
  await put(second, deptRole).expect(200);
  const login = async email => (await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'RoleSwap2026!' }).expect(200)).body.accessToken;
  const oldAdminToken = await login(first.email);
  const oldOrdinaryToken = await login(second.email);
  await api('get', '/users', oldAdminToken).expect(200);
  await api('get', '/users', oldOrdinaryToken).expect(403);
  await put(first, deptRole).expect(200);
  await put(second, superRole).expect(200);
  await put(second, superRole).expect(200); // Idempotent replacement.
  const users = (await api('get', '/users').expect(200)).body.users;
  assert.deepEqual(users.find(user => user.userId === first.userId).roles, [{ roleId: deptRole.roleId, name: deptRole.name }]);
  assert.deepEqual(users.find(user => user.userId === second.userId).roles, [{ roleId: superRole.roleId, name: superRole.name }]);
  await api('get', '/users', oldAdminToken).expect(403);
  await api('get', '/users', oldOrdinaryToken).expect(200);
  assert.deepEqual((await api('get', '/auth/me', oldAdminToken).expect(200)).body.user.roles, [deptRole.name]);
  await api('put', '/users/' + second.userId + '/roles/' + deptRole.roleId, oldOrdinaryToken).expect(400);
  await put(first, { roleId: randomUUID() }).expect(404);
  failNextWrite = 'P2003';
  await put(first, superRole).expect(409);
  assert.equal(rows.user_roles.filter(link => link.user_id === first.userId).length, 1);
  assert.equal(rows.user_roles.find(link => link.user_id === first.userId).role_id, deptRole.roleId);
  await api('delete', '/users/' + second.userId).expect(204);
  await api('get', '/auth/me', oldOrdinaryToken).expect(401);
});

void test('quitar un rol conserva los demás y revoca el acceso en la sesión existente', async () => {
  const roleList = (await api('get', '/roles').expect(200)).body.roles;
  const superRole = roleList.find(role => role.name === 'SUPERUSUARIO');
  const deptRole = roleList.find(role => role.name === 'JEFE DE DEPARTAMENTO');
  const user = (await api('post', '/users').send({ username: 'Quitar rol', email: 'remove-role@example.test', password: 'RemoveRole2026!' }).expect(201)).body.user;
  const path = '/users/' + user.userId + '/roles/';
  await api('post', path + superRole.roleId).expect(201);
  await api('post', path + deptRole.roleId).expect(201);
  const token = (await request(app.getHttpServer()).post('/auth/login').send({ email: user.email, password: 'RemoveRole2026!' }).expect(200)).body.accessToken;
  await api('delete', path + superRole.roleId, token).expect(400);
  await api('delete', path + deptRole.roleId, ordinary).expect(403);
  await request(app.getHttpServer()).delete(path + deptRole.roleId).expect(401);
  await api('delete', path + randomUUID()).expect(404);
  await api('delete', path + 'invalid-id').expect(400);
  await api('delete', path + superRole.roleId).expect(204);
  await api('delete', path + superRole.roleId).expect(204);
  await api('get', '/users', token).expect(403);
  const listed = (await api('get', '/users').expect(200)).body.users.find(item => item.userId === user.userId);
  assert.deepEqual(listed.roles, [{ roleId: deptRole.roleId, name: deptRole.name }]);
  await api('delete', path + deptRole.roleId).expect(204);
  const profile = (await api('get', '/auth/me', token).expect(200)).body;
  assert.deepEqual(profile.user.roles, []);
  assert.ok(rows.roles.some(role => role.role_id === deptRole.roleId));
});

void test('asignar permisos los muestra en el rol y conserva asignaciones previas', async () => {
  const role = (await api('post', '/roles').send({ name: 'PERMISSION_FORM_TEST' }).expect(201)).body.role;
  const first = (await api('post', '/permissions').send({ name: 'Ver reportes', slug: 'reports:read' }).expect(201)).body.permission;
  const second = (await api('post', '/permissions').send({ name: 'Crear reportes', slug: 'reports:create' }).expect(201)).body.permission;
  const path = '/roles/' + role.roleId + '/permissions/';
  await api('post', path + first.permissionId, ordinary).expect(403);
  await request(app.getHttpServer()).post(path + first.permissionId).expect(401);
  await api('post', path + first.permissionId).expect(201);
  await api('post', path + second.permissionId).expect(201);
  await api('post', path + first.permissionId).expect(409);
  await api('post', path + randomUUID()).expect(404);
  const listed = (await api('get', '/roles').expect(200)).body.roles.find(item => item.roleId === role.roleId);
  assert.deepEqual(listed.permissions.map(item => item.slug).sort(), ['reports:create', 'reports:read']);
  assert.equal(rows.role_permissions.filter(item => item.role_id === role.roleId).length, 2);
});

void test('perfil propio: lectura, creación, actualización parcial y seguridad', async () => {
  const password = 'ProfileTest2026!';
  const create = async email => (await api('post', '/users').send({ email, username: 'Perfil', password }).expect(201)).body.user;
  const owner = await create('profile-owner@example.test');
  const other = await create('profile-other@example.test');
  const login = async email => (await request(app.getHttpServer()).post('/auth/login').send({ email, password }).expect(200)).body.accessToken;
  const token = await login(owner.email);
  const otherToken = await login(other.email);
  for (const path of ['/api/users/profile', '/users/profile']) {
    await request(app.getHttpServer()).get(path).expect(401);
    await request(app.getHttpServer()).patch(path).send({ bio: 'test' }).expect(401);
    const profile = (await api('get', path, token).expect(200)).body.profile;
    assert.equal(profile.userId, owner.userId);
    assert.equal(profile.dateOfBirth, null);
    assert.equal(profile.department, null);
    assert.equal(profile.userType, null);
    assert.deepEqual(profile.roles, []);
    assert.equal(profile.status.name, 'ACTIVE');
    assert.equal(profile.passwordHash, undefined);
    assert.equal(profile.password_hash, undefined);
  }
  for (const body of [{}, { userId: other.userId }, { roles: ['SUPERUSUARIO'] }, { status: 'ACTIVE' }, { shift: 'MANANA' }, { password: 'secret' }, { email: 'bad' }, { dateOfBirth: '2025-02-30' }, { dateOfBirth: '2999-01-01' }, { dateOfBirth: null }, { avatarUrl: 'javascript:alert(1)' }, { firstName: 'x'.repeat(101) }]) {
    await api('patch', '/api/users/profile', token).send(body).expect(400);
  }
  await api('patch', '/api/users/profile', token).send({ firstName: 'Ana' }).expect(400);
  const updated = (await api('patch', '/api/users/profile', token).send({ firstName: ' Ana ', lastName: 'Perfil', dateOfBirth: '1998-04-15', phoneNumber: '5551234567', bio: 'Mi perfil' }).expect(200)).body.profile;
  assert.equal(updated.firstName, 'Ana');
  assert.equal(updated.dateOfBirth, '1998-04-15');
  assert.equal(updated.phoneNumber, '5551234567');
  const second = (await api('patch', '/users/profile', token).send({ bio: null, email: ' UPDATED-PROFILE@example.test ' }).expect(200)).body.profile;
  assert.equal(second.bio, null);
  assert.equal(second.firstName, 'Ana');
  assert.equal(second.email, 'updated-profile@example.test');
  const untouched = (await api('get', '/api/users/profile', otherToken).expect(200)).body.profile;
  assert.equal(untouched.firstName, null);
  assert.equal(untouched.email, other.email);
  await api('patch', '/api/users/profile', token).send({ email: other.email }).expect(409);
  assert.equal((await api('get', '/api/users/profile', token).expect(200)).body.profile.email, second.email);
  const profileRow = rows.profiles.find(row => row.user_id === owner.userId);
  assert.equal(profileRow.last_name, 'Perfil');
});
