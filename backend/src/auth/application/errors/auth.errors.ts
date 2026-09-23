export class InvalidCredentialsError extends Error {
  constructor() {
    super('Credenciales inválidas');
    this.name = 'InvalidCredentialsError';
  }
}

export class InactiveUserError extends Error {
  constructor() {
    super('El usuario se encuentra inactivo');
    this.name = 'InactiveUserError';
  }
}

export class SuperUserAccessDeniedError extends Error {
  constructor() {
    super('El usuario no tiene permisos de superusuario');
    this.name = 'SuperUserAccessDeniedError';
  }
}