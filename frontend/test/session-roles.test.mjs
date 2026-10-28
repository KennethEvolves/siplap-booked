import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = ts.transpileModule(readFileSync(new URL('../src/lib/auth.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
function config(fetch) {
  let result;
  const nextAuth = configuration => { result = configuration; return {}; };
  nextAuth.CredentialsSignin = class extends Error {};
  vm.runInNewContext(source, { exports: {}, process: { env: {} }, fetch,
    require: name => name === 'next-auth' ? nextAuth : configuration => configuration,
  });
  return result;
}
test('la sesión usa los roles actuales en lugar de los roles al iniciar sesión', async () => {
  const c = config(async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer existing-token');
    assert.equal(options.cache, 'no-store');
    return { ok: true, json: async () => ({ user: { roles: ['JEFE DE DEPARTAMENTO'], email: 'test@example.test' } }) };
  });
  const token = await c.callbacks.jwt({ token: { accessToken: 'existing-token', roles: ['SUPERUSUARIO'] } });
  assert.deepEqual(token.roles, ['JEFE DE DEPARTAMENTO']);
});
test('una sesión rechazada no conserva roles antiguos', async () => {
  const c = config(async () => ({ ok: false, status: 401 }));
  assert.equal(await c.callbacks.jwt({ token: { accessToken: 'expired', roles: ['SUPERUSUARIO'] } }), null);
});
test('un servidor no disponible no autoriza con roles guardados', async () => {
  const c = config(async () => { throw new Error('offline'); });
  assert.equal(await c.callbacks.jwt({ token: { accessToken: 'token', roles: ['SUPERUSUARIO'] } }), null);
});
