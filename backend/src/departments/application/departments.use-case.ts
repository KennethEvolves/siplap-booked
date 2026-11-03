import { BadRequestException, Injectable } from '@nestjs/common';
import { DepartmentsRepository, DepartmentEntity } from '../domain/departments.repository.js';
import { CreateDepartmentDto } from './dto/create-department.dto.js';

@Injectable()
export class DepartmentsUseCase {
  constructor(private readonly repository: DepartmentsRepository) {}

  async update(id: string, data: any) {
    return this.repository.update(id, data);
  }

  async delete(id: string) {
    return this.repository.delete(id);
  }
  
  async list(): Promise<DepartmentEntity[]> {
    return this.repository.findAll();
  }

  async getById(id: string): Promise<DepartmentEntity | null> {
    return this.repository.findById(id);
  }

  async create(data: CreateDepartmentDto): Promise<DepartmentEntity> {
    if (!data.name || !data.name.trim()) {
      throw new BadRequestException('El nombre del departamento es requerido');
    }

    const currentList = await this.repository.findAll();
    const alreadyExists = currentList.some(
      (d) => d.name.trim().toLowerCase() === data.name.trim().toLowerCase(),
    );

    if (alreadyExists) {
      throw new BadRequestException('Ya existe un departamento registrado con ese nombre');
    }

    return this.repository.create(data);
  }
}