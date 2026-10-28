import type { User } from '../../domain/entities/user.entity.js';

import { UsersRepository } from '../../domain/ports/users.repository.js';

export class GetUsersUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute(): Promise<User[]> {
    return this.usersRepository.findAll();
  }
}