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
  Query,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  activityListSchema,
  approveActivitySchema,
  createActivitySchema,
  updateActivitySchema,
  type ActivityList,
  type ApproveActivity,
  type CreateActivity,
  type UpdateActivity,
} from '@shared/contracts';
import {
  JwtAuthGuard,
  type AuthenticatedUser,
} from '../../auth/presentation/jwt-auth.guard.js';
import { RbacExceptionFilter } from '../../common/presentation/rbac-exception.filter.js';
import { ZodValidationPipe } from '../../common/presentation/zod-validation.pipe.js';
import { ActivitiesUseCase } from '../application/activities.use-case.js';

type Request = { user: AuthenticatedUser };
@Controller(['activities', 'api/activities'])
@UseGuards(JwtAuthGuard)
@UseFilters(RbacExceptionFilter)
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesUseCase) {}
  @Get('capabilities')
  capabilities(@Req() req: Request) {
    return this.activities.capabilities(req.user.sub);
  }
  @Get('creators')
  creators(
    @Req() req: Request,
    @Query(new ZodValidationPipe(activityListSchema)) query: ActivityList,
  ) {
    return this.activities.creators(req.user.sub, query);
  }
  @Get()
  list(
    @Req() req: Request,
    @Query(new ZodValidationPipe(activityListSchema)) query: ActivityList,
  ) {
    return this.activities.list(req.user.sub, query);
  }
  @Get(':activityId')
  async get(
    @Req() req: Request,
    @Param('activityId', ParseUUIDPipe) id: string,
  ) {
    return { activity: await this.activities.get(req.user.sub, id) };
  }
  @Post()
  async create(
    @Req() req: Request,
    @Body(new ZodValidationPipe(createActivitySchema)) input: CreateActivity,
  ) {
    return { activity: await this.activities.create(req.user.sub, input) };
  }
  @Patch(':activityId')
  async update(
    @Req() req: Request,
    @Param('activityId', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateActivitySchema)) input: UpdateActivity,
  ) {
    return { activity: await this.activities.update(req.user.sub, id, input) };
  }
  @Patch(':activityId/approval')
  async approve(
    @Req() req: Request,
    @Param('activityId', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(approveActivitySchema)) input: ApproveActivity,
  ) {
    return { activity: await this.activities.approve(req.user.sub, id, input) };
  }
  @Delete(':activityId')
  @HttpCode(204)
  delete(@Req() req: Request, @Param('activityId', ParseUUIDPipe) id: string) {
    return this.activities.delete(req.user.sub, id);
  }
}
