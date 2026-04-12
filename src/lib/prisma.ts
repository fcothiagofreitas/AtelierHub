import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/**
 * Um único `PrismaClient` por processo Node, sempre em `globalThis`.
 * Importante para Turbopack / HMR no dev: o módulo pode ser reavaliado e, se não
 * guardarmos aqui, cada avaliação abre novas conexões ("too many clients").
 * Em produção também evita duplicar cliente em workers ou re-imports.
 */
function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export const prisma = getPrisma();
