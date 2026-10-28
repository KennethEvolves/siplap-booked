import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = ts.transpileModule(readFileSync(new URL('../src/lib/api.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function client(token, status = 200) {
  const calls = []; let signouts = 0;
  const exports = {};
  vm.runInNewContext(source, {
    exports, require: () => ({
      getSession: async () => token ? { user: { accessToken: token } } : null,
      signOut: async () => { signouts++; },
    }),
    process: { env: {} }, Headers, FormData,
    window: {}, document: {}, localStorage: { removeItem() {} },
    fetch: async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({ message: 'respuesta' }), { status });
    },
  });
  return { api: exports, calls, signouts: () => signouts };
}
test('envía el JWT de la sesión como Bearer', async () => {
  const c = client('session-jwt'); await c.api.apiFetch('/users');
  assert.equal(c.calls[0].options.headers.get('Authorization'), 'Bearer session-jwt');
});
test('sin sesión no solicita datos protegidos y cierra sesión', async () => {
  const c = client(null);
  await assert.rejects(c.api.apiFetch('/users'), { status: 401 });
  assert.equal(c.calls.length, 0); assert.equal(c.signouts(), 1);
});
test('un JWT rechazado con 401 termina la sesión', async () => {
  const c = client('expired', 401);
  await assert.rejects(c.api.apiFetch('/users'), { status: 401 });
  assert.equal(c.signouts(), 1);
});
test('403 conserva la sesión y comunica falta de permisos', async () => {
  const c = client('valid', 403);
  await assert.rejects(c.api.apiFetch('/users'), { status: 403 });
  assert.equal(c.signouts(), 0);
});
