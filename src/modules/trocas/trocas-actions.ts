"use server";

import { Prisma, TrocaTipoFluxo } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { parseBRL } from "@/lib/form-utils";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { assertStoreInSession } from "@/modules/estoque/estoque-auth";
import { registrarMovimentosEstoqueInTransaction } from "@/modules/estoque/estoque-service";
import {
  ROLES_ACESSO_VENDAS,
  ROLES_CONFIG_PRAZO_TROCA,
} from "@/modules/vendas/lib/roles";

export type TrocaActionErr = { error: string };

function parseValorMonetario(s: string): Prisma.Decimal | null {
  const n = parseBRL(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return new Prisma.Decimal(n.toFixed(2));
}

/**
 * Regista troca por artigos (catálogo): crédito ao cliente, entrada em stock.
 * Não ajusta corretor nem pedido consignado — ver `trocas-domain.md`.
 */
export async function registrarTroca(input: {
  storeId: string;
  clienteId: string;
  itens: { produtoVariacaoId: string; quantidade: number; valorUnitario: string }[];
  obs?: string | null;
  /** Quando enviado e válido na loja, grava-se como `criadoPor` em vez do utilizador da sessão. */
  operadorColaboradorId?: string | null;
}): Promise<{ ok: true; trocaId: string; numero: number } | TrocaActionErr> {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const tenantId = session.user.tenantId;
  try {
    assertStoreInSession(session, input.storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  if (input.itens.length === 0) {
    return { error: "Inclua pelo menos um artigo." };
  }

  for (const l of input.itens) {
    if (!Number.isInteger(l.quantidade) || l.quantidade <= 0) {
      return { error: "Quantidades devem ser inteiras positivas." };
    }
    if (parseValorMonetario(l.valorUnitario) == null) {
      return { error: "Valor unitário inválido numa das linhas." };
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const cliente = await tx.cliente.findFirst({
        where: {
          id: input.clienteId,
          tenantId,
          storeId: input.storeId,
        },
        select: { id: true },
      });
      if (!cliente) {
        throw new Error("Cliente não encontrado nesta loja.");
      }

      const variacaoIds = [...new Set(input.itens.map((l) => l.produtoVariacaoId))];
      const variacoes = await tx.produtoVariacao.findMany({
        where: {
          id: { in: variacaoIds },
          tenantId,
        },
        select: { id: true },
      });
      if (variacoes.length !== variacaoIds.length) {
        throw new Error("Um ou mais artigos não existem no catálogo.");
      }

      let valorCredito = new Prisma.Decimal(0);
      const linhasStock: {
        produtoVariacaoId: string;
        quantidade: number;
        precoUnitario: Prisma.Decimal;
      }[] = [];

      const criarItens: Array<{
        quantidade: number;
        valorUnitario: Prisma.Decimal;
        produtoVariacao: { connect: { id: string } };
      }> = [];

      for (const linha of input.itens) {
        const vu = parseValorMonetario(linha.valorUnitario);
        if (!vu || vu.lte(0)) {
          throw new Error("Valor unitário deve ser maior que zero.");
        }
        const sub = vu.mul(linha.quantidade);
        valorCredito = valorCredito.add(sub);
        linhasStock.push({
          produtoVariacaoId: linha.produtoVariacaoId,
          quantidade: linha.quantidade,
          precoUnitario: vu,
        });
        criarItens.push({
          quantidade: linha.quantidade,
          valorUnitario: vu,
          produtoVariacao: { connect: { id: linha.produtoVariacaoId } },
        });
      }

      if (valorCredito.lte(0)) {
        throw new Error("Valor de crédito inválido.");
      }

      let criadoPorId: string | null = session.user.colaboradorId ?? null;
      const opId = input.operadorColaboradorId?.trim();
      if (opId) {
        const operador = await tx.colaborador.findFirst({
          where: {
            id: opId,
            tenantId,
            isDismissed: false,
            isActive: true,
            stores: { some: { storeId: input.storeId } },
          },
          select: { id: true },
        });
        if (operador) {
          criadoPorId = operador.id;
        }
      }

      const lastT = await tx.troca.findFirst({
        where: { storeId: input.storeId },
        orderBy: { numero: "desc" },
        select: { numero: true },
      });
      const numeroTroca = (lastT?.numero ?? 0) + 1;

      const troca = await tx.troca.create({
        data: {
          tenantId,
          storeId: input.storeId,
          numero: numeroTroca,
          clienteId: input.clienteId,
          tipoFluxo: TrocaTipoFluxo.TROCA_INDEPENDENTE,
          pedidoOrigemId: null,
          estado: "CONCLUIDA",
          valorCredito,
          obs: input.obs?.trim() || null,
          criadoPorId,
          itens: { create: criarItens },
        },
        select: { id: true, numero: true },
      });

      await tx.cliente.update({
        where: { id: input.clienteId },
        data: { creditoTroca: { increment: valorCredito } },
      });

      await registrarMovimentosEstoqueInTransaction(tx, {
        tenantId,
        userId: session.user.id,
        linhas: linhasStock.map((L) => ({
          storeId: input.storeId,
          produtoVariacaoId: L.produtoVariacaoId,
          delta: L.quantidade,
          tipo: "TROCA_DEVOLUCAO",
          motivo: `Troca #${troca.numero}`,
        })),
      });

      return troca;
    });

    revalidatePath("/vendas");
    revalidatePath("/trocas");
    revalidatePath("/clientes");
    return { ok: true, trocaId: result.id, numero: result.numero };
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    if (
      raw.includes("invalid input value for enum") &&
      raw.includes("TrocaTipoFluxo")
    ) {
      return {
        error:
          "O PostgreSQL ainda não inclui TROCA_INDEPENDENTE no enum TrocaTipoFluxo. Corra na raiz do repo: npm run db:repair-troca (ou `npx prisma migrate deploy` se o histórico de migrações estiver alinhado).",
      };
    }
    const prismaErr = e as { code?: string; meta?: { constraint?: unknown } };
    if (
      prismaErr.code === "P2011" &&
      typeof prismaErr.meta?.constraint === "string" &&
      prismaErr.meta.constraint.includes("pedidoOrigemId")
    ) {
      return {
        error:
          "A coluna Troca.pedidoOrigemId ainda está NOT NULL na base (migração incompleta). Corra: npm run db:repair-troca",
      };
    }
    if (
      raw.includes("Null constraint violation") &&
      raw.includes("pedidoOrigemId")
    ) {
      return {
        error:
          "A base exige pedido de origem na troca (schema antigo). Corra: npm run db:repair-troca",
      };
    }
    if (
      raw.includes("produtoVariacaoId") &&
      (raw.includes("does not exist") || raw.includes("não existe"))
    ) {
      return {
        error:
          "Falta a coluna TrocaItem.produtoVariacaoId na base. Corra: npm run db:repair-troca",
      };
    }
    return {
      error: raw || "Não foi possível registar a troca.",
    };
  }
}

export async function atualizarPrazoTrocaTenant(
  _prev: { ok?: true; error?: string } | null,
  formData: FormData,
): Promise<{ ok?: true; error?: string }> {
  const session = await requireRole(ROLES_CONFIG_PRAZO_TROCA);
  const raw = String(formData.get("prazoTrocaDias") ?? "").trim();
  let prazoTrocaDias: number | null = null;
  if (raw.length > 0) {
    const n = Number(raw.replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || n > 3650) {
      return {
        error:
          "Informe um número de dias entre 0 e 3650, ou vazio para sem limite.",
      };
    }
    prazoTrocaDias = Math.floor(n);
  }

  await prisma.tenant.update({
    where: { id: session.user.tenantId },
    data: { prazoTrocaDias },
  });

  revalidatePath("/trocas");
  revalidatePath("/vendas/trocas");
  return { ok: true };
}

export async function vincularPedidoNovoTrocaPorNumeros(input: {
  storeId: string;
  trocaNumero: number;
  pedidoNumeroNovo: number;
}): Promise<{ ok: true } | TrocaActionErr> {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const tenantId = session.user.tenantId;
  try {
    assertStoreInSession(session, input.storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  const troca = await prisma.troca.findFirst({
    where: {
      storeId: input.storeId,
      tenantId,
      numero: input.trocaNumero,
    },
    select: { id: true },
  });
  if (!troca) {
    return { error: "Troca não encontrada nesta loja." };
  }

  return vincularPedidoNovoATroca({
    storeId: input.storeId,
    trocaId: troca.id,
    pedidoNumero: input.pedidoNumeroNovo,
  });
}

export async function vincularPedidoNovoATroca(input: {
  storeId: string;
  trocaId: string;
  pedidoNumero: number;
}): Promise<{ ok: true } | TrocaActionErr> {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const tenantId = session.user.tenantId;
  try {
    assertStoreInSession(session, input.storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const troca = await tx.troca.findFirst({
        where: {
          id: input.trocaId,
          tenantId,
          storeId: input.storeId,
        },
        select: { id: true, clienteId: true, pedidoNovoId: true },
      });
      if (!troca) throw new Error("Troca não encontrada.");
      if (troca.pedidoNovoId) {
        throw new Error("Esta troca já tem um pedido associado.");
      }

      const pedidoNovo = await tx.pedido.findFirst({
        where: {
          storeId: input.storeId,
          tenantId,
          numero: input.pedidoNumero,
        },
        select: { id: true, clienteId: true },
      });
      if (!pedidoNovo) throw new Error("Pedido novo não encontrado nesta loja.");
      if (pedidoNovo.clienteId !== troca.clienteId) {
        throw new Error("O pedido deve ser do mesmo cliente da troca.");
      }

      await tx.troca.update({
        where: { id: troca.id },
        data: { pedidoNovoId: pedidoNovo.id },
      });
    });

    revalidatePath("/trocas");
    revalidatePath("/vendas/trocas");
    return { ok: true };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Não foi possível associar.",
    };
  }
}
