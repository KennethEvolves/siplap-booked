export class RoleNotFoundError extends Error {
  constructor() {
    super('El rol no existe');
    this.name = 'RoleNotFoundError';
  }
}

export class PermissionNotFoundError extends Error {
  constructor() {
    super('El permiso no existe');
    this.name = 'PermissionNotFoundError';
  }
}

export class RoleAlreadyHasPermissionError extends Error {
  constructor() {
    super('El rol ya tiene asignado ese permiso');
    this.name = 'RoleAlreadyHasPermissionError';
  }
}

export class InvalidRolePermissionDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRolePermissionDataError';
  }
}