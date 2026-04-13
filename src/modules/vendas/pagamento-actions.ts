"use server";

import { type FormaPagamento, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { assertStoreInSession } from "@/modules/estoque/estoque-auth";
import { ROLES_ACESSO_VENDAS } from "@/modules/vendas/lib/roles";

export type PagamentoActionOk = { ok: true };
export type PagamentoActionErr = { error: string };

const FORMAS_VALIDAS: FormaPagamento[] = [
  "DINHEIRO",
  "CARTAO_DEBITO",
  "CARTAO_CREDITO",
  "PIX",
  "TRANSFERENCIA",
  "CHEQUE",
  "OUTROS",
];

export async function registrarPagamento(input: {
  storeId: string;
  pedidoId: string;
  forma: FormaPagamento;
  valor: string;
  obs?: string;
}): Promise<PagamentoActionOk | PagamentoActionErr> {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const tenantId = session.user.tenantId;

  try {
    assertStoreInSession(session, input.storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  if (!FORMAS_VALIDAS.includes(input.forma)) {
    return { error: "Forma de pagamento inválida." };
  }

  const valorDecimal = parseValor(input.valor);
  if (valorDecimal === null || valorDecimal.lte(0)) {
    return { error: "Informe um valor maior que zero." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findFirst({
        where: {
          id: input.pedidoId,
          tenantId,
          storeId: input.storeId,
          estado: { in: ["EM_ABERTO", "PAGO_PARCIAL"] },
        },
        select: { id: true, total: true, estado: true },
      });

      if (!pedido) {
        throw new Error("Pedido não encontrado ou não está em aberto.");
      }
      if (!pedido.total) {
        throw new Error("Pedido sem total calculado.");
      }

      const pagamentosExistentes = await tx.pagamento.aggregate({
        where: { pedidoId: pedido.id },
        _sum: { valor: true },
      });
      const totalJaPago = pagamentosExistentes._sum.valor ?? new Prisma.Decimal(0);
      const saldoEmAberto = pedido.total.sub(totalJaPago);

      if (valorDecimal.gt(saldoEmAberto)) {
        throw new Error(
          `Valor superior ao saldo em aberto (${saldoEmAberto.toFixed(2)}).`,
        );
      }

      await tx.pagamento.create({
        data: {
          tenantId,
          pedidoId: pedido.id,
          forma: input.forma,
          valor: valorDecimal,
          obs: input.obs?.trim() || null,
          criadoPorId: session.user.colaboradorId ?? null,
        },
      });

      const novoTotalPago = totalJaPago.add(valorDecimal);
      const novoEstado = novoTotalPago.gte(pedido.total) ? "QUITADO" : "PAGO_PARCIAL";

      await tx.pedido.update({
        where: { id: pedido.id },
        data: { estado: novoEstado },
      });
    });

    revalidatePath("/vendas");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível registrar o pagamento." };
  }
}

function parseValor(s: string): Prisma.Decimal | null {
  const t = s.trim().replace(",", ".");
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return new Prisma.Decimal(t);
}

export type LinhaRecebimento = {
  forma: FormaPagamento;
  /** Valor digitado (string "99,90"). Pode incluir troco para DINHEIRO. */
  valorDigitado: string;
  /**
   * Valor efectivamente registado (≤ saldo restante — para dinheiro com troco
   * o componente já calcula o correcto antes de enviar).
   */
  valorRegistar: string;
};

/**
 * Regista vários meios de pagamento numa única transação.
 * O componente é responsável por calcular troco e enviar só o valor líquido.
 */
export async function registrarMultiPagamento(input: {
  storeId: string;
  pedidoId: string;
  linhas: LinhaRecebimento[];
}): Promise<PagamentoActionOk | PagamentoActionErr> {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const tenantId = session.user.tenantId;

  try {
    assertStoreInSession(session, input.storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  const linhas = input.linhas
    .map((l) => ({ forma: l.forma, valor: parseValor(l.valorRegistar) }))
    .filter((l): l is { forma: FormaPagamento; valor: Prisma.Decimal } =>
      l.valor !== null && l.valor.gt(0),
    );

  if (linhas.length === 0) {
    return { error: "Informe pelo menos um valor para registar." };
  }

  for (const l of linhas) {
    if (!FORMAS_VALIDAS.includes(l.forma)) {
      return { error: "Forma de pagamento inválida." };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findFirst({
        where: {
          id: input.pedidoId,
          tenantId,
          storeId: input.storeId,
          estado: { in: ["EM_ABERTO", "PAGO_PARCIAL"] },
        },
        select: { id: true, total: true },
      });

      if (!pedido) throw new Error("Pedido não encontrado ou não está em aberto.");
      if (!pedido.total) throw new Error("Pedido sem total calculado.");

      const jaAcumulado = await tx.pagamento.aggregate({
        where: { pedidoId: pedido.id },
        _sum: { valor: true },
      });
      const totalJaPago = jaAcumulado._sum.valor ?? new Prisma.Decimal(0);
      const saldo = pedido.total.sub(totalJaPago);

      const totalARegistar = linhas.reduce(
        (acc, l) => acc.add(l.valor),
        new Prisma.Decimal(0),
      );

      if (totalARegistar.gt(saldo.add(new Prisma.Decimal("0.01")))) {
        throw new Error(
          `Total a registar (${totalARegistar.toFixed(2)}) supera o saldo em aberto (${saldo.toFixed(2)}).`,
        );
      }

      await tx.pagamento.createMany({
        data: linhas.map((l) => ({
          tenantId,
          pedidoId: pedido.id,
          forma: l.forma,
          valor: l.valor,
          criadoPorId: session.user.colaboradorId ?? null,
        })),
      });

      const novoTotalPago = totalJaPago.add(totalARegistar);
      const novoEstado = novoTotalPago.gte(pedido.total) ? "QUITADO" : "PAGO_PARCIAL";

      await tx.pedido.update({
        where: { id: pedido.id },
        data: { estado: novoEstado },
      });
    });

    revalidatePath("/vendas");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível registrar o pagamento." };
  }
}
