import { z } from 'zod';

export const uuidSchema = z.uuid();
const description = z.string().trim().max(255);
const password = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres') // <-- Agregamos el mensaje aquí
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    'La contraseña no puede superar los 72 bytes',
  );
export const createUserSchema = z.strictObject({
username: z.string().trim().min(3, 'El nombre de usuario debe tener al menos 3 caracteres').max(50).optional(),
email: z.string().trim().toLowerCase().max(150).pipe(z.email()),
  password,
});
export const createRoleSchema = z.strictObject({
  name: z.string().trim().toUpperCase().min(1).max(100),
  description: description.optional(),
});
export const permissionSlugSchema = z.string().trim().toLowerCase().max(255).regex(
  /^[a-z][a-z0-9_-]*:[a-z][a-z0-9_-]*$/,
  'El permiso debe usar el formato recurso:accion, por ejemplo users:create',
);
export const createPermissionSchema = z.strictObject({
  name: z.string().trim().toUpperCase().max(150).optional(),
  slug: permissionSlugSchema,
  description: description.optional(),
});
const nonEmpty = (value: object) =>
  Object.values(value).some((v) => v !== undefined);
export const updateUserSchema = createUserSchema
  .partial()
  .refine(nonEmpty, 'Envía al menos un campo');
export const updateRoleSchema = createRoleSchema
  .partial()
  .refine(nonEmpty, 'Envía al menos un campo');
export const updatePermissionSchema = createPermissionSchema
  .partial()
  .refine(nonEmpty, 'Envía al menos un campo');
export const assignRoleSchema = z.strictObject({
  userId: uuidSchema,
  roleId: uuidSchema,
});
export const assignPermissionSchema = z.strictObject({
  roleId: uuidSchema,
  permissionId: uuidSchema,
});
export type CreateUser = z.infer<typeof createUserSchema>;
export type CreateRole = z.infer<typeof createRoleSchema>;
export type CreatePermission = z.infer<typeof createPermissionSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type UpdateRole = z.infer<typeof updateRoleSchema>;
export type UpdatePermission = z.infer<typeof updatePermissionSchema>;
export type AssignRole = z.infer<typeof assignRoleSchema>;
export type AssignPermission = z.infer<typeof assignPermissionSchema>;
export type { ZodType } from 'zod';

const profileBirthDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa YYYY-MM-DD')
  .refine(value => {
    const date = new Date(value + 'T00:00:00Z');
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && value <= new Date().toISOString().slice(0, 10);
  }, 'La fecha debe ser válida y no estar en el futuro');
export const updateProfileSchema = z.strictObject({
  username: createUserSchema.shape.username,
  email: createUserSchema.shape.email.optional(),
  firstName: z.string().trim().min(1).max(100).nullable().optional(),
  lastName: z.string().trim().min(1).max(100).nullable().optional(),
  phoneNumber: z.string().trim().min(1).max(20).nullable().optional(),
  avatarUrl: z.url().max(2048).refine(value => /^https?:\/\//i.test(value), 'Usa una URL HTTP o HTTPS').nullable().optional(),
  dateOfBirth: profileBirthDate.optional(),
  bio: z.string().trim().max(2000).nullable().optional(),
}).refine(nonEmpty, 'Envía al menos un campo');
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export interface UserProfile {
  userId: string; username: string | null; email: string;
  status: { statusId: string; name: string };
  userType: { typeId: string; name: string | null } | null;
  department: { departmentId: string; name: string } | null;
  roles: { roleId: string; name: string | null }[];
  firstName: string | null; lastName: string | null; phoneNumber: string | null;
  avatarUrl: string | null; dateOfBirth: string | null; bio: string | null; shift: string | null;
  createdAt: string | null; updatedAt: string | null;
}
