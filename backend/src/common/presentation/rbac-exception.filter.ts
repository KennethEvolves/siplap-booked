import {
  Catch,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { RbacError } from '../domain/rbac.error.js';
@Catch(RbacError)
export class RbacExceptionFilter implements ExceptionFilter {
  catch(error: RbacError, host: ArgumentsHost) {
    const status = { not_found: 404, conflict: 409, invalid: 400 }[error.kind];
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({ statusCode: status, message: error.message });
  }
}
