Primeros Pasos (Getting Started)
1. Clonar el repositorio y situarse en la rama de integración
Bash
git clone [https://github.com/KennethEvolves/siplap-booked.git](https://github.com/KennethEvolves/siplap-booked.git)

```bash
cd siplap-booked
git checkout lab
git pull origin lab
```

2. Instalar dependencias

```bash
pnpm install
```
3. Configuración de Variables de Entorno
Backend (backend/.env)
Crea un archivo .env dentro de la carpeta backend/ con las credenciales de conexión y configuración JWT:

Fragmento de código
DATABASE_URL="postgresql://USUARIO:PASSWORD@localhost:5432/siplap_db?schema=public"
JWT_SECRET="tu_clave_secreta_jwt"
PORT=3001
Frontend (frontend/.env.local)

Inicialización de la Base de Datos y RBAC

```bash
# 1. Generar los tipos del cliente Prisma
pnpm --filter backend prisma generate

# 2. Ejecutar las migraciones
pnpm --filter backend prisma migrate deploy

# 3. Poblar la base de datos con roles y los 26 permisos estandarizados (RBAC-05)
pnpm --filter backend prisma db seed
```
Usuario inicial de prueba:

Correo: admin@siplap.com

Rol: SUPERUSUARIO (acceso a la administración global de cuentas, roles y matriz de permisos).

Ejecución en Desarrollo
Bash
pnpm dev
Rutas principales:
Frontend: http://localhost:3000

/login: Inicio de sesión institucional.

/dashboard: Panel central con validación de roles y accesos directos condicionales.

/admin: Panel administrativo para gestión de usuarios, roles y asignación de permisos.
