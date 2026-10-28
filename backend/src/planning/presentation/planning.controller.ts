import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseFilters, UseGuards } from '@nestjs/common';
import { createAxisSchema, createObjectiveSchema, updateAxisSchema, updateObjectiveSchema, type CreateAxis, type CreateObjective, type UpdateAxis, type UpdateObjective } from '@shared/contracts';
import { JwtAuthGuard, type AuthenticatedUser } from '../../auth/presentation/jwt-auth.guard.js';
import { RbacExceptionFilter } from '../../common/presentation/rbac-exception.filter.js';
import { ZodValidationPipe } from '../../common/presentation/zod-validation.pipe.js';
import { PlanningUseCase } from '../application/planning.use-case.js';

type Request = { user: AuthenticatedUser };
@Controller('api')
@UseGuards(JwtAuthGuard)
@UseFilters(RbacExceptionFilter)
export class PlanningController {
  constructor(private readonly planning: PlanningUseCase) {}
  @Get('axes') axes(@Req() req: Request) { return this.planning.axes(req.user.sub); }
  @Post('axes') createAxis(@Req() req: Request, @Body(new ZodValidationPipe(createAxisSchema)) input: CreateAxis) {
    return this.planning.createAxis(req.user.sub, input);
  }
  @Patch('axes/:axisId') updateAxis(@Req() req: Request, @Param('axisId', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(updateAxisSchema)) input: UpdateAxis) {
    return this.planning.updateAxis(req.user.sub, id, input);
  }
  @Get('objectives') objectives(@Req() req: Request) { return this.planning.objectives(req.user.sub); }
  @Post('objectives') createObjective(@Req() req: Request, @Body(new ZodValidationPipe(createObjectiveSchema)) input: CreateObjective) {
    return this.planning.createObjective(req.user.sub, input);
  }
  @Patch('objectives/:objectiveId') updateObjective(@Req() req: Request, @Param('objectiveId', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(updateObjectiveSchema)) input: UpdateObjective) {
    return this.planning.updateObjective(req.user.sub, id, input);
  }
}
