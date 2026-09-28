import { z } from 'zod';

export const uuidSchema = z.uuid();
const description = z.string().trim().max(255);
const password = z
  .string()
  .min(8)
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    'La contraseña no puede superar los 72 bytes',
  );
export const createUserSchema = z.strictObject({
  username: z.string().trim().max(50).optional(),
  email: z.string().trim().toLowerCase().max(150).pipe(z.email()),
  password,
});
export const createRoleSchema = z.strictObject({
  name: z.string().trim().toUpperCase().min(1).max(100),
  description: description.optional(),
});
export const createPermissionSchema = z.strictObject({
  name: z.string().trim().toUpperCase().max(150).optional(),
  slug: z.string().trim().toLowerCase().min(1).max(255),
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
