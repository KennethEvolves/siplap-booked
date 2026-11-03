import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  Patch,
  Delete,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard.js';
import { DepartmentsUseCase } from '../application/departments.use-case.js';
import type { CreateDepartmentDto } from '../application/dto/create-department.dto.js';

@Controller(['departments', 'api/departments'])
@UseGuards(JwtAuthGuard)
export class DepartmentsController {
  constructor(private readonly departmentsUseCase: DepartmentsUseCase) {}

  @Get()
  async list() {
    const departments = await this.departmentsUseCase.list();
    return { departments };
  }

  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const department = await this.departmentsUseCase.getById(id);
    return { department };
  }

  @Post()
  async create(@Body() body: CreateDepartmentDto) {
    const department = await this.departmentsUseCase.create(body);
    return { department };
  }

  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() body: any) {
    const department = await this.departmentsUseCase.update(id, body);
    return { department };
  }

  @Delete(':id')
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.departmentsUseCase.delete(id);
    return { success: true };
  }
}