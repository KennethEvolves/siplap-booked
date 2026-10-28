export interface User {
  userId: string;
  roles: { roleId: string; name: string | null }[];
  username: string | null;
  email: string;
  status: string | null;
  typeId: string | null;
  departmentId: string | null;
  createdAt: Date | null;
}