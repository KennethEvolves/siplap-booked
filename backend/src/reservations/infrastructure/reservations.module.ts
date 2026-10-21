import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/infrastructure/auth.module.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { ReservationsUseCase } from '../application/reservations.use-case.js';
import { ReservationsRepository } from '../domain/reservations.repository.js';
import { PrismaReservationsRepository } from './prisma-reservations.repository.js';
import { ReservationsController } from '../presentation/reservations.controller.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [ReservationsController],
  providers: [
    { provide: ReservationsRepository, useClass: PrismaReservationsRepository },
    {
      provide: ReservationsUseCase,
      useFactory: (repository: ReservationsRepository) =>
        new ReservationsUseCase(repository),
      inject: [ReservationsRepository],
    },
  ],
})
export class ReservationsModule {}
