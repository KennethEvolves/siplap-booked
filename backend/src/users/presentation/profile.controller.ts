import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { updateProfileSchema, type UpdateProfile } from '@shared/contracts';
import {
  JwtAuthGuard,
  type AuthenticatedUser,
} from '../../auth/presentation/jwt-auth.guard.js';
import { RbacExceptionFilter } from '../../common/presentation/rbac-exception.filter.js';
import { ZodValidationPipe } from '../../common/presentation/zod-validation.pipe.js';
import { UserProfileUseCase } from '../application/use-cases/user-profile.use-case.js';

@Controller(['users/profile', 'api/users/profile'])
@UseGuards(JwtAuthGuard)
@UseFilters(RbacExceptionFilter)
export class ProfileController {
  constructor(private readonly useCase: UserProfileUseCase) {}
  @Get()
  async get(@Req() request: { user: AuthenticatedUser }) {
    return { profile: await this.useCase.get(request.user.sub) };
  }
  @Patch()
  async update(
    @Req() request: { user: AuthenticatedUser },
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfile,
  ) {
    return { profile: await this.useCase.update(request.user.sub, body) };
  }
}
