import type { Prisma, TrocaTipoFluxo } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { VendasSearchParams } from "@/modules/vendas/lib/date-range";
import { createdAtWhereFromVendasParams } from "@/modules/vendas/lib/date-range";

export type TrocaListaRow = {
  id: string;
  numero: number;
  createdAt: Date;
  tipoFluxo: TrocaTipoFluxo;
  valorCredito: { toString(): string };
  clienteNome: string;
  obs: string | null;
};

const FLUXOS: TrocaTipoFluxo[] = [
  "TROCA_INDEPENDENTE",
  "VENDA_QUITADA",
  "CONSIGNADO_NAO_QUITADO",
];

function isTrocaTipoFluxo(s: string): s is TrocaTipoFluxo {
  return FLUXOS.includes(s as TrocaTipoFluxo);
}

export type TrocasSearchParams = Pick<
  VendasSearchParams,
  "preset" | "from" | "to"
> & {
  clienteId?: string;
  tipoFluxo?: string;
  busca?: string;
};

export function parseTrocasSearchParams(
  sp: Record<string, string | string[] | undefined>,
): TrocasSearchParams {
  const g = (k: string) => {
    const v = sp[k];
    return typeof v === "string" ? v : "";
  };
  return {
    preset: g("preset") || undefined,
    from: g("from") || undefined,
    to: g("to") || undefined,
    clienteId: g("clienteId") || undefined,
    tipoFluxo: g("tipoFluxo") || undefined,
    busca: g("busca").trim() || undefined,
  };
}

export async function listTrocasForStore(
  tenantId: string,
  storeId: string,
  filters?: TrocasSearchParams,
  take = 200,
): Promise<TrocaListaRow[]> {
  const dateWhere = filters
    ? createdAtWhereFromVendasParams(filters as VendasSearchParams)
    : undefined;

  const tipoWhere =
    filters?.tipoFluxo && isTrocaTipoFluxo(filters.tipoFluxo)
      ? filters.tipoFluxo
      : undefined;

  const where: Prisma.TrocaWhereInput = {
    tenantId,
    storeId,
    ...(dateWhere ? { createdAt: dateWhere } : {}),
    ...(filters?.clienteId ? { clienteId: filters.clienteId } : {}),
    ...(tipoWhere ? { tipoFluxo: tipoWhere } : {}),
  };

  const busca = filters?.busca?.trim();
  if (busca) {
    const orParts: Prisma.TrocaWhereInput[] = [
      {
        cliente: {
          OR: [
            { nome: { contains: busca, mode: "insensitive" } },
            { fantasia: { contains: busca, mode: "insensitive" } },
            { razaoSocial: { contains: busca, mode: "insensitive" } },
          ],
        },
      },
    ];
    if (/^\d+$/.test(busca)) {
      const n = Number.parseInt(busca, 10);
      if (!Number.isNaN(n)) {
        orParts.push({ numero: n });
      }
    }
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      { OR: orParts },
    ];
  }

  const rows = await prisma.troca.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    include: {
      cliente: {
        select: { nome: true, fantasia: true, razaoSocial: true },
      },
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
    obs: r.obs,
  }));
}
