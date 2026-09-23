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

@Controller('users')
export class UsersController {
  constructor(
    private readonly createUserUseCase:
      CreateUserUseCase,

    private readonly getUsersUseCase:
      GetUsersUseCase,

    private readonly assignRoleToUserUseCase:
      AssignRoleToUserUseCase,
  ) {}

  @Get()
  @UseGuards(
    JwtAuthGuard,
    SuperUserGuard,
  )
  async getAll() {
    const users =
      await this.getUsersUseCase.execute();

    return {
      message:
        'Usuarios obtenidos correctamente',

      total: users.length,

      users,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(
    JwtAuthGuard,
    SuperUserGuard,
  )
  async create(
    @Body() body: CreateUserDto,
  ) {
    try {
      const user =
        await this.createUserUseCase.execute(
          body,
        );

      return {
        message:
          'Usuario creado correctamente',

        user,
      };
    } catch (error) {
      if (
        error instanceof
        UserAlreadyExistsError
      ) {
        throw new ConflictException(
          error.message,
        );
      }

      if (
        error instanceof
        InvalidUserDataError
      ) {
        throw new BadRequestException(
          error.message,
        );
      }

      throw error;
    }
  }

  @Post(':userId/roles/:roleId')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(
    JwtAuthGuard,
    SuperUserGuard,
  )
  async assignRole(
    @Param('userId')
    userId: string,

    @Param('roleId')
    roleId: string,
  ) {
    try {
      const assignment =
        await this.assignRoleToUserUseCase.execute({
          userId,
          roleId,
        });

      return {
        message:
          'Rol asignado al usuario correctamente',

        assignment,
      };
    } catch (error) {
      if (
        error instanceof
        UserNotFoundError
      ) {
        throw new NotFoundException(
          error.message,
        );
      }

      if (
        error instanceof
        RoleNotFoundError
      ) {
        throw new NotFoundException(
          error.message,
        );
      }

      if (
        error instanceof
        UserAlreadyHasRoleError
      ) {
        throw new ConflictException(
          error.message,
        );
      }

      if (
        error instanceof
        InvalidUserRoleDataError
      ) {
        throw new BadRequestException(
          error.message,
        );
      }

      throw error;
    }
  }
}