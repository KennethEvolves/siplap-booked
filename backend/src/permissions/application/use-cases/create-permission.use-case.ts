import type {
  CreatePermissionDto,
  CreatePermissionResultDto,
} from '../dto/create-permission.dto.js';

import {
  InvalidPermissionDataError,
  PermissionAlreadyExistsError,
} from '../errors/permission.errors.js';

import { PermissionsRepository } from '../../domain/ports/permissions.repository.js';

export class CreatePermissionUseCase {
  constructor(
    private readonly permissionsRepository: PermissionsRepository,
  ) {}

  async execute(
    input: CreatePermissionDto,
  ): Promise<CreatePermissionResultDto> {
    const name =
      input.name?.trim().toUpperCase() || null;

    const slug =
      input.slug?.trim().toLowerCase();

    const description =
      input.description?.trim() || null;

    if (!slug) {
      throw new InvalidPermissionDataError(
        'El slug del permiso es obligatorio',
      );
    }

    if (slug.length > 255) {
      throw new InvalidPermissionDataError(
        'El slug no puede superar los 255 caracteres',
      );
    }

    if (name && name.length > 150) {
      throw new InvalidPermissionDataError(
        'El nombre no puede superar los 150 caracteres',
      );
    }

    if (
      description &&
      description.length > 255
    ) {
      throw new InvalidPermissionDataError(
        'La descripción no puede superar los 255 caracteres',
      );
    }

    const alreadyExists =
      await this.permissionsRepository.existsBySlug(
        slug,
      );

    if (alreadyExists) {
      throw new PermissionAlreadyExistsError();
    }

    const permission =
      await this.permissionsRepository.create({
        name,
        slug,
        description,
      });

    return {
      permissionId: permission.permissionId,
      name: permission.name,
      slug: permission.slug,
      description: permission.description,
      createdAt: permission.createdAt,
    };
  }
}