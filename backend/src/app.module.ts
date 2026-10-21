import { Module } from '@nestjs/common';
import { ActivitiesModule } from './activities/infrastructure/activities.module.js';

import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/infrastructure/auth.module.js';
import { UsersModule } from './users/infrastructure/users.module.js';
import { RolesModule } from './roles/infrastructure/roles.module.js';
import { PermissionsModule } from './permissions/infrastructure/permissions.module.js';
import { ReservationsModule } from './reservations/infrastructure/reservations.module.js';

import { AppController } from './app.controller.js';

@Module({
  imports: [
    ActivitiesModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    ReservationsModule,
  ],

  controllers: [
    AppController,
  ],

  providers: [],
})
export class AppModule {}
