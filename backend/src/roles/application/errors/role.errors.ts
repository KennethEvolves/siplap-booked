export class RoleAlreadyExistsError extends Error {
  constructor() {
    super('Ya existe un rol con ese nombre');
    this.name = 'RoleAlreadyExistsError';
  }
}

export class InvalidRoleDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRoleDataError';
  }
}