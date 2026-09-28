import { Prisma } from '../../generated/prisma/client.js';
import { RbacError } from '../domain/rbac.error.js';
export async function prismaWrite<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002')
        throw new RbacError(
          'conflict',
          'El registro o la asignación ya existe',
        );
      if (error.code === 'P2025')
        throw new RbacError('not_found', 'El registro no existe');
      if (error.code === 'P2003')
        throw new RbacError(
          'conflict',
          'El registro tiene relaciones que impiden esta operación',
        );
    }
    throw error;
  }
}
