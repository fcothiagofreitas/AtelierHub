import type { PedidoEstado, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clienteNomeCurto } from "@/modules/vendas/lib/cliente-nome";
import { createdAtWhereFromVendasParams, type VendasSearchParams } from "./lib/date-range";

/** Resumo para atalhos de rascunhos (PDV / lista de vendas). */
export type PedidoRascunhoResumo = {
  id: string;
  numero: number;
  updatedAt: Date;
  clienteLabel: string;
};

const ESTADOS: PedidoEstado[] = [
  "EM_ANDAMENTO",
  "EM_ABERTO",
  "PAGO_PARCIAL",
  "QUITADO",
  "CANCELADO",
];

function isPedidoEstado(s: string): s is PedidoEstado {
  return ESTADOS.includes(s as PedidoEstado);
}

export function parseVendasSearchParams(
  sp: Record<string, string | string[] | undefined>,
): VendasSearchParams {
  const g = (k: string) => {
    const v = sp[k];
    return typeof v === "string" ? v : "";
  };
  return {
    preset: g("preset") || undefined,
    from: g("from") || undefined,
    to: g("to") || undefined,
    estado: g("estado") || undefined,
    clienteId: g("clienteId") || undefined,
    vendedorId: g("vendedorId") || undefined,
    corretorId: g("corretorId") || undefined,
    busca: g("busca").trim() || undefined,
  };
}

export async function listPedidosForStore(
  tenantId: string,
  storeId: string,
  filters: VendasSearchParams,
) {
  const dateWhere = createdAtWhereFromVendasParams(filters);

  const where: Prisma.PedidoWhereInput = {
    tenantId,
    storeId,
    ...(dateWhere ? { createdAt: dateWhere } : {}),
    ...(filters.estado && isPedidoEstado(filters.estado)
      ? { estado: filters.estado }
      : {}),
    ...(filters.clienteId ? { clienteId: filters.clienteId } : {}),
    ...(filters.vendedorId ? { vendedorId: filters.vendedorId } : {}),
    ...(filters.corretorId ? { corretorId: filters.corretorId } : {}),
  };

  const busca = filters.busca?.trim();
  if (busca) {
    const matchNome: Prisma.PedidoWhereInput = {
      cliente: {
        OR: [
          { nome: { contains: busca, mode: "insensitive" } },
          { fantasia: { contains: busca, mode: "insensitive" } },
          { razaoSocial: { contains: busca, mode: "insensitive" } },
        ],
      },
    };
    const orParts: Prisma.PedidoWhereInput[] = [matchNome];
    if (/^\d+$/.test(busca)) {
      const n = Number.parseInt(busca, 10);
      if (!Number.isNaN(n)) {
        orParts.push({ numero: n });
      }
    }
    where.AND = [
      ...(Array.isArray(where.AND)
        ? where.AND
        : where.AND
          ? [where.AND]
          : []),
      { OR: orParts },
    ];
  }

  return prisma.pedido.findMany({
    where,
    include: {
      cliente: {
        select: {
          id: true,
          tipo: true,
          nome: true,
          fantasia: true,
          razaoSocial: true,
        },
      },
      vendedor: { select: { id: true, name: true } },
      corretor: { select: { id: true, name: true } },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 200,
  });
}

export async function getPedidoDetalhe(
  tenantId: string,
  storeId: string,
  pedidoId: string,
) {
  return prisma.pedido.findFirst({
    where: { id: pedidoId, tenantId, storeId },
    include: {
      cliente: true,
      vendedor: { select: { id: true, name: true, role: true } },
      corretor: { select: { id: true, name: true } },
      entreguePor: { select: { id: true, name: true } },
      movimentoCorretor: { select: { id: true, valor: true, createdAt: true } },
      itens: {
        include: {
          produtoVariacao: {
            select: {
              id: true,
              nome: true,
              ean13: true,
              produto: { select: { id: true, nome: true, referencia: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      pagamentos: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function getVendasFilterLists(tenantId: string, storeId: string) {
  const [vendedores, corretores, clientes] = await Promise.all([
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
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.cliente.findMany({
      where: { tenantId, storeId, isActive: true },
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

  return { vendedores, corretores, clientes };
}

/** Pedidos em rascunho na loja (para trocar de venda sem perder o contexto). */
export async function listPedidosRascunhoForStore(
  tenantId: string,
  storeId: string,
): Promise<PedidoRascunhoResumo[]> {
  const rows = await prisma.pedido.findMany({
    where: { tenantId, storeId, estado: "EM_ANDAMENTO" },
    select: {
      id: true,
      numero: true,
      updatedAt: true,
      cliente: {
        select: {
          tipo: true,
          nome: true,
          fantasia: true,
          razaoSocial: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return rows.map((p) => ({
    id: p.id,
    numero: p.numero,
    updatedAt: p.updatedAt,
    clienteLabel: p.cliente ? clienteNomeCurto(p.cliente) : "Sem cliente",
  }));
}
