import { prisma } from "@/lib/prisma";

export async function getTrocasFilterLists(tenantId: string, storeId: string) {
  const [vendedores, clientes] = await Promise.all([
    prisma.colaborador.findMany({
      where: {
        tenantId,
        isDismissed: false,
        isActive: true,
        stores: { some: { storeId } },
        role: {
          in: ["GERENTE_LOJA", "VENDEDOR", "ADMIN_DA_MARCA", "ADMINISTRATIVO"],
        },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.cliente.findMany({
      where: {
        tenantId,
        storeId,
        isActive: true,
      },
      select: {
        id: true,
        tipo: true,
        nome: true,
        fantasia: true,
        razaoSocial: true,
      },
      orderBy: [{ nome: "asc" }, { fantasia: "asc" }],
      take: 200,
    }),
  ]);

  return { vendedores, clientes };
}
