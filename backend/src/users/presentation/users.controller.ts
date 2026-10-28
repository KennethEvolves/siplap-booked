import { RemoveRoleFromUserUseCase } from '../application/use-cases/remove-role-from-user.use-case.js';
import { Put, Patch, Delete, UseFilters, Req } from '@nestjs/common';
import {
  createUserSchema,
  updateUserSchema,
  uuidSchema,
  type UpdateUser,
} from '@shared/contracts';
import { ZodValidationPipe } from '../../common/presentation/zod-validation.pipe.js';
import { RbacExceptionFilter } from '../../common/presentation/rbac-exception.filter.js';
import { UpdateUserUseCase } from '../application/use-cases/update-user.use-case.js';
import { DeleteUserUseCase } from '../application/use-cases/delete-user.use-case.js';
import type { AuthenticatedUser } from '../../auth/presentation/jwt-auth.guard.js';
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CreateUserUseCase } from '../application/use-cases/create-user.use-case.js';

import { GetUsersUseCase } from '../application/use-cases/get-users.use-case.js';

import { AssignRoleToUserUseCase } from '../application/use-cases/assign-role-to-user.use-case.js';

import {
  InvalidUserDataError,
  UserAlreadyExistsError,
} from '../application/errors/user.errors.js';

import {
  InvalidUserRoleDataError,
  RoleNotFoundError,
  UserAlreadyHasRoleError,
  UserNotFoundError,
} from '../application/errors/user-role.errors.js';

import type { CreateUserDto } from '../application/dto/create-user.dto.js';

import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard.js';

import { SuperUserGuard } from '../../auth/presentation/super-user.guard.js';

@UseFilters(RbacExceptionFilter)
@Controller('users')
export class UsersController {
  constructor(
    private readonly removeRoleUseCase: RemoveRoleFromUserUseCase,
    private readonly updateUseCase: UpdateUserUseCase,
    private readonly deleteUseCase: DeleteUserUseCase,
    private readonly createUserUseCase: CreateUserUseCase,

    private readonly getUsersUseCase: GetUsersUseCase,

    private readonly assignRoleToUserUseCase: AssignRoleToUserUseCase,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, SuperUserGuard)
  async getAll() {
    const users = await this.getUsersUseCase.execute();

    return {
      message: 'Usuarios obtenidos correctamente',

      total: users.length,

      users,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, SuperUserGuard)
  async create(
    @Body(new ZodValidationPipe(createUserSchema)) body: CreateUserDto,
  ) {
    try {
      const user = await this.createUserUseCase.execute(body);

      return {
        message: 'Usuario creado correctamente',

        user,
      };
    } catch (error) {
      if (error instanceof UserAlreadyExistsError) {
        throw new ConflictException(error.message);
      }

      if (error instanceof InvalidUserDataError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }

  @Delete(':userId/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, SuperUserGuard)
  async removeRole(
    @Param('userId', new ZodValidationPipe(uuidSchema)) userId: string,
    @Param('roleId', new ZodValidationPipe(uuidSchema)) roleId: string,
    @Req() request: { user: AuthenticatedUser },
  ) {
    try {
      await this.removeRoleUseCase.execute(userId, roleId, request.user.sub);
    } catch (error) {
      if (error instanceof UserNotFoundError || error instanceof RoleNotFoundError) throw new NotFoundException(error.message);
      if (error instanceof InvalidUserRoleDataError) throw new BadRequestException(error.message);
      throw error;
    }
  }

  @Put(':userId/roles/:roleId')
  @UseGuards(JwtAuthGuard, SuperUserGuard)
  async replaceRole(
    @Param('userId', new ZodValidationPipe(uuidSchema)) userId: string,
    @Param('roleId', new ZodValidationPipe(uuidSchema)) roleId: string,
    @Req() request: { user: AuthenticatedUser },
  ) {
    return this.saveRole(userId, roleId, true, request.user.sub);
  }

  @Post(':userId/roles/:roleId')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, SuperUserGuard)
  async assignRole(
    @Param('userId', new ZodValidationPipe(uuidSchema))
    userId: string,

    @Param('roleId', new ZodValidationPipe(uuidSchema))
    roleId: string,
  ) {
    return this.saveRole(userId, roleId);
  }

  private async saveRole(
    userId: string,
    roleId: string,
    replace = false,
    actorId?: string,
  ) {
    try {
      const assignment = await this.assignRoleToUserUseCase.execute({
        userId,
        roleId,
      }, replace, actorId);

      return {
        message: 'Rol asignado al usuario correctamente',

        assignment,
      };
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw new NotFoundException(error.message);
      }

      if (error instanceof RoleNotFoundError) {
        throw new NotFoundException(error.message);
      }

      if (error instanceof UserAlreadyHasRoleError) {
        throw new ConflictException(error.message);
      }

      if (error instanceof InvalidUserRoleDataError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }

  @Patch(':userId')
  @UseGuards(JwtAuthGuard, SuperUserGuard)
  async update(
    @Param('userId', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUser,
  ) {
    const user = await this.updateUseCase.execute(id, body);
    return { message: 'usuario actualizado correctamente', user };
  }
  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, SuperUserGuard)
  async delete(
    @Param('userId', new ZodValidationPipe(uuidSchema)) id: string,
    @Req() request: { user: AuthenticatedUser },
  ) {
    await this.deleteUseCase.execute(id, request.user.sub);
  }
}
