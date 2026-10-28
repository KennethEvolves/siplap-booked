export interface Permission {
  permissionId: string;
  name: string | null;
  slug: string;
  description: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}