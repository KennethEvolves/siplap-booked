import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module.js';

import { AuthModule } from '../../auth/infrastructure/auth.module.js';

import { PermissionsRepository } from '../domain/ports/permissions.repository.js';

import { PrismaPermissionsRepository } from './persistence/prisma-permissions.repository.js';

import { CreatePermissionUseCase } from '../application/use-cases/create-permission.use-case.js';

import { GetPermissionsUseCase } from '../application/use-cases/get-permissions.use-case.js';

import { PermissionsController } from '../presentation/permissions.controller.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
  ],

  controllers: [
    PermissionsController,
  ],

  providers: [
    {
      provide:
        PermissionsRepository,

      useClass:
        PrismaPermissionsRepository,
    },

    {
      provide:
        CreatePermissionUseCase,

      useFactory: (
        permissionsRepository:
          PermissionsRepository,
      ) => {
        return new CreatePermissionUseCase(
          permissionsRepository,
        );
      },

      inject: [
        PermissionsRepository,
      ],
    },

    {
      provide:
        GetPermissionsUseCase,

      useFactory: (
        permissionsRepository:
          PermissionsRepository,
      ) => {
        return new GetPermissionsUseCase(
          permissionsRepository,
        );
      },

      inject: [
        PermissionsRepository,
      ],
    },
  ],
})
export class PermissionsModule {}