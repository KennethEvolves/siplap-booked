export class UserAlreadyExistsError extends Error {
  constructor() {
    super('Ya existe un usuario con ese correo');
    this.name = 'UserAlreadyExistsError';
  }
}

export class InvalidUserDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidUserDataError';
  }
}