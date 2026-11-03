import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AuthModule } from '../../auth/infrastructure/auth.module.js';
import { DepartmentsUseCase } from '../application/departments.use-case.js';
import { DepartmentsRepository } from '../domain/departments.repository.js';
import { PrismaDepartmentsRepository } from './prisma-departments.repository.js';
import { DepartmentsController } from '../presentation/departments.controller.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule, // <-- Permite que JwtAuthGuard resuelva JwtService y UserRepository
  ],
  controllers: [DepartmentsController],
  providers: [
    DepartmentsUseCase,
    {
      provide: DepartmentsRepository,
      useClass: PrismaDepartmentsRepository,
    },
  ],
  exports: [DepartmentsUseCase, DepartmentsRepository],
})
export class DepartmentsModule {}