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

import { CreateRoleUseCase } from '../application/use-cases/create-role.use-case.js';

import { GetRolesUseCase } from '../application/use-cases/get-roles.use-case.js';

import { AssignPermissionToRoleUseCase } from '../application/use-cases/assign-permission-to-role.use-case.js';

import {
  InvalidRoleDataError,
  RoleAlreadyExistsError,
} from '../application/errors/role.errors.js';

import {
  InvalidRolePermissionDataError,
  PermissionNotFoundError,
  RoleAlreadyHasPermissionError,
  RoleNotFoundError,
} from '../application/errors/role-permission.errors.js';

import type { CreateRoleDto } from '../application/dto/create-role.dto.js';

import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard.js';

import { SuperUserGuard } from '../../auth/presentation/super-user.guard.js';

@Controller('roles')
export class RolesController {
  constructor(
    private readonly createRoleUseCase:
      CreateRoleUseCase,

    private readonly getRolesUseCase:
      GetRolesUseCase,

    private readonly assignPermissionToRoleUseCase:
      AssignPermissionToRoleUseCase,
  ) {}

  @Get()
  @UseGuards(
    JwtAuthGuard,
    SuperUserGuard,
  )
  async getAll() {
    const roles =
      await this.getRolesUseCase.execute();

    return {
      message:
        'Roles obtenidos correctamente',

      total: roles.length,

      roles,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(
    JwtAuthGuard,
    SuperUserGuard,
  )
  async create(
    @Body() body: CreateRoleDto,
  ) {
    try {
      const role =
        await this.createRoleUseCase.execute(
          body,
        );

      return {
        message:
          'Rol creado correctamente',

        role,
      };
    } catch (error) {
      if (
        error instanceof
        RoleAlreadyExistsError
      ) {
        throw new ConflictException(
          error.message,
        );
      }

      if (
        error instanceof
        InvalidRoleDataError
      ) {
        throw new BadRequestException(
          error.message,
        );
      }

      throw error;
    }
  }

  @Post(
    ':roleId/permissions/:permissionId',
  )
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(
    JwtAuthGuard,
    SuperUserGuard,
  )
  async assignPermission(
    @Param('roleId')
    roleId: string,

    @Param('permissionId')
    permissionId: string,
  ) {
    try {
      const assignment =
        await this.assignPermissionToRoleUseCase.execute({
          roleId,
          permissionId,
        });

      return {
        message:
          'Permiso asignado al rol correctamente',

        assignment,
      };
    } catch (error) {
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
        PermissionNotFoundError
      ) {
        throw new NotFoundException(
          error.message,
        );
      }

      if (
        error instanceof
        RoleAlreadyHasPermissionError
      ) {
        throw new ConflictException(
          error.message,
        );
      }

      if (
        error instanceof
        InvalidRolePermissionDataError
      ) {
        throw new BadRequestException(
          error.message,
        );
      }

      throw error;
    }
  }
}