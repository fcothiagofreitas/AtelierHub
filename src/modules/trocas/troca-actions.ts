"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { assertStoreInSession } from "@/modules/estoque/estoque-auth";
import { registrarMovimentosEstoqueInTransaction } from "@/modules/estoque/estoque-service";
import { ROLES_ACESSO_VENDAS } from "@/modules/vendas/lib/roles";
import { clienteNomeCurto } from "@/modules/vendas/lib/cliente-nome";
import { resolverDividaCorretorAoQuitarPedido } from "@/modules/vendas/lib/corretor-divida-quit";
import { garantirEntregaAoQuitarPedido } from "@/modules/vendas/lib/entrega-ao-quitar";
import { gerarLancamentosComissaoPedidoQuitado } from "@/modules/comissoes/gerar-lancamentos-comissao";

export type TrocaActionOk = { ok: true };
export type TrocaActionErr = { error: string };
export type TrocaCreateResult = { ok: true; trocaId: string } | TrocaActionErr;

function parsePreco(s: string): Prisma.Decimal {
  const t = s.trim().replace(",", ".");
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) throw new Error("Valor inválido.");
  return new Prisma.Decimal(t);
}

function revalidateTrocas() {
  revalidatePath("/trocas");
  revalidatePath("/vendas");
}

export async function trocaCreateDraft(input: {
  storeId: string;
  clienteId: string;
  vendedorId: string;
}): Promise<TrocaCreateResult> {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const tenantId = session.user.tenantId;
  try {
    assertStoreInSession(session, input.storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  const [cliente, vendedor] = await Promise.all([
    prisma.cliente.findFirst({
      where: { id: input.clienteId, tenantId, storeId: input.storeId, isActive: true, isBlocked: false },
      select: { id: true },
    }),
    prisma.colaborador.findFirst({
      where: {
        id: input.vendedorId,
        tenantId,
        isDismissed: false,
        isActive: true,
        stores: { some: { storeId: input.storeId } },
      },
      select: { id: true },
    }),
  ]);

  if (!cliente) return { error: "Cliente inválido ou bloqueado." };
  if (!vendedor) return { error: "Vendedor inválido para esta loja." };

  try {
    const troca = await prisma.$transaction(async (tx) => {
      const last = await tx.troca.findFirst({
        where: { storeId: input.storeId },
        orderBy: { numero: "desc" },
        select: { numero: true },
      });
      const numero = (last?.numero ?? 0) + 1;
      return tx.troca.create({
        data: {
          tenantId,
          storeId: input.storeId,
          numero,
          clienteId: input.clienteId,
          vendedorId: input.vendedorId,
          estado: "EM_ANDAMENTO",
        },
        select: { id: true },
      });
    });
    revalidateTrocas();
    return { ok: true, trocaId: troca.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível criar a troca." };
  }
}

export async function trocaSaveItensDevolvidos(input: {
  storeId: string;
  trocaId: string;
  itens: { produtoVariacaoId: string; quantidade: number; valorUnitario: string }[];
}): Promise<TrocaActionOk | TrocaActionErr> {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const tenantId = session.user.tenantId;
  try {
    assertStoreInSession(session, input.storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  for (const it of input.itens) {
    if (!Number.isInteger(it.quantidade) || it.quantidade <= 0) {
      return { error: "Cada item precisa de quantidade inteira positiva." };
    }
    try {
      parsePreco(it.valorUnitario);
    } catch {
      return { error: "Valor unitário inválido em um dos itens." };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const troca = await tx.troca.findFirst({
        where: { id: input.trocaId, tenantId, storeId: input.storeId, estado: "EM_ANDAMENTO" },
        select: { id: true },
      });
      if (!troca) throw new Error("Troca não encontrada ou já finalizada.");

      await tx.trocaItem.deleteMany({ where: { trocaId: input.trocaId } });

      if (input.itens.length > 0) {
        await tx.trocaItem.createMany({
          data: input.itens.map((it) => ({
            trocaId: input.trocaId,
            produtoVariacaoId: it.produtoVariacaoId,
            quantidade: it.quantidade,
            valorUnitario: parsePreco(it.valorUnitario),
          })),
        });
      }
    });
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível salvar os itens." };
  }
}

export type TrocaDraftData = {
  trocaId: string;
  numero: number;
  clienteId: string;
  clienteNomeExibicao: string;
  creditoTrocaAcumulado: number;
  vendedorId: string;
  itensDevolvidos: {
    produtoVariacaoId: string;
    label: string;
    quantidade: number;
    valorUnitario: string;
    saldoRef: number;
  }[];
  creditoGerado: number;
};

export async function trocaGetDraft(input: {
  storeId: string;
  trocaId: string;
}): Promise<{ ok: true; data: TrocaDraftData } | TrocaActionErr> {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const tenantId = session.user.tenantId;
  try {
    assertStoreInSession(session, input.storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  const troca = await prisma.troca.findFirst({
    where: { id: input.trocaId, tenantId, storeId: input.storeId, estado: "EM_ANDAMENTO" },
    include: {
      cliente: { select: { tipo: true, nome: true, fantasia: true, razaoSocial: true, creditoTroca: true } },
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

  if (!troca) return { error: "Troca não encontrada ou já finalizada." };

  const ids = troca.itens.map((i) => i.produtoVariacaoId);
  const saldos =
    ids.length === 0
      ? []
      : await prisma.estoqueSaldo.findMany({
          where: { storeId: input.storeId, produtoVariacaoId: { in: ids } },
          select: { produtoVariacaoId: true, quantidade: true },
        });
  const saldoMap = new Map(saldos.map((s) => [s.produtoVariacaoId, s.quantidade]));

  const creditoGerado = troca.itens.reduce(
    (acc, it) => acc + it.valorUnitario.toNumber() * it.quantidade,
    0,
  );

  return {
    ok: true,
    data: {
      trocaId: troca.id,
      numero: troca.numero,
      clienteId: troca.clienteId,
      clienteNomeExibicao: clienteNomeCurto(troca.cliente),
      creditoTrocaAcumulado: troca.cliente.creditoTroca.toNumber(),
      vendedorId: troca.vendedorId,
      itensDevolvidos: troca.itens.map((it) => ({
        produtoVariacaoId: it.produtoVariacaoId,
        label: `${it.produtoVariacao.produto.nome} — ${it.produtoVariacao.nome}`,
        quantidade: it.quantidade,
        valorUnitario: it.valorUnitario.toFixed(2),
        saldoRef: saldoMap.get(it.produtoVariacaoId) ?? 0,
      })),
      creditoGerado,
    },
  };
}

export type TrocaConfirmarResult =
  | { ok: true; pedidoId: string | null; saldoDevedor: number }
  | TrocaActionErr;

export async function trocaConfirmar(input: {
  storeId: string;
  trocaId: string;
  itensNovos: { produtoVariacaoId: string; quantidade: number; precoUnitario: string }[];
  observacoes?: string;
}): Promise<TrocaConfirmarResult> {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const tenantId = session.user.tenantId;
  const userId = session.user.id;
  const colaboradorId = session.user.colaboradorId ?? null;
  try {
    assertStoreInSession(session, input.storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  for (const it of input.itensNovos) {
    if (!Number.isInteger(it.quantidade) || it.quantidade <= 0) {
      return { error: "Cada item novo precisa de quantidade inteira positiva." };
    }
    try {
      parsePreco(it.precoUnitario);
    } catch {
      return { error: "Preço inválido em um dos itens novos." };
    }
  }

  let pedidoId: string | null = null;
  let saldoDevedor = 0;

  try {
    await prisma.$transaction(async (tx) => {
      const troca = await tx.troca.findFirst({
        where: { id: input.trocaId, tenantId, storeId: input.storeId, estado: "EM_ANDAMENTO" },
        include: {
          itens: true,
          cliente: { select: { id: true, creditoTroca: true } },
        },
      });

      if (!troca) throw new Error("Troca não encontrada ou já finalizada.");
      if (troca.itens.length === 0) throw new Error("Adicione ao menos um item devolvido.");

      const creditoGerado = troca.itens.reduce(
        (acc, it) => acc.add(it.valorUnitario.mul(it.quantidade)),
        new Prisma.Decimal(0),
      );

      // Registra TROCA_ENTRADA para cada item devolvido
      await registrarMovimentosEstoqueInTransaction(tx, {
        tenantId,
        userId,
        linhas: troca.itens.map((it) => ({
          storeId: input.storeId,
          produtoVariacaoId: it.produtoVariacaoId,
          delta: it.quantidade,
          tipo: "TROCA_ENTRADA" as const,
          motivo: `Troca nº ${troca.numero}`,
          loteTransferenciaId: null,
        })),
      });

      let novoPedidoId: string | null = null;
      let creditoConsumido = new Prisma.Decimal(0);

      if (input.itensNovos.length > 0) {
        // Verifica saldo para novos itens
        for (const it of input.itensNovos) {
          const saldo = await tx.estoqueSaldo.findUnique({
            where: { storeId_produtoVariacaoId: { storeId: input.storeId, produtoVariacaoId: it.produtoVariacaoId } },
            select: { quantidade: true },
          });
          if ((saldo?.quantidade ?? 0) < it.quantidade) {
            throw new Error("Saldo insuficiente para um ou mais itens novos.");
          }
        }

        const totalNovos = input.itensNovos.reduce(
          (acc, it) => acc.add(parsePreco(it.precoUnitario).mul(it.quantidade)),
          new Prisma.Decimal(0),
        );

        creditoConsumido = creditoGerado.gt(totalNovos) ? totalNovos : creditoGerado;
        const saldoDevedorDecimal = totalNovos.sub(creditoConsumido);
        saldoDevedor = saldoDevedorDecimal.toNumber();

        // Cria Pedido de saída com modalidade TROCA
        const last = await tx.pedido.findFirst({
          where: { storeId: input.storeId },
          orderBy: { numero: "desc" },
          select: { numero: true },
        });
        const numeroPedido = (last?.numero ?? 0) + 1;

        const pedidoEstadoInicial = creditoConsumido.gte(totalNovos) ? "QUITADO" : "EM_ABERTO";

        const novoPedido = await tx.pedido.create({
          data: {
            tenantId,
            storeId: input.storeId,
            numero: numeroPedido,
            clienteId: troca.clienteId,
            vendedorId: troca.vendedorId,
            corretorId: null,
            estado: pedidoEstadoInicial,
            modalidade: "TROCA",
            total: totalNovos,
            trocaOrigemId: troca.id,
            observacoes: input.observacoes?.trim() || null,
          },
          select: { id: true },
        });
        novoPedidoId = novoPedido.id;

        await tx.pedidoItem.createMany({
          data: input.itensNovos.map((it) => ({
            pedidoId: novoPedido.id,
            produtoVariacaoId: it.produtoVariacaoId,
            quantidade: it.quantidade,
            precoUnitario: parsePreco(it.precoUnitario),
          })),
        });

        await registrarMovimentosEstoqueInTransaction(tx, {
          tenantId,
          userId,
          linhas: input.itensNovos.map((it) => ({
            storeId: input.storeId,
            produtoVariacaoId: it.produtoVariacaoId,
            delta: -it.quantidade,
            tipo: "VENDA" as const,
            motivo: `Pedido nº ${numeroPedido} (troca nº ${troca.numero})`,
            loteTransferenciaId: null,
          })),
        });

        // Aplica o crédito como pagamento
        if (creditoConsumido.gt(0)) {
          await tx.pagamento.create({
            data: {
              tenantId,
              pedidoId: novoPedido.id,
              forma: "OUTROS",
              valor: creditoConsumido,
              obs: `Crédito de troca nº ${troca.numero}`,
              criadoPorId: colaboradorId,
            },
          });

          if (pedidoEstadoInicial === "EM_ABERTO") {
            await tx.pedido.update({
              where: { id: novoPedido.id },
              data: { estado: "PAGO_PARCIAL" },
            });
          }
        }

        if (pedidoEstadoInicial === "QUITADO") {
          await resolverDividaCorretorAoQuitarPedido(tx, novoPedido.id);
          await garantirEntregaAoQuitarPedido(tx, {
            pedidoId: novoPedido.id,
            entreguePorId: colaboradorId,
          });
          await gerarLancamentosComissaoPedidoQuitado(tx, novoPedido.id);
        }
      }

      const creditoRemanescente = creditoGerado.sub(creditoConsumido);

      // Crédito remanescente fica na conta do cliente
      if (creditoRemanescente.gt(0)) {
        await tx.cliente.update({
          where: { id: troca.clienteId },
          data: { creditoTroca: { increment: creditoRemanescente } },
        });
      }

      const obs = input.observacoes?.trim() || null;
      await tx.troca.update({
        where: { id: troca.id },
        data: {
          estado: "CONCLUIDA",
          creditoGerado,
          creditoConsumido,
          creditoRemanescente,
          ...(obs ? { observacoes: obs } : {}),
        },
      });

      pedidoId = novoPedidoId;
    });

    revalidateTrocas();
    return { ok: true, pedidoId, saldoDevedor };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível confirmar a troca." };
  }
}

export async function trocaCancelar(input: {
  storeId: string;
  trocaId: string;
}): Promise<TrocaActionOk | TrocaActionErr> {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const tenantId = session.user.tenantId;
  try {
    assertStoreInSession(session, input.storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  try {
    const r = await prisma.troca.updateMany({
      where: { id: input.trocaId, tenantId, storeId: input.storeId, estado: "EM_ANDAMENTO" },
      data: { estado: "CANCELADA" },
    });
    if (r.count === 0) return { error: "Troca não encontrada ou já finalizada." };
    revalidateTrocas();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível cancelar a troca." };
  }
}
