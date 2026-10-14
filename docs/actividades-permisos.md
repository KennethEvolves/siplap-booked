# UNO-26 · Permisos y API de actividades

## Matriz de acceso

Los permisos efectivos se consultan en PostgreSQL a través de `user_roles` y `role_permissions` en cada petición. Se unen los permisos de todos los roles de la cuenta. El nombre de un rol no concede acceso por sí mismo. Una cuenta debe estar activa y presentar un JWT válido.

| Rol institucional | Concepto | Permisos que se asignan desde el panel |
| --- | --- | --- |
| SUPERUSUARIO | superuser | `activity:manage` |
| DIRECTIVO | directive | `activity:view_all`, `activity:approve_all`, `activity:update_all`, `activity:create_own`, `activity:view_own`, `activity:update_own` |
| JEFE DE DEPARTAMENTO | lead | `activity:create_own`, `activity:view_own`, `activity:update_own` |

`activity:manage` permite consultar, crear, modificar, aprobar y eliminar, además de seleccionar otro usuario activo como creador. Los permisos `*_own` usan `activities.creator_id` para definir la propiedad; no el departamento ni la persona que llenó el formulario. Un directivo puede crear actividades propias, pero no asignar otro creador ni eliminar.

Los antiguos `activities:*` y `manage:all` no sustituyen estos permisos en esta API. Se conservan en el catálogo por compatibilidad con otros módulos. Las asignaciones nuevas se agregan sin retirar permisos de otros módulos.

## Configuración desde la interfaz

1. Iniciar sesión como SUPERUSUARIO y abrir **Usuarios y Roles → Permisos**.
2. En **Crear permiso**, registrar los siete identificadores exactos de la tabla anterior. Los identificadores son únicos.
3. Si DIRECTIVO no existe, crearlo en **Gestión de Roles**.
4. Seleccionar cada rol en la matriz, activar los permisos indicados y guardar.
5. Asignar roles a usuarios según corresponda; este ticket no cambia las asignaciones personales existentes.

El 13 de octubre de 2026 se crearon estos siete permisos desde la interfaz local, se creó DIRECTIVO y se verificaron sus vínculos en PostgreSQL. Este procedimiento debe repetirse en otros entornos: no se modificó el seed general ni se aplicó una migración del esquema.

## Endpoints

Base: `/api/activities`. También se admiten rutas equivalentes bajo `/activities`.

Todos requieren `Authorization: Bearer <accessToken>`. Los cuerpos JSON requieren `Content-Type: application/json`.

| Método y ruta | Permiso | Respuesta |
| --- | --- | --- |
| GET `/capabilities` | Cuenta autenticada activa | 200: capacidades para la interfaz |
| GET `/creators?page=1&limit=20` | `activity:manage` | 200: usuarios activos seleccionables |
| GET `?page=1&limit=20` | manage, view_all o view_own | 200: actividades dentro del alcance |
| GET `/:activityId` | manage, view_all o view_own y propiedad | 200: actividad |
| POST | manage o create_own | 201: actividad creada |
| PATCH `/:activityId` | manage, update_all o update_own y propiedad | 200: actividad actualizada |
| PATCH `/:activityId/approval` | manage o approve_all | 200: estado actualizado |
| DELETE `/:activityId` | manage | 204 sin cuerpo |

PATCH es el método HTTP usado para actualizar; `UPDATE` no es un verbo HTTP. Las páginas empiezan en 1, con límite por defecto 20 y máximo 100. Los filtros no reconocidos se rechazan; el cliente no puede forzar un `creatorId` de consulta.

## Creación

```json
{
  "title": "Jornada académica",
  "description": "Actividad institucional",
  "type": "ordinary",
  "startDate": "2026-11-10",
  "endDate": "2026-11-11",
  "requiresCertified": false,
  "requiresAuthority": true
}
```

`title`, `startDate` y `endDate` son obligatorios. El título admite de 1 a 255 caracteres; las fechas son reales en formato `YYYY-MM-DD`, con fin igual o posterior al inicio. `type` admite `ordinary`, `extraordinary` o `entry`.

Campos opcionales: `description` y `generalObservation` (hasta 10000 caracteres o null), `requiresCertified`, `requiresAuthority`, `objectiveId` (UUID o null), `creatorId` (UUID).

Cuando no se envía `creatorId`, se utiliza el ID de la sesión. Solo `activity:manage` permite indicar un usuario distinto, que debe existir y estar activo. El creador no se puede cambiar mediante PATCH. Las actividades nuevas comienzan con estado `pending`.

## Respuesta de actividad

POST, GET individual y PATCH retornan `{ "activity": ... }`:

```json
{
  "activity": {
    "activityId": "11111111-1111-4111-8111-111111111111",
    "title": "Jornada académica",
    "description": "Actividad institucional",
    "type": "ordinary",
    "startDate": "2026-11-10",
    "endDate": "2026-11-11",
    "generalObservation": null,
    "requiresCertified": false,
    "requiresAuthority": true,
    "objectiveId": null,
    "creator": { "userId": "22222222-2222-4222-8222-222222222222", "username": "Usuario ejemplo" },
    "status": "pending",
    "createdAt": "2026-10-13T18:00:00.000Z",
    "updatedAt": "2026-10-13T18:00:00.000Z",
    "actions": { "canView": true, "canUpdate": true, "canApprove": false, "canDelete": false }
  }
}
```

El listado devuelve `{ activities: [...], total, page, limit }`; cada actividad incluye las acciones efectivas de la persona que consulta. Los campos que permiten null reflejan también registros anteriores del sistema.

## Integración del formulario y botón de aprobación

`GET /api/activities/capabilities` devuelve:

```json
{
  "canCreate": true,
  "canAssignCreator": false,
  "canViewAll": true,
  "canViewOwn": true,
  "canUpdateAll": true,
  "canUpdateOwn": true,
  "canApprove": true,
  "canDelete": false,
  "approvalOptions": [
    { "value": "approved", "label": "Aprobado" },
    { "value": "rejected", "label": "No aprobado" },
    { "value": "cancelled", "label": "Cancelado" },
    { "value": "rescheduled", "label": "Reprogramación" }
  ]
}
```

Este ejemplo corresponde a DIRECTIVO. Sin permisos de aprobación, `approvalOptions` es un arreglo vacío.

- Mostrar el selector de creador solo con `canAssignCreator`. Cargar sus opciones paginadas desde `/creators`, cuya respuesta es `{ users: [{ userId, username }], total, page, limit }`.
- Mostrar el botón de aprobación según `activity.actions.canApprove` y usar `approvalOptions` para el selector.
- Enviar `PATCH /api/activities/:activityId/approval` con `{ "status": "approved" }`, o cualquiera de los otros tres valores.
- Volver a cargar capacidades después de cambios de permisos y manejar 403; ocultar botones no reemplaza la autorización del servidor.

La aprobación de este ticket se guarda en `overall_status`. No altera los dictámenes `planning_approved`, `academic_approved` ni `admin_approved`: no se definió aquí un flujo de aprobación por las tres direcciones. `rescheduled` registra la decisión; las nuevas fechas se modifican mediante PATCH ordinario.

El ticket entrega la API y el soporte de permisos del panel; la pantalla del formulario de actividades y su botón de aprobación se integran en frontend usando este contrato.

## Actualización, eliminación y errores

PATCH ordinario acepta los campos de creación excepto `creatorId`. Los campos omitidos conservan su valor. No permite `status`, campos de aprobación, IDs internos ni otros campos desconocidos. El rango de fechas se valida también contra las fechas que ya están guardadas, dentro de una transacción serializable.

La eliminación es física. PostgreSQL impide borrar actividades con reservaciones relacionadas; la API devuelve 409, sin eliminar esas reservaciones. Las relaciones configuradas con cascada en el esquema existente siguen esa configuración.

| Código | Motivo |
| --- | --- |
| 400 | UUID, fechas, paginación o body inválido; creador inexistente/inactivo |
| 401 | Sesión ausente/inválida o cuenta inactiva |
| 403 | Falta el permiso para la operación o intento de asignar otro creador sin manage |
| 404 | Actividad inexistente o fuera del alcance propio; evita revelar actividades ajenas |
| 409 | Restricción de relación en PostgreSQL o actualización concurrente conflictiva |

## Pruebas reproducibles

Con Node 24.20.0 y pnpm 12.3.4, desde la raíz:

```powershell
pnpm --filter @shared/contracts build
pnpm --filter backend exec vitest run src/activities/application/activities.use-case.spec.ts
pnpm --filter backend test:activities:postgres
pnpm --filter backend test:rbac
pnpm --filter backend lint
pnpm --filter frontend exec eslint src/components/CreatePermissionForm.tsx src/components/PermissionsTab.tsx
pnpm --filter frontend exec tsc --noEmit
```

La prueba PostgreSQL utiliza el `.env` del backend, exige una base local y crea fixtures temporales con IDs propios, eliminándolos al terminar. Comprueba 47 peticiones HTTP: login, CRUD, scopes, suplantación de creador, validación, cuatro estados, capacidades y revocación de permisos con JWT ya emitido. Las siete pruebas unitarias nuevas y las once pruebas HTTP previas pasan.

La suite unitaria general conserva tres fallos anteriores en `prisma/rbac.seed.spec.ts`; este ticket no modifica el seed. No se debe reportar toda la suite como aprobada.

Verificación manual ejecutada en Thunder Client el 13 de octubre de 2026 sobre una actividad temporal: POST 201, GET 200, PATCH 200 y DELETE 204. Se confirmó la eliminación en PostgreSQL. La cuenta temporal autorizada y el archivo local de su token fueron eliminados al terminar; los tokens de esa cuenta ya no permiten acceder a la API. El monorepo completo también compiló correctamente con `pnpm build`.

Para pruebas manuales se incluye `thunder-client/actividades.postman_collection.json`, importable en Thunder Client mediante **Collections → Import → Postman**. Configurar `baseUrl`, tokens y los IDs de actividades en las variables. No contiene credenciales reales. Usar registros de prueba al ejecutar DELETE.
