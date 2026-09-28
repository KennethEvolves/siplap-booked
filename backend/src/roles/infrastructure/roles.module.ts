import { UpdateRoleUseCase } from '../application/use-cases/update-role.use-case.js';
import { DeleteRoleUseCase } from '../application/use-cases/delete-role.use-case.js';
import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module.js';

import { AuthModule } from '../../auth/infrastructure/auth.module.js';

import { RolesRepository } from '../domain/ports/roles.repository.js';

import { RolePermissionRepository } from '../domain/ports/role-permission.repository.js';

import { PrismaRolesRepository } from './persistence/prisma-roles.repository.js';

import { PrismaRolePermissionRepository } from './persistence/prisma-role-permission.repository.js';

import { CreateRoleUseCase } from '../application/use-cases/create-role.use-case.js';

import { GetRolesUseCase } from '../application/use-cases/get-roles.use-case.js';

import { AssignPermissionToRoleUseCase } from '../application/use-cases/assign-permission-to-role.use-case.js';

import { RolesController } from '../presentation/roles.controller.js';

@Module({
  imports: [PrismaModule, AuthModule],

  controllers: [RolesController],

  providers: [
    {
      provide: UpdateRoleUseCase,
      useFactory: (repository: RolesRepository) =>
        new UpdateRoleUseCase(repository),
      inject: [RolesRepository],
    },
    {
      provide: DeleteRoleUseCase,
      useFactory: (repository: RolesRepository) =>
        new DeleteRoleUseCase(repository),
      inject: [RolesRepository],
    },
    {
      provide: RolesRepository,
      useClass: PrismaRolesRepository,
    },

    {
      provide: RolePermissionRepository,

      useClass: PrismaRolePermissionRepository,
    },

    {
      provide: CreateRoleUseCase,

      useFactory: (rolesRepository: RolesRepository) => {
        return new CreateRoleUseCase(rolesRepository);
      },

      inject: [RolesRepository],
    },

    {
      provide: GetRolesUseCase,

      useFactory: (rolesRepository: RolesRepository) => {
        return new GetRolesUseCase(rolesRepository);
      },

      inject: [RolesRepository],
    },

    {
      provide: AssignPermissionToRoleUseCase,

      useFactory: (rolePermissionRepository: RolePermissionRepository) => {
        return new AssignPermissionToRoleUseCase(rolePermissionRepository);
      },

      inject: [RolePermissionRepository],
    },
  ],
})
export class RolesModule {}
