export interface UserRoleAssignment {
  userId: string;
  roleId: string;
  createdAt: Date | null;
}

export abstract class UserRoleRepository {
  abstract userExists(userId: string): Promise<boolean>;

  abstract roleExists(roleId: string): Promise<boolean>;

  abstract assignmentExists(
    userId: string,
    roleId: string,
  ): Promise<boolean>;

  abstract assignRole(
    userId: string,
    roleId: string,
  ): Promise<UserRoleAssignment>;
}