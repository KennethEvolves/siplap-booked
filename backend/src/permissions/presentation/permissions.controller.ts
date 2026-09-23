import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CreatePermissionUseCase } from '../application/use-cases/create-permission.use-case.js';

import { GetPermissionsUseCase } from '../application/use-cases/get-permissions.use-case.js';

import {
  InvalidPermissionDataError,
  PermissionAlreadyExistsError,
} from '../application/errors/permission.errors.js';

import type { CreatePermissionDto } from '../application/dto/create-permission.dto.js';

import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard.js';

import { SuperUserGuard } from '../../auth/presentation/super-user.guard.js';

@Controller('permissions')
export class PermissionsController {
  constructor(
    private readonly createPermissionUseCase:
      CreatePermissionUseCase,

    private readonly getPermissionsUseCase:
      GetPermissionsUseCase,
  ) {}

  @Get()
  @UseGuards(
    JwtAuthGuard,
    SuperUserGuard,
  )
  async getAll() {
    const permissions =
      await this.getPermissionsUseCase.execute();

    return {
      message:
        'Permisos obtenidos correctamente',

      total:
        permissions.length,

      permissions,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(
    JwtAuthGuard,
    SuperUserGuard,
  )
  async create(
    @Body()
    body: CreatePermissionDto,
  ) {
    try {
      const permission =
        await this.createPermissionUseCase.execute(
          body,
        );

      return {
        message:
          'Permiso creado correctamente',

        permission,
      };
    } catch (error) {
      if (
        error instanceof
        PermissionAlreadyExistsError
      ) {
        throw new ConflictException(
          error.message,
        );
      }

      if (
        error instanceof
        InvalidPermissionDataError
      ) {
        throw new BadRequestException(
          error.message,
        );
      }

      throw error;
    }
  }
}