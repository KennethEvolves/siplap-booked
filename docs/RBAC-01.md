# RBAC-01

## Entorno y comandos

El workspace fija pnpm **12.3.4** y Node **24.20.0**. `devEngines.runtime` descarga el Node requerido y pnpm lo utiliza en sus scripts; el Node global no se modifica.

```sh
pnpm install --frozen-lockfile
pnpm exec node --version
pnpm --version
pnpm build
pnpm test
pnpm dev
```

`pnpm build` compila primero `packages/shared` (`@shared/contracts`) y luego NestJS y Next.js. `pnpm dev` prepara las dependencias y observa también los contratos compartidos. El backend requiere `DATABASE_URL` y `JWT_SECRET` en `backend/.env`; el panel usa `NEXT_PUBLIC_API_URL` (por defecto `http://localhost:4001`).

## Capas

- `packages/shared/src/index.ts`: esquemas Zod estrictos y tipos inferidos de creación, actualización y asignación. Las actualizaciones parciales no aceptan cuerpos vacíos. Se validan UUID, correo, longitudes de columnas y el límite de 72 bytes de bcrypt.
- `domain/ports`: contratos de repositorios; no dependen de NestJS ni Prisma.
- `application/use-cases`: creación, consulta, actualización, eliminación y asignaciones. La contraseña se procesa mediante el puerto de cifrado. Los módulos NestJS inyectan los casos de uso mediante factories.
- `infrastructure/persistence`: acceso exclusivo por Prisma, selección explícita de campos públicos y transacciones para eliminar asignaciones junto con su entidad.
- `presentation`: guards, pipes Zod y traducción de errores a HTTP. Los controladores no consultan Prisma.

## API

Todas las rutas requieren JWT y rol `SUPERUSUARIO`.

| Ruta | Método | Respuesta |
| --- | --- | --- |
| `/users`, `/roles`, `/permissions` | GET | 200: `{ message, total, users/roles/permissions }` |
| `/users`, `/roles`, `/permissions` | POST | 201: `{ message, user/role/permission }` |
| `/users/:userId`, `/roles/:roleId`, `/permissions/:permissionId` | PATCH | 200: `{ message, user/role/permission }` |
| `/users/:userId`, `/roles/:roleId`, `/permissions/:permissionId` | DELETE | 204, sin cuerpo |
| `/users/:userId/roles/:roleId` | POST | 201: `{ message, assignment }` |
| `/roles/:roleId/permissions/:permissionId` | POST | 201: `{ message, assignment }` |

Validación: 400 con `{ message, errors: [{ path, message }] }`. Autenticación: 401. Autorización: 403. Registro inexistente: 404. Duplicados, asignaciones repetidas y dependencias que bloquean una operación: 409.

PATCH conserva los campos omitidos; en usuarios, omitir `password` conserva la contraseña. El rol `SUPERUSUARIO` no se puede renombrar ni eliminar; la cuenta que ejecuta la operación no puede eliminarse a sí misma. Si un usuario tiene relaciones ajenas a RBAC que impiden su eliminación, se devuelve 409 y la transacción conserva sus asignaciones.

En el panel, **Editar** carga el registro en su formulario; **Guardar cambios** envía PATCH. **Cancelar edición** limpia el formulario. **Eliminar** pide confirmación, envía DELETE y actualiza tablas y selectores. Los botones quedan deshabilitados durante la operación.

## PostgreSQL existente

La migración `20260923000000_rbac_unique_keys` agrega índices únicos a `users.email`, `roles.name` y `permissions.slug`; evita duplicados incluso entre solicitudes concurrentes. No borra ni modifica datos existentes. Hay que resolver duplicados antes de aplicarla.

Este repositorio partía de una base existente introspectada, sin migración inicial. Para incorporar los índices a otra copia de esa base y registrar su aplicación:

```sh
pnpm --filter backend exec prisma db execute --file prisma/migrations/20260923000000_rbac_unique_keys/migration.sql
pnpm --filter backend exec prisma migrate resolve --applied 20260923000000_rbac_unique_keys
```

Ejecutar cada paso solo si el anterior tuvo éxito. La migración presupone que las tablas existentes ya están creadas; no es un esquema inicial para una base vacía. Los índices ya fueron aplicados y registrados en la base local durante esta implementación.

## Verificación

`pnpm test` ejecuta la prueba de salud y seis suites HTTP con los módulos NestJS, guards JWT, pipes, casos de uso y adaptadores reales, reemplazando únicamente la conexión de base de datos por un doble en memoria.

Para repetir la prueba contra PostgreSQL local, arrancar el backend en el puerto 4011 (o definir `RBAC_TEST_URL` con otro puerto local) y ejecutar:

```sh
pnpm --filter backend test:rbac:postgres
```

Esta prueba firma un JWT temporal con el secreto local, crea registros identificados con `rbac-test-`, comprueba CRUD, asignaciones y duplicados concurrentes, y elimina sus registros en `finally`. No debe ejecutarse contra entornos compartidos o productivos.
