import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      message: 'SIPLAP backend funcionando correctamente',
    };
  }
}