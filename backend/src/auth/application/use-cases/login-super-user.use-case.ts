import type {
  LoginDto,
  LoginResultDto,
} from '../dto/login.dto.js';

import {
  InvalidCredentialsError,
  InactiveUserError,
  SuperUserAccessDeniedError,
} from '../errors/auth.errors.js';

import { UserRepository } from '../../domain/ports/user.repository.js';
import { PasswordHasherPort } from '../../domain/ports/password-hasher.port.js';
import { TokenServicePort } from '../../domain/ports/token-service.port.js';

export class LoginSuperUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly tokenService: TokenServicePort,
  ) {}

  async execute(input: LoginDto): Promise<LoginResultDto> {
    const email = input.email.trim().toLowerCase();

    // 1. Buscar usuario por correo
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new InvalidCredentialsError();
    }

    // 2. Comparar contraseña
    const passwordIsValid = await this.passwordHasher.compare(
      input.password,
      user.passwordHash,
    );

    if (!passwordIsValid) {
      throw new InvalidCredentialsError();
    }

    // 3. Comprobar que esté activo
    if (user.status !== 'ACTIVE') {
      throw new InactiveUserError();
    }

    // 4. Comprobar que tenga el rol SUPERUSUARIO
    const isSuperUser = user.roles.includes('SUPERUSUARIO');

    if (!isSuperUser) {
      throw new SuperUserAccessDeniedError();
    }

    // 5. Generar token JWT
    const accessToken = await this.tokenService.sign({
      sub: user.userId,
      email: user.email,
      roles: user.roles,
    });

    // 6. Devolver resultado seguro
    return {
      accessToken,

      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        roles: user.roles,
      },
    };
  }
}