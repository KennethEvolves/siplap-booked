import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
const origin = process.env.RBAC_TEST_URL ?? 'http://localhost:4011';
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname))
  throw new Error('This smoke test only supports local servers');
const jwt = new JwtService({ secret: process.env.JWT_SECRET });
const token = jwt.sign(
  { sub: randomUUID(), roles: ['SUPERUSUARIO'] },
  { expiresIn: '2m' },
);
const prefix = 'rbac-test-' + randomUUID();
const cleanup = [];
async function call(method, path, body, expected) {
  const response = await fetch(origin + path, {
    method,
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  assert.equal(response.status, expected, method + ' ' + path + ': ' + text);
  return text ? JSON.parse(text) : undefined;
}
try {
  const { user } = await call(
    'POST',
    '/users',
    {
      email: prefix + '@example.com',
      username: 'RBAC test',
      password: randomUUID(),
    },
    201,
  );
  cleanup.push('/users/' + user.userId);
  const { role } = await call('POST', '/roles', { name: prefix }, 201);
  cleanup.push('/roles/' + role.roleId);
  const { permission } = await call(
    'POST',
    '/permissions',
    { slug: prefix },
    201,
  );
  cleanup.push('/permissions/' + permission.permissionId);
  await call(
    'POST',
    `/users/${user.userId}/roles/${role.roleId}`,
    undefined,
    201,
  );
  await call(
    'POST',
    `/roles/${role.roleId}/permissions/${permission.permissionId}`,
    undefined,
    201,
  );
  await call(
    'POST',
    `/roles/${role.roleId}/permissions/${permission.permissionId}`,
    undefined,
    409,
  );
  await call(
    'PATCH',
    '/users/' + user.userId,
    { username: 'RBAC edited' },
    200,
  );
  await call('PATCH', '/roles/' + role.roleId, { description: 'edited' }, 200);
  await call(
    'PATCH',
    '/permissions/' + permission.permissionId,
    { description: 'edited' },
    200,
  );
  for (const resource of ['users', 'roles', 'permissions'])
    await call('GET', '/' + resource, undefined, 200);
  const attempts = await Promise.all(
    [1, 2].map(() =>
      fetch(origin + '/roles', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: prefix + '-race' }),
      }),
    ),
  );
  for (const response of attempts)
    if (response.status === 201)
      cleanup.push('/roles/' + (await response.json()).role.roleId);
  assert.deepEqual(attempts.map((r) => r.status).sort((a, b) => a - b), [201, 409]);
  console.log(
    'PostgreSQL smoke: create, list, update, assignments and concurrent duplicates passed.',
  );
} finally {
  for (const path of cleanup.reverse())
    await call('DELETE', path, undefined, 204);
  console.log('Temporary RBAC records deleted.');
}
