export class PermissionAlreadyExistsError extends Error {
  constructor() {
    super('Ya existe un permiso con ese slug');
    this.name = 'PermissionAlreadyExistsError';
  }
}

export class InvalidPermissionDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPermissionDataError';
  }
}