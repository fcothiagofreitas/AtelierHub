import { prisma } from "@/lib/prisma";

/** Opções para os selects do PDV de trocas (clientes sem bloqueados, sem ligados a corretor). */
export async function getTrocaLojaOptions(tenantId: string, storeId: string) {
  const [clientes, vendedores] = await Promise.all([
    prisma.cliente.findMany({
      where: {
        tenantId,
        storeId,
        isActive: true,
        isBlocked: false,
        corretorId: null,
      },
      select: {
        id: true,
        tipo: true,
        nome: true,
        fantasia: true,
        razaoSocial: true,
        creditoTroca: true,
      },
      orderBy: [{ nome: "asc" }],
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
  ]);

  return { clientes, vendedores };
}
