export interface User {
  userId: string;
  username: string | null;
  email: string;
  status: string | null;
  typeId: string | null;
  departmentId: string | null;
  createdAt: Date | null;
}