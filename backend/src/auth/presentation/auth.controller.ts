import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { LoginUseCase } from '../application/use-cases/login.use-case.js';
import {
  InactiveUserError,
  InvalidCredentialsError,
} from '../application/errors/auth.errors.js';

import {
  JwtAuthGuard,
  type AuthenticatedUser,
} from './jwt-auth.guard.js';
import { SuperUserGuard } from './super-user.guard.js';
import { RolesGuard } from './roles.guard.js';
import { Roles } from './roles.decorator.js';

interface LoginRequest {
  email: string;
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
  ) {}

  // =========================
  // POST /auth/login
  // =========================
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginRequest) {
    if (typeof body?.email !== 'string' || typeof body?.password !== 'string' || !body.email.trim() || !body.password) {
      throw new BadRequestException(
        'El correo y la contraseña son obligatorios',
      );
    }

    try {
      return await this.loginUseCase.execute({
        email: body.email,
        password: body.password,
      });
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        throw new UnauthorizedException(
          'Credenciales inválidas',
        );
      }

      if (error instanceof InactiveUserError) {
        throw new ForbiddenException(
          'El usuario se encuentra inactivo',
        );
      }

      throw error;
    }
  }

  // =========================
  // GET /auth/me
  // =========================
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(
    @Req()
    request: Request & {
      user: AuthenticatedUser;
    },
  ) {
    return {
      message: 'Token válido',
      user: {
        userId: request.user.sub,
        email: request.user.email,
        roles: request.user.roles,
      },
    };
  }

  // =========================
  // GET /auth/super-user-test (Guard anterior)
  // =========================
  @Get('super-user-test')
  @UseGuards(JwtAuthGuard, SuperUserGuard)
  superUserTest(
    @Req()
    request: Request & {
      user: AuthenticatedUser;
    },
  ) {
    return {
      message: 'Acceso autorizado para SUPERUSUARIO',
      user: {
        userId: request.user.sub,
        email: request.user.email,
        roles: request.user.roles,
      },
    };
  }

  // ====================================================
  // NUEVAS RUTAS CON DECORADORES DINÁMICOS RBAC-03
  // ====================================================

  // Caso 1: Requiere SUPERUSUARIO -> Tu token actual debe dar 200 OK
  @Get('roles-test/super')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERUSUARIO')
  rolesTestSuper(
    @Req()
    request: Request & {
      user: AuthenticatedUser;
    },
  ) {
    return {
      message: 'Acceso concedido con decorador @Roles(SUPERUSUARIO)',
      user: request.user,
    };
  }

  // Caso 2: Requiere COORDINADOR -> Tu token actual DEBE devolver 403 Forbidden
  @Get('roles-test/coordinador')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINADOR')
  rolesTestCoordinador() {
    return {
      message: 'Solo coordinadores pueden ver esto',
    };
  }
}