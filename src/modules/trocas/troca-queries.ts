"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { assertStoreInSession } from "@/modules/estoque/estoque-auth";
import { ROLES_ACESSO_VENDAS } from "@/modules/vendas/lib/roles";
import { clienteNomeCurto } from "@/modules/vendas/lib/cliente-nome";
import type { TrocaEstado } from "@prisma/client";
import {
  createdAtWhereFromTrocasParams,
  type TrocasSearchParams,
} from "./lib/date-range";

export type TrocaListRow = {
  id: string;
  numero: number;
  estado: TrocaEstado;
  clienteNome: string;
  vendedorNome: string;
  creditoGerado: number;
  creditoConsumido: number;
  creditoRemanescente: number;
  pedidoSaidaId: string | null;
  createdAt: string;
};

const TROCA_ESTADOS: TrocaEstado[] = ["EM_ANDAMENTO", "CONCLUIDA", "CANCELADA"];

function isTrocaEstado(s: string): s is TrocaEstado {
  return TROCA_ESTADOS.includes(s as TrocaEstado);
}

export async function listarTrocas(input: {
  storeId: string;
  filters?: TrocasSearchParams;
  /** @deprecated use filters.estado */
  estado?: TrocaEstado;
  /** @deprecated use filters.clienteId */
  clienteId?: string;
  skip?: number;
  take?: number;
}): Promise<{ rows: TrocaListRow[]; total: number } | { error: string }> {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const tenantId = session.user.tenantId;
  try {
    assertStoreInSession(session, input.storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  const filters = input.filters ?? {};

  const estadoParam = filters.estado ?? input.estado;
  const clienteIdParam = filters.clienteId ?? input.clienteId;
  const vendedorIdParam = filters.vendedorId;
  const busca = filters.busca;

  const dateWhere = createdAtWhereFromTrocasParams(filters);

  const estadoWhere =
    estadoParam && isTrocaEstado(estadoParam) ? estadoParam : undefined;

  let buscaWhere = {};
  if (busca) {
    const isNumeric = /^\d+$/.test(busca);
    if (isNumeric) {
      const num = parseInt(busca, 10);
      buscaWhere = { numero: num };
    } else {
      buscaWhere = {
        cliente: {
          OR: [
            { nome: { contains: busca, mode: "insensitive" as const } },
            { fantasia: { contains: busca, mode: "insensitive" as const } },
            { razaoSocial: { contains: busca, mode: "insensitive" as const } },
          ],
        },
      };
    }
  }

  const where = {
    tenantId,
    storeId: input.storeId,
    ...(estadoWhere ? { estado: estadoWhere } : {}),
    ...(clienteIdParam ? { clienteId: clienteIdParam } : {}),
    ...(vendedorIdParam ? { vendedorId: vendedorIdParam } : {}),
    ...(dateWhere ? { createdAt: dateWhere } : {}),
    ...buscaWhere,
  };

  const skip = Math.max(0, input.skip ?? 0);
  const take = Math.min(200, Math.max(10, input.take ?? 40));

  const [rows, total] = await Promise.all([
    prisma.troca.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        cliente: { select: { tipo: true, nome: true, fantasia: true, razaoSocial: true } },
        vendedor: { select: { name: true } },
        pedidoSaida: { select: { id: true } },
      },
    }),
    prisma.troca.count({ where }),
  ]);

  return {
    rows: rows.map((t) => ({
      id: t.id,
      numero: t.numero,
      estado: t.estado,
      clienteNome: clienteNomeCurto(t.cliente),
      vendedorNome: t.vendedor.name,
      creditoGerado: t.creditoGerado.toNumber(),
      creditoConsumido: t.creditoConsumido.toNumber(),
      creditoRemanescente: t.creditoRemanescente.toNumber(),
      pedidoSaidaId: t.pedidoSaida?.id ?? null,
      createdAt: t.createdAt.toISOString(),
    })),
    total,
  };
}

type TrocaDetalheItem = {
  id: string;
  produtoVariacaoId: string;
  label: string;
  quantidade: number;
  valorUnitario: number;
  subtotal: number;
};

export type TrocaDetalhe = TrocaListRow & {
  itensDevolvidos: TrocaDetalheItem[];
  itensNovos: TrocaDetalheItem[];
  observacoes: string | null;
};

export async function getTrocaDetalhe(input: {
  storeId: string;
  trocaId: string;
}): Promise<{ ok: true; data: TrocaDetalhe } | { error: string }> {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const tenantId = session.user.tenantId;
  try {
    assertStoreInSession(session, input.storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  const troca = await prisma.troca.findFirst({
    where: { id: input.trocaId, tenantId, storeId: input.storeId },
    include: {
      cliente: { select: { tipo: true, nome: true, fantasia: true, razaoSocial: true } },
      vendedor: { select: { name: true } },
      pedidoSaida: {
        select: {
          id: true,
          itens: {
            include: {
              produtoVariacao: {
                select: { id: true, nome: true, produto: { select: { nome: true } } },
              },
            },
            orderBy: { createdAt: "asc" as const },
          },
        },
      },
      itens: {
        include: {
          produtoVariacao: {
            select: { id: true, nome: true, produto: { select: { nome: true } } },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!troca) return { error: "Troca não encontrada." };

  return {
    ok: true,
    data: {
      id: troca.id,
      numero: troca.numero,
      estado: troca.estado,
      clienteNome: clienteNomeCurto(troca.cliente),
      vendedorNome: troca.vendedor.name,
      creditoGerado: troca.creditoGerado.toNumber(),
      creditoConsumido: troca.creditoConsumido.toNumber(),
      creditoRemanescente: troca.creditoRemanescente.toNumber(),
      pedidoSaidaId: troca.pedidoSaida?.id ?? null,
      createdAt: troca.createdAt.toISOString(),
      observacoes: troca.observacoes,
      itensDevolvidos: troca.itens.map((it) => ({
        id: it.id,
        produtoVariacaoId: it.produtoVariacaoId,
        label: `${it.produtoVariacao.produto.nome} — ${it.produtoVariacao.nome}`,
        quantidade: it.quantidade,
        valorUnitario: it.valorUnitario.toNumber(),
        subtotal: it.valorUnitario.toNumber() * it.quantidade,
      })),
      itensNovos: (troca.pedidoSaida?.itens ?? []).map((it) => ({
        id: it.id,
        produtoVariacaoId: it.produtoVariacaoId,
        label: `${it.produtoVariacao.produto.nome} — ${it.produtoVariacao.nome}`,
        quantidade: it.quantidade,
        valorUnitario: it.precoUnitario.toNumber(),
        subtotal: it.precoUnitario.toNumber() * it.quantidade,
      })),
    },
  };
}
