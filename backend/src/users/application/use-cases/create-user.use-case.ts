import type {
  CreateUserDto,
  CreateUserResultDto,
} from '../dto/create-user.dto.js';

import {
  InvalidUserDataError,
  UserAlreadyExistsError,
} from '../errors/user.errors.js';

import { UsersRepository } from '../../domain/ports/users.repository.js';
import { PasswordEncoderPort } from '../../domain/ports/password-encoder.port.js';

export class CreateUserUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly passwordEncoder: PasswordEncoderPort,
  ) {}

  async execute(
    input: CreateUserDto,
  ): Promise<CreateUserResultDto> {
    const email = input.email?.trim().toLowerCase();
    const username = input.username?.trim() || null;
    const password = input.password;

    if (!email) {
      throw new InvalidUserDataError(
        'El correo electrónico es obligatorio',
      );
    }

    if (!password) {
      throw new InvalidUserDataError(
        'La contraseña es obligatoria',
      );
    }

    if (password.length < 8) {
      throw new InvalidUserDataError(
        'La contraseña debe tener al menos 8 caracteres',
      );
    }

    const alreadyExists =
      await this.usersRepository.existsByEmail(email);

    if (alreadyExists) {
      throw new UserAlreadyExistsError();
    }

    const passwordHash =
      await this.passwordEncoder.hash(password);

    const user = await this.usersRepository.create({
      username,
      email,
      passwordHash,
    });

    return {
      userId: user.userId,
      username: user.username,
      email: user.email,
      status: user.status,
      createdAt: user.createdAt,
    };
  }
}