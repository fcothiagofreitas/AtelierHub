import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

type GlobalPrisma = typeof globalThis & {
  __prisma?: PrismaClient;
  /** `mtimeMs` de `node_modules/.prisma/client/index.js` após o último `prisma generate`. */
  __prismaGen?: string;
};

/** Invalida o singleton quando o client gerado no disco muda (evita DMMF antigo após `prisma generate`). */
function generatedClientMarker(): string {
  try {
    const p = join(process.cwd(), "node_modules/.prisma/client/index.js");
    if (!existsSync(p)) return "0";
    return String(statSync(p).mtimeMs);
  } catch {
    return "0";
  }
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/**
 * Um único `PrismaClient` por processo Node.
 * Em dev, após `prisma generate`, o ficheiro gerado muda de `mtime` — recriamos o cliente
 * para o include/select alinhar com o schema (Turbopack mantinha uma instância antiga em `globalThis`).
 */
function getPrisma(): PrismaClient {
  const g = globalThis as GlobalPrisma;
  const marker = generatedClientMarker();

  if (g.__prisma && g.__prismaGen !== marker) {
    void g.__prisma.$disconnect().catch(() => {});
    g.__prisma = undefined;
    g.__prismaGen = undefined;
  }

  if (!g.__prisma) {
    g.__prisma = createPrismaClient();
    g.__prismaGen = marker;
  }
  return g.__prisma;
}

/**
 * Proxy para que cada uso aponte sempre ao cliente actual (útil após `prisma generate` sem reiniciar o `next dev`).
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client as unknown as object, prop, receiver);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
}) as PrismaClient;
