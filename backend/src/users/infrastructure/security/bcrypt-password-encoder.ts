import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { PasswordEncoderPort } from '../../domain/ports/password-encoder.port.js';

@Injectable()
export class BcryptPasswordEncoder
  implements PasswordEncoderPort
{
  async hash(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, 10);
  }
}