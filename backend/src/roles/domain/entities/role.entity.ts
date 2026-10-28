export interface Role {
  roleId: string;
  permissions: { permissionId: string; name: string | null; slug: string }[];
  name: string | null;
  description: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}