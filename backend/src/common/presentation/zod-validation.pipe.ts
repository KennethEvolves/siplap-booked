import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { ZodType } from '@shared/contracts';
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}
  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success)
      throw new BadRequestException({
        message: 'Datos de petición inválidos',
        errors: result.error.issues.map(({ path, message }) => ({
          path,
          message,
        })),
      });
    return result.data;
  }
}
