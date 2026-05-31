import { PrismaClient } from "@prisma/client";
import { PrismaNeonHttp } from "@prisma/adapter-neon";

function createPrismaClient() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaNeonHttp(process.env.DATABASE_URL!, {} as any);
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;
