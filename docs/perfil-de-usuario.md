# API de perfil de usuario — SIPLAP y Booked

## Rutas y autenticación

GET /api/users/profile y PATCH /api/users/profile. También existen GET/PATCH /users/profile como rutas equivalentes para clientes que utilizan la API sin prefijo. Se usa Authorization: Bearer <accessToken>, obtenido en POST /auth/login. Toda cuenta activa puede consultar y editar su propio perfil, tenga o no roles.

El ID siempre proviene del sub del JWT validado. No hay parámetro para seleccionar otra cuenta y no se admite userId en el body. Roles, estado, departamento, tipo de usuario y turno son de solo lectura. Las contraseñas se gestionan fuera de este endpoint.

## Respuesta de GET y PATCH (200)

```json
{
  "profile": {
    "userId": "11111111-1111-4111-8111-111111111111",
    "username": "ana",
    "email": "ana@example.com",
    "status": { "statusId": "22222222-2222-4222-8222-222222222222", "name": "ACTIVE" },
    "userType": null,
    "department": null,
    "roles": [],
    "firstName": "Ana",
    "lastName": "Pérez",
    "phoneNumber": "5551234567",
    "avatarUrl": null,
    "dateOfBirth": "1998-04-15",
    "bio": "Perfil de SIPLAP y Booked",
    "shift": null,
    "createdAt": "2026-10-07T12:00:00.000Z",
    "updatedAt": "2026-10-07T12:30:00.000Z"
  }
}
```

Cuando existen, userType es { typeId, name }, department es { departmentId, name } y cada rol es { roleId, name }. Si todavía no existe una fila en profiles, todos los campos personales y shift se devuelven como null. El perfil se consulta con una selección explícita de campos; nunca se exponen password_hash, tokens ni credenciales. createdAt/updatedAt son las fechas de la cuenta, en ISO UTC; dateOfBirth es una fecha sin zona horaria YYYY-MM-DD.

## PATCH parcial

```json
{
  "firstName": "Ana",
  "lastName": "Pérez",
  "dateOfBirth": "1998-04-15",
  "phoneNumber": "5551234567",
  "bio": "Perfil actualizado"
}
```

Los campos omitidos conservan su valor. firstName, lastName, phoneNumber, avatarUrl y bio admiten null para limpiar el campo. dateOfBirth no admite null porque es obligatoria en la tabla existente. Al crear por primera vez un perfil personal es necesario incluir dateOfBirth; editar solamente username/email no obliga a crear una fila profiles. No se inventa una fecha por defecto.

| Campo editable | Validación |
| --- | --- |
| username | Texto recortado, 3–50 caracteres |
| email | Correo válido, máximo 150 caracteres; se normaliza a minúsculas |
| firstName / lastName | Texto recortado de 1–100 caracteres o null |
| phoneNumber | Texto recortado de 1–20 caracteres o null |
| avatarUrl | URL HTTP/HTTPS de hasta 2048 caracteres o null |
| dateOfBirth | Fecha real YYYY-MM-DD, no futura |
| bio | Texto recortado de hasta 2000 caracteres o null |

El esquema Zod updateProfileSchema y los tipos UpdateProfile/UserProfile se exportan desde @shared/contracts. El envío requiere Content-Type: application/json. Un body vacío o con campos desconocidos es inválido. La cuenta y la fila de perfil se actualizan en una transacción Prisma.

## Errores

- 400: datos inválidos, campos desconocidos o falta de fecha de nacimiento al crear el perfil.
- 401: falta de token, token expirado/inválido, cuenta eliminada o inactiva.
- 404: la cuenta desaparece antes de consultar/guardar.
- 409: correo ya utilizado por otra cuenta o conflicto de integridad concurrente.

## Validación

Con pnpm 12.3.4 y Node 24.20.0:

```sh
pnpm --filter @shared/contracts build
pnpm --filter backend test
pnpm --filter backend test:rbac
pnpm --filter backend lint
```

Las pruebas HTTP cubren consulta sin rol, creación de perfil, actualización parcial, normalización del correo, campos protegidos, fechas inválidas, duplicados y aislamiento entre dos cuentas. Las pruebas unitarias cubren reglas del caso de uso y ausencia de escrituras cuando la entrada no permite la operación.
