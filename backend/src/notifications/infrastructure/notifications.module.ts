import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/infrastructure/auth.module.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { NotificationsUseCase } from '../application/notifications.use-case.js';
import { NotificationsRepository } from '../domain/notifications.repository.js';
import { NotificationsController } from '../presentation/notifications.controller.js';
import { PrismaNotificationsRepository } from './prisma-notifications.repository.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [NotificationsController],
  providers: [
    { provide: NotificationsRepository, useClass: PrismaNotificationsRepository },
    { provide: NotificationsUseCase, useFactory: (repository: NotificationsRepository) => new NotificationsUseCase(repository), inject: [NotificationsRepository] },
  ],
})
export class NotificationsModule {}
