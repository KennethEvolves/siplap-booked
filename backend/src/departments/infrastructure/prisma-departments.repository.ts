import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  DepartmentsRepository,
  DepartmentEntity,
} from '../domain/departments.repository.js';
import { CreateDepartmentDto } from '../application/dto/create-department.dto.js';

@Injectable()
export class PrismaDepartmentsRepository implements DepartmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async update(id: string, data: any): Promise<any> {
    return this.prisma.departments.update({
      where: { department_id: id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.departments.delete({
      where: { department_id: id },
    });
  }
  
  async findAll(): Promise<DepartmentEntity[]> {
    return this.prisma.departments.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string): Promise<DepartmentEntity | null> {
    return this.prisma.departments.findUnique({
      where: { department_id: id },
    });
  }

  async create(data: CreateDepartmentDto): Promise<DepartmentEntity> {
    return this.prisma.departments.create({
      data: {
        name: data.name.trim(),
        description: data.description ? data.description.trim() : null,
      },
    });
  }
}