import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { PasswordHasherPort } from '../../domain/ports/password-hasher.port.js';

@Injectable()
export class BcryptPasswordHasher implements PasswordHasherPort {
  async compare(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}