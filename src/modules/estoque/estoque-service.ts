import type { MovimentoEstoqueTipo, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

export type LinhaMovimento = {
  storeId: string;
  produtoVariacaoId: string;
  delta: number;
  tipo: MovimentoEstoqueTipo;
  motivo?: string | null;
  loteTransferenciaId?: string | null;
};

async function assertStoreTenant(
  tx: Prisma.TransactionClient,
  tenantId: string,
  storeId: string,
): Promise<void> {
  const s = await tx.store.findFirst({ where: { id: storeId, tenantId } });
  if (!s) throw new Error("Loja inválida ou de outro tenant.");
}

async function assertVariacaoTenant(
  tx: Prisma.TransactionClient,
  tenantId: string,
  produtoVariacaoId: string,
): Promise<void> {
  const v = await tx.produtoVariacao.findFirst({
    where: { id: produtoVariacaoId, tenantId },
  });
  if (!v) throw new Error("Variação inválida ou de outro tenant.");
}

/**
 * Regista movimentos e saldos usando um `TransactionClient` existente (ex.: finalização de venda + pedido).
 */
export async function registrarMovimentosEstoqueInTransaction(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    userId: string | null;
    linhas: LinhaMovimento[];
  },
): Promise<void> {
  const { tenantId, userId, linhas } = input;
  for (const L of linhas) {
    if (L.delta === 0) continue;
    await assertStoreTenant(tx, tenantId, L.storeId);
    await assertVariacaoTenant(tx, tenantId, L.produtoVariacaoId);

    await tx.movimentoEstoque.create({
      data: {
        tenantId,
        storeId: L.storeId,
        produtoVariacaoId: L.produtoVariacaoId,
        delta: L.delta,
        tipo: L.tipo,
        motivo: L.motivo ?? null,
        userId,
        loteTransferenciaId: L.loteTransferenciaId ?? null,
      },
    });

    const saldo = await tx.estoqueSaldo.upsert({
      where: {
        storeId_produtoVariacaoId: {
          storeId: L.storeId,
          produtoVariacaoId: L.produtoVariacaoId,
        },
      },
      create: {
        tenantId,
        storeId: L.storeId,
        produtoVariacaoId: L.produtoVariacaoId,
        quantidade: L.delta,
      },
      update: {
        quantidade: { increment: L.delta },
      },
    });

    if (saldo.quantidade < 0) {
      throw new Error("Saldo insuficiente para esta operação.");
    }
  }
}

/**
 * Regista uma ou mais linhas de movimento e atualiza saldos na mesma transação.
 * Falha se algum saldo ficar negativo.
 */
export async function registrarMovimentosEstoque(input: {
  tenantId: string;
  userId: string | null;
  linhas: LinhaMovimento[];
}): Promise<void> {
  const { tenantId, userId, linhas } = input;
  if (linhas.length === 0) return;

  await prisma.$transaction(async (tx) => {
    await registrarMovimentosEstoqueInTransaction(tx, { tenantId, userId, linhas });
  });
}

export async function entradaManualEstoque(input: {
  tenantId: string;
  userId: string | null;
  storeId: string;
  produtoVariacaoId: string;
  quantidade: number;
}): Promise<void> {
  const q = input.quantidade;
  if (!Number.isInteger(q) || q <= 0) {
    throw new Error("Quantidade deve ser um inteiro positivo.");
  }
  await registrarMovimentosEstoque({
    tenantId: input.tenantId,
    userId: input.userId,
    linhas: [
      {
        storeId: input.storeId,
        produtoVariacaoId: input.produtoVariacaoId,
        delta: q,
        tipo: "ENTRADA_MANUAL",
      },
    ],
  });
}

export async function saidaDefeitoEstoque(input: {
  tenantId: string;
  userId: string | null;
  storeId: string;
  produtoVariacaoId: string;
  quantidade: number;
  motivo?: string | null;
}): Promise<void> {
  const q = input.quantidade;
  if (!Number.isInteger(q) || q <= 0) {
    throw new Error("Quantidade deve ser um inteiro positivo.");
  }
  await registrarMovimentosEstoque({
    tenantId: input.tenantId,
    userId: input.userId,
    linhas: [
      {
        storeId: input.storeId,
        produtoVariacaoId: input.produtoVariacaoId,
        delta: -q,
        tipo: "SAIDA_DEFEITO",
        motivo: input.motivo ?? null,
      },
    ],
  });
}

export async function ajusteConferenciaEstoque(input: {
  tenantId: string;
  userId: string | null;
  storeId: string;
  produtoVariacaoId: string;
  delta: number;
  motivo?: string | null;
}): Promise<void> {
  const d = input.delta;
  if (!Number.isInteger(d) || d === 0) {
    throw new Error("Ajuste deve ser um inteiro diferente de zero.");
  }
  await registrarMovimentosEstoque({
    tenantId: input.tenantId,
    userId: input.userId,
    linhas: [
      {
        storeId: input.storeId,
        produtoVariacaoId: input.produtoVariacaoId,
        delta: d,
        tipo: "AJUSTE_CONFERENCIA",
        motivo: input.motivo ?? null,
      },
    ],
  });
}

export async function transferenciaEstoque(input: {
  tenantId: string;
  userId: string | null;
  storeOrigemId: string;
  storeDestinoId: string;
  produtoVariacaoId: string;
  quantidade: number;
}): Promise<void> {
  const q = input.quantidade;
  if (!Number.isInteger(q) || q <= 0) {
    throw new Error("Quantidade deve ser um inteiro positivo.");
  }
  if (input.storeOrigemId === input.storeDestinoId) {
    throw new Error("Origem e destino devem ser lojas diferentes.");
  }
  const lote = randomUUID();
  await registrarMovimentosEstoque({
    tenantId: input.tenantId,
    userId: input.userId,
    linhas: [
      {
        storeId: input.storeOrigemId,
        produtoVariacaoId: input.produtoVariacaoId,
        delta: -q,
        tipo: "TRANSFERENCIA_SAIDA",
        loteTransferenciaId: lote,
      },
      {
        storeId: input.storeDestinoId,
        produtoVariacaoId: input.produtoVariacaoId,
        delta: q,
        tipo: "TRANSFERENCIA_ENTRADA",
        loteTransferenciaId: lote,
      },
    ],
  });
}

export async function findVariacaoIdByEan13(
  tenantId: string,
  eanRaw: string,
): Promise<string | null> {
  const ean = eanRaw.replace(/\D/g, "");
  if (ean.length !== 13) return null;
  const row = await prisma.produtoVariacao.findFirst({
    where: { tenantId, ean13: ean },
    select: { id: true },
  });
  return row?.id ?? null;
}
