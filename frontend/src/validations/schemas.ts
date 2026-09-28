// src/validations/schemas.ts
import { z } from 'zod';

// Esquema para validar la creación de Usuarios
export const createUserSchema = z.object({
  username: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres'),
  email: z.string().email('El correo electrónico no es válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

// Esquema para validar la creación de Roles
export const createRoleSchema = z.object({
  name: z.string().min(2, 'El nombre del rol es obligatorio'),
  description: z.string().optional(),
});

// Esquema para validar la creación de Permisos
export const createPermissionSchema = z.object({
  name: z.string().min(2, 'El nombre del permiso es obligatorio'),
  slug: z.string().min(2, 'El slug es obligatorio (ej. users:create)'),
  description: z.string().optional(),
});