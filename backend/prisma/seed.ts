import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { seedRbac } from './rbac.seed.js';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL no está definida');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    const result = await seedRbac(prisma);
    console.log(
      `RBAC: ${result.permissions.length} permisos base vinculados a ${result.role}.`,
    );
    console.log(result.permissions.join(', '));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('No se pudo inicializar RBAC:', error);
  process.exitCode = 1;
});
