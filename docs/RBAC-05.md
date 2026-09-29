# RBAC-05: catálogo base de permisos

El seed de Prisma crea y vincula al rol `SUPERUSUARIO` estos nueve permisos:

| Recurso | Slugs |
| --- | --- |
| Usuarios | `users:create`, `users:read`, `users:update`, `users:delete` |
| Actividades | `activities:create`, `activities:read`, `activities:update`, `activities:delete` |
| Administración global | `manage:all` |

Las asociaciones se guardan en `role_permissions`. Si no existe `SUPERUSUARIO`, se crea el rol; no se crean cuentas ni se asignan roles a usuarios. Los demás roles conservan sus asignaciones actuales. No se define una nueva matriz de autorizaciones para COORDINADOR, JEFE DE PLAZA o MAESTRO sin una regla de negocio explícita.

## Ejecutar

Con pnpm 12.3.4, Node 24.20.0, `DATABASE_URL` configurada en `backend/.env` y el esquema PostgreSQL existente:

```sh
pnpm install --frozen-lockfile
pnpm --filter backend db:seed
```

También se puede usar el comando nativo:

```sh
pnpm --filter backend exec prisma db seed
```

`prisma.config.ts` registra `prisma/seed.ts` mediante `db:seed:run`. Este comando compila TypeScript y el cliente Prisma generado antes de ejecutar la semilla, sin requerir tsx, ts-node ni una compilación previa del frontend. Prisma generate debe haberse ejecutado (forma parte de postinstall).

El seed puebla datos; no crea las tablas. En una base vacía de desarrollo, primero hay que inicializar el esquema Prisma. No se ejecuta automáticamente al arrancar el servidor ni al instalar dependencias: se invoca explícitamente como paso de inicialización del entorno.

## Reejecución y compatibilidad

- Una transacción abarca el catálogo, la conversión de aliases y las asignaciones. Si falla, no quedan cambios parciales.
- Los upserts usan `permissions.slug`, `roles.name` y la clave compuesta de `role_permissions`. Repetir el seed conserva IDs y no duplica permisos ni asociaciones.
- Los equivalentes con punto de los nueve slugs base, como `users.create`, se convierten al formato con dos puntos conservando el ID y sus asignaciones.
- Si existen ambos formatos, se conservan el permiso canónico y la unión de sus asignaciones; se elimina únicamente el alias equivalente después de transferir sus relaciones.
- No se sobrescriben nombres ni descripciones personalizadas de registros existentes.
- Otros permisos se conservan. En la base local se detectó `sin espacios ni acentos`, cuyo significado no permite una conversión automática segura; necesita una definición funcional antes de renombrarlo.

El contrato compartido `permissionSlugSchema` exige `recurso:accion`: exactamente un separador `:`, identificadores que empiezan con una letra y contienen letras, dígitos, guiones o guiones bajos. Normaliza espacios exteriores y mayúsculas. Tanto POST como PATCH de permisos y el formulario administrativo usan este contrato; entradas como `users.create` o `users:create:extra` devuelven 400 en la API. El ejemplo del formulario se actualiza a `users:create`.

`manage:all` queda persistido y asociado a SUPERUSUARIO. Este trabajo no cambia la emisión de JWT ni la interpretación de permisos de los guards; no introduce un bypass de autorización por el nombre del permiso.

## Pruebas

```sh
pnpm test
pnpm build
```

Las pruebas del seed cubren creación, idempotencia, conservación de IDs y asociaciones, fusión de aliases y ausencia de privilegios nuevos para otros roles. Las pruebas HTTP verifican la aceptación de slugs con dos puntos y el rechazo de formatos inválidos en creación y edición.
