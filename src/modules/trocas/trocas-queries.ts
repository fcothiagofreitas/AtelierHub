import type { TrocaTipoFluxo } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type TrocaListaRow = {
  id: string;
  numero: number;
  createdAt: Date;
  tipoFluxo: TrocaTipoFluxo;
  valorCredito: { toString(): string };
  clienteNome: string;
  pedidoOrigemNumero: number;
  pedidoNovoNumero: number | null;
  obs: string | null;
};

export async function listTrocasForStore(
  tenantId: string,
  storeId: string,
  take = 200,
): Promise<TrocaListaRow[]> {
  const rows = await prisma.troca.findMany({
    where: { tenantId, storeId },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      cliente: {
        select: { nome: true, fantasia: true, razaoSocial: true },
      },
      pedidoOrigem: { select: { numero: true } },
      pedidoNovo: { select: { numero: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    numero: r.numero,
    createdAt: r.createdAt,
    tipoFluxo: r.tipoFluxo,
    valorCredito: r.valorCredito,
    clienteNome:
      r.cliente.nome ||
      r.cliente.fantasia ||
      r.cliente.razaoSocial ||
      "—",
    pedidoOrigemNumero: r.pedidoOrigem.numero,
    pedidoNovoNumero: r.pedidoNovo?.numero ?? null,
    obs: r.obs,
  }));
}
