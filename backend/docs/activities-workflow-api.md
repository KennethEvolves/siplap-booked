# API backend para actividades y flujo de planeación

Todas las rutas requieren `Authorization: Bearer <accessToken>`. Los endpoints se implementan en NestJS; la persistencia de PostgreSQL está encapsulada en repositorios Prisma. Las fechas de actividad usan `YYYY-MM-DD`; las fechas de reservación usan ISO 8601 con zona horaria.

## Actividades

La API acepta tanto `/api/activities` como `/activities`.

| Método y ruta | Permiso / alcance | Resultado |
| --- | --- | --- |
| `GET /api/activities/capabilities` | Usuario autenticado | Permisos efectivos para mostrar acciones en UI. |
| `GET /api/activities?page=1&limit=20` | `activity:view_all`, `activity:view_own` o `activity:view_assigned` | Lista paginada según el alcance del usuario. |
| `GET /api/activities/:id` | Permiso de lectura; datos limitados a creadas o asignadas salvo lectura global | `{ "activity": ... }`. |
| `POST /api/activities` | Crear propia o administrar; un administrador debe indicar otro `creatorId` | `{ "activity": ... }`. Puede incluir ubicaciones externas. |
| `PATCH /api/activities/:id` | `activity:update_all` o `activity:update_own` sobre propia | Actualiza campos enviados. La reasignación del creador requiere administración. |
| `PATCH /api/activities/:id/approval` | `activity:approve_all` o `activity:manage` | Actualiza la aprobación de una dirección y recalcula el estado global. |
| `DELETE /api/activities/:id` | `activity:manage` o `manage:all` | `204 No Content`. |
| `GET /api/activities/:id/report` | Lectura de la actividad | Reporte de planeación generado tras completar aprobaciones. Mientras no exista, responde `404`. |

Para el subflujo de espacios universitarios, `GET /api/reservations/spaces` devuelve el catálogo de espacios activos a los usuarios que pueden crear reservaciones. `POST /api/reservations` acepta `spaceIds: ["<uuid>"]`; `PUT/PATCH /api/reservations/:id` reemplaza la selección cuando se envía `spaceIds` (una lista vacía la quita). Las reservaciones devuelven `spaces` con los espacios asociados. El backend rechaza espacios inexistentes o inactivos.

Ejemplo de creación:

```json
{
  "title": "Jornada de orientación",
  "description": "Sesión informativa",
  "type": "ordinary",
  "startDate": "2026-11-10",
  "endDate": "2026-11-10",
  "externalLocations": [
    {
      "googlePlaceId": "ChIJ_example",
      "name": "Centro de convenciones",
      "formattedAddress": "Av. Ejemplo 123",
      "latitude": 19.4326,
      "longitude": -99.1332
    }
  ]
}
```

El rol administrador debe enviar `creatorId` de un usuario activo distinto al administrador. Para creación propia, el backend toma el usuario autenticado. La lista `externalLocations` es opcional, admite hasta 20 lugares y rechaza IDs de Google repetidos o coordenadas fuera de rango.

## Aprobaciones y reservaciones

Las aprobaciones se guardan por separado para `planning`, `academic` y `administrative`:

```json
{ "direction": "planning", "status": "approved" }
```

`status` puede ser `approved`, `rejected`, `cancelled` o `rescheduled`. El estado global queda cancelado si alguna dirección cancela; rechazado si alguna rechaza; reprogramado si alguna lo solicita; aprobado solo cuando las tres aprueban; en los demás casos sigue pendiente. Al aprobarse, las reservaciones enlazadas pasan a `reserved` y se crea/actualiza el reporte de planeación. Antes de la aprobación permanecen `pending`. La API de reservaciones permite filtrar el calendario por rango usando `GET /api/reservations?startTime=<ISO>&endTime=<ISO>` y devuelve los registros guardados en PostgreSQL.

## Ubicaciones externas (Subflujo 2)

Una ubicación se guarda una sola vez por `googlePlaceId`; la relación con actividad se almacena en `activity_external_locations`, lo que permite varias actividades por lugar y varios lugares por actividad.

| Método y ruta | Descripción |
| --- | --- |
| `GET /api/activities/:id/external-locations` | Lista ubicaciones de la actividad, conforme a su alcance de lectura. |
| `POST /api/activities/:id/external-locations` | Vincula 1–20 ubicaciones existentes/seleccionadas; el backend hace upsert por Google Place ID. |
| `DELETE /api/activities/:id/external-locations/:locationId` | Quita la relación con esa actividad (`204`); no borra la ubicación compartida del catálogo. |

El backend no llama a Google Maps: almacena el Place ID, nombre, dirección y coordenadas que envía el cliente después de que el usuario seleccione el resultado en el mapa.

## Personal colaborador y notificaciones

| Método y ruta | Descripción |
| --- | --- |
| `GET /api/activities/:id/personnel` | Lista colaboradores asignados a la actividad. |
| `PUT /api/activities/:id/personnel` | Reemplaza las asignaciones con `{ "userIds": ["<uuid>"] }`; los usuarios deben estar activos. |
| `GET /api/notifications?page=1&limit=20&unreadOnly=true` | Consulta únicamente las notificaciones del usuario autenticado. |
| `PATCH /api/notifications/:id/read` | Marca como leída únicamente una notificación del usuario autenticado. |

Al asignar colaboradores, vincular una reservación o completar una aprobación, el backend crea las notificaciones correspondientes. El estado `read_at` permite al cliente distinguir pendientes de leídas.

## Ejes y objetivos estratégicos

`GET/POST /api/axes`, `PATCH /api/axes/:axisId`, `GET/POST /api/objectives` y `PATCH /api/objectives/:objectiveId` exponen el catálogo que ya existe en PostgreSQL. La lectura requiere sesión; las mutaciones revisan los permisos `axes:*` y `objectives:*` o el permiso global de administración.

## Esquema y migración

La migración `20261027000000_external_activity_locations_reservation_states` crea el catálogo de ubicaciones y su pivote, agrega restricciones de coordenadas y agrega `pending`/`reserved` a `reservation_status`. Aplicar en el entorno local con `pnpm --filter backend exec prisma migrate deploy` (o `prisma migrate dev` durante desarrollo) después de iniciar PostgreSQL. La conexión local no estuvo disponible durante la implementación, así que el archivo SQL está preparado y el cliente Prisma generado, pero hay que aplicar la migración a la base activa antes de usar estos endpoints.
