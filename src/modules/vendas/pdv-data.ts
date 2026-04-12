import { prisma } from "@/lib/prisma";

/** Opções para selects do PDV (cliente e corretor sem bloqueados). */
export async function getPdvLojaOptions(tenantId: string, storeId: string) {
  const [clientes, vendedores, corretores] = await Promise.all([
    prisma.cliente.findMany({
      where: {
        tenantId,
        storeId,
        isActive: true,
        isBlocked: false,
      },
      select: {
        id: true,
        tipo: true,
        nome: true,
        fantasia: true,
        razaoSocial: true,
      },
      orderBy: [{ nome: "asc" }, { fantasia: "asc" }],
      take: 300,
    }),
    prisma.colaborador.findMany({
      where: {
        tenantId,
        isDismissed: false,
        isActive: true,
        stores: { some: { storeId } },
        role: { in: ["GERENTE_LOJA", "VENDEDOR", "ADMIN_DA_MARCA", "ADMINISTRATIVO"] },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.corretor.findMany({
      where: { tenantId, isActive: true, isBlocked: false },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { clientes, vendedores, corretores };
}
