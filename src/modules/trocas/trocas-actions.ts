"use server";

import { Prisma, TrocaTipoFluxo } from "@prisma/client";
import { differenceInCalendarDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { assertStoreInSession } from "@/modules/estoque/estoque-auth";
import { registrarMovimentosEstoqueInTransaction } from "@/modules/estoque/estoque-service";
import {
  ROLES_ACESSO_VENDAS,
  ROLES_CONFIG_PRAZO_TROCA,
} from "@/modules/vendas/lib/roles";

export type TrocaActionErr = { error: string };

async function quantidadeJaTrocada(
  tx: Prisma.TransactionClient,
  pedidoItemId: string,
): Promise<number> {
  const r = await tx.trocaItem.aggregate({
    where: {
      pedidoItemId,
      troca: { estado: "CONCLUIDA" },
    },
    _sum: { quantidade: true },
  });
  return r._sum.quantidade ?? 0;
}

function detectarTipoFluxo(pedido: {
  estado: string;
  modalidade: string;
  movimentoCorretor: { id: string } | null;
}): TrocaTipoFluxo {
  if (pedido.modalidade === "CONSIGNADA") {
    if (
      (pedido.estado === "EM_ABERTO" || pedido.estado === "PAGO_PARCIAL") &&
      pedido.movimentoCorretor
    ) {
      return TrocaTipoFluxo.CONSIGNADO_NAO_QUITADO;
    }
  }
  if (pedido.estado === "QUITADO") {
    return TrocaTipoFluxo.VENDA_QUITADA;
  }
  throw new Error(
    "Pedido não elegível: use venda quitada ou consignado em aberto com dívida ao corretor.",
  );
}

/**
 * Regista uma troca concluída: crédito ao cliente, reposição de stock e ajuste de dívida de corretor quando aplicável.
 */
export async function registrarTroca(input: {
  storeId: string;
  pedidoNumero: number;
  itens: { pedidoItemId: string; quantidade: number }[];
  obs?: string | null;
}): Promise<{ ok: true; trocaId: string; numero: number } | TrocaActionErr> {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const tenantId = session.user.tenantId;
  try {
    assertStoreInSession(session, input.storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  if (input.itens.length === 0) {
    return { error: "Informe pelo menos uma linha com quantidade." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const [tenant, pedido] = await Promise.all([
        tx.tenant.findUnique({
          where: { id: tenantId },
          select: { prazoTrocaDias: true },
        }),
        tx.pedido.findFirst({
          where: {
            storeId: input.storeId,
            tenantId,
            numero: input.pedidoNumero,
          },
          include: {
            itens: true,
            movimentoCorretor: { select: { id: true, valor: true } },
          },
        }),
      ]);

      if (!pedido) {
        throw new Error("Pedido não encontrado nesta loja.");
      }
      if (!pedido.clienteId) {
        throw new Error("Pedido sem cliente: não é possível creditar troca.");
      }

      const tipoFluxo = detectarTipoFluxo(pedido);

      if (tipoFluxo === TrocaTipoFluxo.VENDA_QUITADA && tenant?.prazoTrocaDias != null) {
        const decorridos = differenceInCalendarDays(new Date(), pedido.createdAt);
        if (decorridos > tenant.prazoTrocaDias) {
          throw new Error(
            `Prazo de troca expirado (máx. ${tenant.prazoTrocaDias} dias após o pedido).`,
          );
        }
      }

      const itemIds = new Set(pedido.itens.map((i) => i.id));
      let valorCredito = new Prisma.Decimal(0);
      const linhasStock: {
        produtoVariacaoId: string;
        quantidade: number;
        precoUnitario: Prisma.Decimal;
      }[] = [];

      for (const linha of input.itens) {
        if (!Number.isInteger(linha.quantidade) || linha.quantidade <= 0) {
          throw new Error("Quantidades devem ser inteiras positivas.");
        }
        if (!itemIds.has(linha.pedidoItemId)) {
          throw new Error("Linha não pertence a este pedido.");
        }
        const pi = pedido.itens.find((i) => i.id === linha.pedidoItemId)!;
        const ja = await quantidadeJaTrocada(tx, linha.pedidoItemId);
        const disp = pi.quantidade - ja;
        if (linha.quantidade > disp) {
          throw new Error(
            `Quantidade superior ao disponível para troca na linha (${disp} disponível).`,
          );
        }
        const sub = pi.precoUnitario.mul(linha.quantidade);
        valorCredito = valorCredito.add(sub);
        linhasStock.push({
          produtoVariacaoId: pi.produtoVariacaoId,
          quantidade: linha.quantidade,
          precoUnitario: pi.precoUnitario,
        });
      }

      if (valorCredito.lte(0)) {
        throw new Error("Valor de crédito inválido.");
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
          clienteId: pedido.clienteId,
          pedidoOrigemId: pedido.id,
          tipoFluxo,
          estado: "CONCLUIDA",
          valorCredito,
          obs: input.obs?.trim() || null,
          criadoPorId: session.user.colaboradorId ?? null,
          itens: {
            create: input.itens.map((l) => {
              const pi = pedido.itens.find((i) => i.id === l.pedidoItemId)!;
              return {
                pedidoItemId: l.pedidoItemId,
                quantidade: l.quantidade,
                valorUnitario: pi.precoUnitario,
              };
            }),
          },
        },
        select: { id: true, numero: true },
      });

      await tx.cliente.update({
        where: { id: pedido.clienteId },
        data: { creditoTroca: { increment: valorCredito } },
      });

      if (
        tipoFluxo === TrocaTipoFluxo.CONSIGNADO_NAO_QUITADO &&
        pedido.movimentoCorretor
      ) {
        const mov = pedido.movimentoCorretor;
        const reduzir = valorCredito.gt(mov.valor) ? mov.valor : valorCredito;
        const restante = mov.valor.sub(reduzir);
        if (restante.lte(0)) {
          await tx.movimentoCorretor.delete({ where: { id: mov.id } });
        } else {
          await tx.movimentoCorretor.update({
            where: { id: mov.id },
            data: { valor: restante },
          });
        }
      }

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
    revalidatePath("/vendas/trocas");
    revalidatePath("/clientes");
    return { ok: true, trocaId: result.id, numero: result.numero };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível registar a troca." };
  }
}

export type BuscarPedidoTrocaOk = {
  ok: true;
  pedidoId: string;
  clienteNome: string;
  tipoFluxo: TrocaTipoFluxo;
  itens: {
    pedidoItemId: string;
    label: string;
    quantidadePedido: number;
    disponivel: number;
    precoUnitario: string;
  }[];
};

export async function buscarPedidoParaTroca(input: {
  storeId: string;
  pedidoNumero: number;
}): Promise<BuscarPedidoTrocaOk | TrocaActionErr> {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const tenantId = session.user.tenantId;
  try {
    assertStoreInSession(session, input.storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  try {
    const pedido = await prisma.pedido.findFirst({
      where: {
        storeId: input.storeId,
        tenantId,
        numero: input.pedidoNumero,
      },
      include: {
        cliente: {
          select: { nome: true, fantasia: true, razaoSocial: true, tipo: true },
        },
        itens: {
          include: {
            produtoVariacao: {
              select: { nome: true, produto: { select: { nome: true } } },
            },
          },
        },
        movimentoCorretor: { select: { id: true } },
      },
    });

    if (!pedido) {
      return { error: "Pedido não encontrado." };
    }

    let tipoFluxo: TrocaTipoFluxo;
    try {
      tipoFluxo = detectarTipoFluxo(pedido);
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Não elegível." };
    }

    const itens = await Promise.all(
      pedido.itens.map(async (pi) => {
        const ja = await prisma.trocaItem.aggregate({
          where: {
            pedidoItemId: pi.id,
            troca: { estado: "CONCLUIDA" },
          },
          _sum: { quantidade: true },
        });
        const devolvido = ja._sum.quantidade ?? 0;
        const disponivel = pi.quantidade - devolvido;
        const label = `${pi.produtoVariacao.produto.nome} — ${pi.produtoVariacao.nome}`;
        return {
          pedidoItemId: pi.id,
          label,
          quantidadePedido: pi.quantidade,
          disponivel,
          precoUnitario: pi.precoUnitario.toFixed(2),
        };
      }),
    );

    const clienteNome =
      pedido.cliente?.nome ||
      pedido.cliente?.fantasia ||
      pedido.cliente?.razaoSocial ||
      "Cliente";

    return {
      ok: true,
      pedidoId: pedido.id,
      clienteNome,
      tipoFluxo,
      itens,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao carregar pedido." };
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
      return { error: "Informe um número de dias entre 0 e 3650, ou vazio para sem limite." };
    }
    prazoTrocaDias = Math.floor(n);
  }

  await prisma.tenant.update({
    where: { id: session.user.tenantId },
    data: { prazoTrocaDias },
  });

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

    revalidatePath("/vendas/trocas");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível associar." };
  }
}
