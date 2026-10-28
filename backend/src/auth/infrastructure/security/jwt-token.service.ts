import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import {
  AuthTokenPayload,
  TokenServicePort,
} from '../../domain/ports/token-service.port.js';

@Injectable()
export class JwtTokenService implements TokenServicePort {
  constructor(
    private readonly jwtService: JwtService,
  ) {}

  async sign(payload: AuthTokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }
}