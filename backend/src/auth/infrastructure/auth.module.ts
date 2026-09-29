import { Module } from '@nestjs/common';
import {
  JwtModule,
  type JwtSignOptions,
} from '@nestjs/jwt';

import { PrismaModule } from '../../prisma/prisma.module.js';
import { LoginUseCase } from '../application/use-cases/login.use-case.js';
import { UserRepository } from '../domain/ports/user.repository.js';
import { PasswordHasherPort } from '../domain/ports/password-hasher.port.js';
import { TokenServicePort } from '../domain/ports/token-service.port.js';
import { PrismaUserRepository } from './persistence/prisma-user.repository.js';
import { BcryptPasswordHasher } from './security/bcrypt-password-hasher.js';
import { JwtTokenService } from './security/jwt-token.service.js';
import { AuthController } from '../presentation/auth.controller.js';
import { JwtAuthGuard } from '../presentation/jwt-auth.guard.js';
import { SuperUserGuard } from '../presentation/super-user.guard.js';
import { RolesGuard } from '../presentation/roles.guard.js';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new Error('JWT_SECRET no está definida en el archivo .env');
        }

        const expiresIn = (
          process.env.JWT_EXPIRES_IN ?? '8h'
        ) as JwtSignOptions['expiresIn'];

        return {
          secret,
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
  ],
  controllers: [
    AuthController,
  ],
  providers: [
    {
      provide: UserRepository,
      useClass: PrismaUserRepository,
    },
    {
      provide: PasswordHasherPort,
      useClass: BcryptPasswordHasher,
    },
    {
      provide: TokenServicePort,
      useClass: JwtTokenService,
    },
    {
      provide: LoginUseCase,
      useFactory: (
        userRepository: UserRepository,
        passwordHasher: PasswordHasherPort,
        tokenService: TokenServicePort,
      ) => {
        return new LoginUseCase(
          userRepository,
          passwordHasher,
          tokenService,
        );
      },
      inject: [
        UserRepository,
        PasswordHasherPort,
        TokenServicePort,
      ],
    },
    JwtAuthGuard,
    SuperUserGuard,
    RolesGuard,
  ],
  exports: [
    LoginUseCase,
    JwtAuthGuard,
    SuperUserGuard,
    RolesGuard,
    JwtModule,
  ],
})
export class AuthModule {}