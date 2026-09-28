import { UpdateUserUseCase } from '../application/use-cases/update-user.use-case.js';
import { DeleteUserUseCase } from '../application/use-cases/delete-user.use-case.js';
import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module.js';

import { AuthModule } from '../../auth/infrastructure/auth.module.js';

import { UsersRepository } from '../domain/ports/users.repository.js';

import { PasswordEncoderPort } from '../domain/ports/password-encoder.port.js';

import { UserRoleRepository } from '../domain/ports/user-role.repository.js';

import { PrismaUsersRepository } from './persistence/prisma-users.repository.js';

import { PrismaUserRoleRepository } from './persistence/prisma-user-role.repository.js';

import { BcryptPasswordEncoder } from './security/bcrypt-password-encoder.js';

import { CreateUserUseCase } from '../application/use-cases/create-user.use-case.js';

import { GetUsersUseCase } from '../application/use-cases/get-users.use-case.js';

import { AssignRoleToUserUseCase } from '../application/use-cases/assign-role-to-user.use-case.js';

import { UsersController } from '../presentation/users.controller.js';

@Module({
  imports: [PrismaModule, AuthModule],

  controllers: [UsersController],

  providers: [
    {
      provide: UpdateUserUseCase,
      useFactory: (repository: UsersRepository, encoder: PasswordEncoderPort) =>
        new UpdateUserUseCase(repository, encoder),
      inject: [UsersRepository, PasswordEncoderPort],
    },
    {
      provide: DeleteUserUseCase,
      useFactory: (repository: UsersRepository) =>
        new DeleteUserUseCase(repository),
      inject: [UsersRepository],
    },
    {
      provide: UsersRepository,
      useClass: PrismaUsersRepository,
    },

    {
      provide: PasswordEncoderPort,
      useClass: BcryptPasswordEncoder,
    },

    {
      provide: UserRoleRepository,
      useClass: PrismaUserRoleRepository,
    },

    {
      provide: CreateUserUseCase,

      useFactory: (
        usersRepository: UsersRepository,

        passwordEncoder: PasswordEncoderPort,
      ) => {
        return new CreateUserUseCase(usersRepository, passwordEncoder);
      },

      inject: [UsersRepository, PasswordEncoderPort],
    },

    {
      provide: GetUsersUseCase,

      useFactory: (usersRepository: UsersRepository) => {
        return new GetUsersUseCase(usersRepository);
      },

      inject: [UsersRepository],
    },

    {
      provide: AssignRoleToUserUseCase,

      useFactory: (userRoleRepository: UserRoleRepository) => {
        return new AssignRoleToUserUseCase(userRoleRepository);
      },

      inject: [UserRoleRepository],
    },
  ],
})
export class UsersModule {}
