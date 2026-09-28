import { Patch, Delete, UseFilters, Param } from '@nestjs/common';
import {
  createPermissionSchema,
  updatePermissionSchema,
  uuidSchema,
  type UpdatePermission,
} from '@shared/contracts';
import { ZodValidationPipe } from '../../common/presentation/zod-validation.pipe.js';
import { RbacExceptionFilter } from '../../common/presentation/rbac-exception.filter.js';
import { UpdatePermissionUseCase } from '../application/use-cases/update-permission.use-case.js';
import { DeletePermissionUseCase } from '../application/use-cases/delete-permission.use-case.js';

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

@UseFilters(RbacExceptionFilter)
@Controller('permissions')
export class PermissionsController {
  constructor(
    private readonly updateUseCase: UpdatePermissionUseCase,
    private readonly deleteUseCase: DeletePermissionUseCase,
    private readonly createPermissionUseCase: CreatePermissionUseCase,

    private readonly getPermissionsUseCase: GetPermissionsUseCase,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, SuperUserGuard)
  async getAll() {
    const permissions = await this.getPermissionsUseCase.execute();

    return {
      message: 'Permisos obtenidos correctamente',

      total: permissions.length,

      permissions,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, SuperUserGuard)
  async create(
    @Body(new ZodValidationPipe(createPermissionSchema))
    body: CreatePermissionDto,
  ) {
    try {
      const permission = await this.createPermissionUseCase.execute(body);

      return {
        message: 'Permiso creado correctamente',

        permission,
      };
    } catch (error) {
      if (error instanceof PermissionAlreadyExistsError) {
        throw new ConflictException(error.message);
      }

      if (error instanceof InvalidPermissionDataError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }

  @Patch(':permissionId')
  @UseGuards(JwtAuthGuard, SuperUserGuard)
  async update(
    @Param('permissionId', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(updatePermissionSchema)) body: UpdatePermission,
  ) {
    const permission = await this.updateUseCase.execute(id, body);
    return { message: 'permiso actualizado correctamente', permission };
  }
  @Delete(':permissionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, SuperUserGuard)
  async delete(
    @Param('permissionId', new ZodValidationPipe(uuidSchema)) id: string,
  ) {
    await this.deleteUseCase.execute(id);
  }
}
