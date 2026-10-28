import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/infrastructure/auth.module.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { PlanningUseCase } from '../application/planning.use-case.js';
import { PlanningRepository } from '../domain/planning.repository.js';
import { PlanningController } from '../presentation/planning.controller.js';
import { PrismaPlanningRepository } from './prisma-planning.repository.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [PlanningController],
  providers: [
    { provide: PlanningRepository, useClass: PrismaPlanningRepository },
    { provide: PlanningUseCase, useFactory: (repository: PlanningRepository) => new PlanningUseCase(repository), inject: [PlanningRepository] },
  ],
})
export class PlanningModule {}
