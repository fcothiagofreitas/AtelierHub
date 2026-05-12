"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { assertStoreInSession } from "@/modules/estoque/estoque-auth";
import { ROLES_ACESSO_VENDAS } from "@/modules/vendas/lib/roles";
import { clienteNomeCurto } from "@/modules/vendas/lib/cliente-nome";
import type { TrocaEstado } from "@prisma/client";

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

export async function listarTrocas(input: {
  storeId: string;
  estado?: TrocaEstado;
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

  const where = {
    tenantId,
    storeId: input.storeId,
    ...(input.estado ? { estado: input.estado } : {}),
    ...(input.clienteId ? { clienteId: input.clienteId } : {}),
  };

  const skip = Math.max(0, input.skip ?? 0);
  const take = Math.min(100, Math.max(10, input.take ?? 20));

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

export type TrocaDetalhe = TrocaListRow & {
  itensDevolvidos: {
    id: string;
    produtoVariacaoId: string;
    label: string;
    quantidade: number;
    valorUnitario: number;
    subtotal: number;
  }[];
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
      pedidoSaida: { select: { id: true } },
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
    },
  };
}
