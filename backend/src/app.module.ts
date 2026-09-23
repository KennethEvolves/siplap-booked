import { Module } from '@nestjs/common';

import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/infrastructure/auth.module.js';
import { UsersModule } from './users/infrastructure/users.module.js';
import { RolesModule } from './roles/infrastructure/roles.module.js';
import { PermissionsModule } from './permissions/infrastructure/permissions.module.js';

import { AppController } from './app.controller.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
  ],

  controllers: [
    AppController,
  ],

  providers: [],
})
export class AppModule {}