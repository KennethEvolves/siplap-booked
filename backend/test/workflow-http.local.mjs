import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const fixturePath = new URL('../.thunder-run.json', import.meta.url);
const reportPath = new URL('../../docs/workflow-http-verification.md', import.meta.url);
const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
const baseUrl = 'http://localhost:4001';
const checks = [];
let token;
let activityId;
let reservationId;
let failed = false;

async function request(method, path, body, expected) {
  const response = await fetch(new URL(path, baseUrl), {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  const ok = response.status === expected;
  checks.push({ method, path, status: response.status, expected, ok });
  if (!ok) {
    failed = true;
    console.error(`${method} ${path}: esperado ${expected}, recibido ${response.status}; respuesta=${JSON.stringify(data)}`);
  }
  return { response, data };
}

try {
  const login = await request('POST', '/auth/login', { email: fixture.email, password: fixture.password }, 200);
  token = login.data?.accessToken;
  if (!token) throw new Error('El login no devolvió accessToken');

  const me = await request('GET', '/auth/me', undefined, 200);
  if (me.data?.user?.userId !== fixture.userIds[0]) throw new Error('El token no corresponde al usuario de prueba');
  await request('GET', '/api/activities/creators', undefined, 200);
  const spaces = await request('GET', '/api/reservations/spaces', undefined, 200);
  if (!spaces.data?.spaces?.some((space) => space.spaceId === fixture.spaceId)) throw new Error('No se encontró el espacio temporal en el catálogo');

  const unique = `${fixture.tag}-external`;
  const startDate = '2026-11-10';
  const activity = await request('POST', '/api/activities', {
    title: `${fixture.tag} actividad de prueba`,
    description: 'Registro temporal para verificar API de ubicaciones y aprobaciones.',
    type: 'ordinary',
    startDate,
    endDate: startDate,
    creatorId: fixture.creatorId,
    externalLocations: [{
      googlePlaceId: unique,
      name: `${fixture.tag} ubicación externa`,
      formattedAddress: 'Ubicación ficticia para prueba; no corresponde a un lugar real.',
      latitude: 19.4326,
      longitude: -99.1332,
    }],
  }, 201);
  activityId = activity.data?.activity?.activityId;
  if (!activityId) throw new Error('POST actividad no devolvió activityId');

  const activityRead = await request('GET', `/api/activities/${activityId}`, undefined, 200);
  if (activityRead.data?.activity?.creator?.userId !== fixture.creatorId) throw new Error('La actividad no se asignó al creador seleccionado');
  const locations = await request('GET', `/api/activities/${activityId}/external-locations`, undefined, 200);
  if (!locations.data?.locations?.some((location) => location.googlePlaceId === unique)) throw new Error('La ubicación externa no se guardó');

  const reservation = await request('POST', '/api/reservations', {
    title: `${fixture.tag} reservación de prueba`,
    description: 'Registro temporal para verificar vínculo actividad/espacio.',
    activityId,
    spaceIds: [fixture.spaceId],
    startTime: '2026-11-10T16:00:00.000Z',
    endTime: '2026-11-10T17:00:00.000Z',
  }, 201);
  reservationId = reservation.data?.reservation?.reservationId;
  if (!reservationId) throw new Error('POST reservación no devolvió reservationId');
  if (reservation.data?.reservation?.status !== 'pending') throw new Error('La reservación de actividad pendiente debía iniciar como pending');
  if (!reservation.data?.reservation?.spaces?.some((space) => space.spaceId === fixture.spaceId)) throw new Error('La reservación no incluye el espacio indicado');
  await request('GET', `/api/reservations/${reservationId}`, undefined, 200);
  await request('GET', '/api/reservations?page=1&limit=100', undefined, 200);

  for (const direction of ['planning', 'academic', 'administrative']) {
    const approval = await request('PATCH', `/api/activities/${activityId}/approval`, { direction, status: 'approved' }, 200);
    if (approval.data?.activity?.approvals?.[direction] !== 'approved') throw new Error(`No se guardó la aprobación ${direction}`);
  }
  const approved = await request('GET', `/api/activities/${activityId}`, undefined, 200);
  if (approved.data?.activity?.status !== 'approved') throw new Error('El estado global de la actividad no quedó approved');
  const reserved = await request('GET', `/api/reservations/${reservationId}`, undefined, 200);
  if (reserved.data?.reservation?.status !== 'reserved') throw new Error('La reservación no cambió automáticamente a reserved');
  const report = await request('GET', `/api/activities/${activityId}/report`, undefined, 200);
  if (!report.data?.folio) throw new Error('No se generó el reporte de planeación');
} catch (error) {
  failed = true;
  console.error(`Flujo detenido: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  // Remove test API data through authenticated endpoints before the fixture account is deleted.
  if (token && reservationId) await request('DELETE', `/api/reservations/${reservationId}`, undefined, 204);
  if (token && activityId) await request('DELETE', `/api/activities/${activityId}`, undefined, 204);
  const lines = [
    '# Evidencia de verificación HTTP del backend',
    '',
    `Fecha: ${new Date().toISOString()}`,
    '',
    'Prueba ejecutada contra NestJS en `http://localhost:4001` y PostgreSQL local con una cuenta temporal autorizada. No se guardaron credenciales ni tokens en este documento.',
    '',
    '## Resultados',
    '',
    '| Método | Endpoint | Esperado | Resultado |',
    '|---|---|---:|---|',
    ...checks.map((item) => `| ${item.method} | \`${item.path}\` | ${item.expected} | ${item.ok ? `✅ ${item.status}` : `❌ ${item.status}`} |`),
    '',
    `Resultado general: **${failed ? 'FALLÓ; revisar las filas marcadas' : 'OK'}** (${checks.filter((item) => item.ok).length}/${checks.length} respuestas con el código esperado).`,
    '',
    'El flujo cubre inicio de sesión y token, catálogo de creadores y espacios, creación/consulta de actividad, ubicación externa, creación/consulta de reservación vinculada, las tres aprobaciones, transición automática de la reservación a `reserved` y generación del reporte. Los datos temporales de actividad y reservación se eliminan al final de la ejecución; la cuenta y el espacio temporales se limpian con el helper de fixtures.',
    '',
    '## Cómo verlo y repetirlo',
    '',
    '1. Abre este archivo `docs/workflow-http-verification.md` desde el Explorador de VS Code o desde Codex.',
    '2. En Thunder Client, abre **Activity** para ver la solicitud autenticada `GET /auth/me` con respuesta `200 OK`; no necesitas copiar el token temporal.',
    '3. Para repetir el flujo automatizado, inicia PostgreSQL local y el backend en `http://localhost:4001`, crea primero el fixture autorizado y ejecuta `node backend/test/workflow-http.local.mjs` desde la raíz. Después limpia el fixture con `node backend/test/thunder-fixture.local.mjs --cleanup`.',
    '4. El token y la contraseña nunca aparecen en la consola ni en este reporte. La limpieza invalida el token al borrar la cuenta temporal.',
    '',
  ];
  await writeFile(reportPath, lines.join('\n'), 'utf8');
  console.log(`HTTP workflow: ${checks.filter((item) => item.ok).length}/${checks.length} respuestas con código esperado.`);
  console.log(`Evidencia: ${fileURLToPath(reportPath)}`);
}

if (failed) process.exitCode = 1;
