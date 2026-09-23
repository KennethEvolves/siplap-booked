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

import { LoginSuperUserUseCase } from '../application/use-cases/login-super-user.use-case.js';

import {
  InactiveUserError,
  InvalidCredentialsError,
  SuperUserAccessDeniedError,
} from '../application/errors/auth.errors.js';

import {
  JwtAuthGuard,
  type AuthenticatedUser,
} from './jwt-auth.guard.js';

import { SuperUserGuard } from './super-user.guard.js';

interface LoginRequest {
  email: string;
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginSuperUserUseCase: LoginSuperUserUseCase,
  ) {}

  // =========================
  // POST /auth/login
  // =========================
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginRequest) {
    if (!body.email || !body.password) {
      throw new BadRequestException(
        'El correo y la contraseña son obligatorios',
      );
    }

    try {
      return await this.loginSuperUserUseCase.execute({
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

      if (error instanceof SuperUserAccessDeniedError) {
        throw new ForbiddenException(
          'El usuario no tiene permisos de superusuario',
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
  // GET /auth/super-user-test
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
}