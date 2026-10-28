import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  createReservationSchema,
  patchReservationSchema,
  putReservationSchema,
  reservationListSchema,
  type CreateReservation,
  type ReservationList,
  type UpdateReservation,
} from '@shared/contracts';
import {
  JwtAuthGuard,
  type AuthenticatedUser,
} from '../../auth/presentation/jwt-auth.guard.js';
import { RbacExceptionFilter } from '../../common/presentation/rbac-exception.filter.js';
import { ZodValidationPipe } from '../../common/presentation/zod-validation.pipe.js';
import { ReservationsUseCase } from '../application/reservations.use-case.js';

type Request = { user: AuthenticatedUser };

@Controller(['reservations', 'api/reservations'])
@UseGuards(JwtAuthGuard)
@UseFilters(RbacExceptionFilter)
export class ReservationsController {
  constructor(private readonly reservations: ReservationsUseCase) {}

  @Get()
  list(
    @Req() req: Request,
    @Query(new ZodValidationPipe(reservationListSchema)) query: ReservationList,
  ) {
    return this.reservations.list(req.user.sub, query);
  }

  @Get('creators')
  async creators(@Req() req: Request) {
    return { users: await this.reservations.creators(req.user.sub) };
  }

  @Get(':reservationId')
  async get(
    @Req() req: Request,
    @Param('reservationId', ParseUUIDPipe) id: string,
  ) {
    return { reservation: await this.reservations.get(req.user.sub, id) };
  }

  @Post()
  async create(
    @Req() req: Request,
    @Body(new ZodValidationPipe(createReservationSchema))
    input: CreateReservation,
  ) {
    return { reservation: await this.reservations.create(req.user.sub, input) };
  }

  @Put(':reservationId')
  async replace(
    @Req() req: Request,
    @Param('reservationId', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(putReservationSchema))
    input: UpdateReservation,
  ) {
    return {
      reservation: await this.reservations.update(req.user.sub, id, input),
    };
  }

  @Patch(':reservationId')
  async update(
    @Req() req: Request,
    @Param('reservationId', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(patchReservationSchema))
    input: UpdateReservation,
  ) {
    return {
      reservation: await this.reservations.update(req.user.sub, id, input),
    };
  }

  @Delete(':reservationId')
  @HttpCode(204)
  delete(
    @Req() req: Request,
    @Param('reservationId', ParseUUIDPipe) id: string,
  ) {
    return this.reservations.delete(req.user.sub, id);
  }
}
