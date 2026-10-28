import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/infrastructure/auth.module.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { ActivitiesRepository } from '../domain/activities.repository.js';
import { ActivitiesUseCase } from '../application/activities.use-case.js';
import { ActivitiesController } from '../presentation/activities.controller.js';
import { PrismaActivitiesRepository } from './prisma-activities.repository.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [ActivitiesController],
  providers: [
    { provide: ActivitiesRepository, useClass: PrismaActivitiesRepository },
    {
      provide: ActivitiesUseCase,
      useFactory: (repository: ActivitiesRepository) =>
        new ActivitiesUseCase(repository),
      inject: [ActivitiesRepository],
    },
  ],
})
export class ActivitiesModule {}
