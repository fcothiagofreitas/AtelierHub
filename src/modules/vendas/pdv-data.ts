import { prisma } from "@/lib/prisma";

/** Opções para selects do PDV (clientes sem bloqueados; corretores incluem bloqueados para venda direta). */
export async function getPdvLojaOptions(tenantId: string, storeId: string) {
  const [clientes, vendedores, corretores] = await Promise.all([
    prisma.cliente.findMany({
      where: {
        tenantId,
        storeId,
        isActive: true,
        isBlocked: false,
        /** Evita duplicar no PDV: o PF ligado ao corretor aparece só como «corretor». */
        corretorId: null,
      },
      select: {
        id: true,
        tipo: true,
        nome: true,
        fantasia: true,
        razaoSocial: true,
        creditoTroca: true,
        vendaRapidaPadrao: true,
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
      where: { tenantId, isActive: true },
      select: { id: true, name: true, isBlocked: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { clientes, vendedores, corretores };
}
