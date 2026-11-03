import { CreateDepartmentDto } from '../application/dto/create-department.dto.js';

export interface DepartmentEntity {
  department_id: string;
  name: string;
  description: string | null;
}

export abstract class DepartmentsRepository {
  abstract findAll(): Promise<DepartmentEntity[]>;
  abstract findById(id: string): Promise<DepartmentEntity | null>;
  abstract create(data: CreateDepartmentDto): Promise<DepartmentEntity>;
  abstract update(id: string, data: any): Promise<any>;
  abstract delete(id: string): Promise<void>;
}