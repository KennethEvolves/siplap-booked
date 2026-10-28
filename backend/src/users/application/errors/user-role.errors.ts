export class UserNotFoundError extends Error {
  constructor() {
    super('El usuario no existe');
    this.name = 'UserNotFoundError';
  }
}

export class RoleNotFoundError extends Error {
  constructor() {
    super('El rol no existe');
    this.name = 'RoleNotFoundError';
  }
}

export class UserAlreadyHasRoleError extends Error {
  constructor() {
    super('El usuario ya tiene asignado ese rol');
    this.name = 'UserAlreadyHasRoleError';
  }
}

export class InvalidUserRoleDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidUserRoleDataError';
  }
}