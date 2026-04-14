"use server";

import { type FormaPagamento, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { assertStoreInSession } from "@/modules/estoque/estoque-auth";
import {
  findVariacaoIdByEan13,
  registrarMovimentosEstoqueInTransaction,
} from "@/modules/estoque/estoque-service";
import { ROLES_ACESSO_VENDAS } from "@/modules/vendas/lib/roles";
import { clienteNomeCurto } from "@/modules/vendas/lib/cliente-nome";

export type PdvActionOk = { ok: true };
export type PdvActionErr = { error: string };
export type PdvCreateResult = { ok: true; pedidoId: string } | PdvActionErr;

function revalidateVendas() {
  revalidatePath("/vendas");
}

function revalidateClientesVendas() {
  revalidatePath("/vendas");
  revalidatePath("/clientes");
}

/** Cliente PF só com nome (cadastro rápido no PDV). */
export async function pdvCreateClienteNomeRapido(input: {
  storeId: string;
  nome: string;
}): Promise<{ ok: true; clienteId: string } | PdvActionErr> {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const tenantId = session.user.tenantId;
  try {
    assertStoreInSession(session, input.storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  const nome = input.nome.trim();
  if (nome.length < 2 || nome.length > 200) {
    return { error: "Informe um nome entre 2 e 200 caracteres." };
  }

  const store = await prisma.store.findFirst({
    where: { id: input.storeId, tenantId },
    select: { id: true },
  });
  if (!store) return { error: "Loja inválida." };

  try {
    const c = await prisma.cliente.create({
      data: {
        tenantId,
        storeId: input.storeId,
        tipo: "PF",
        nome,
        isActive: true,
        isBlocked: false,
      },
      select: { id: true },
    });
    revalidateClientesVendas();
    return { ok: true, clienteId: c.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível criar o cliente." };
  }
}

/**
 * Quando o comprador é um corretor cadastrado: garante um `Cliente` PF na loja
 * (ligado ao corretor) para preencher `Pedido.clienteId`.
 */
export async function pdvEnsureClienteForCorretor(input: {
  storeId: string;
  corretorId: string;
}): Promise<{ ok: true; clienteId: string } | PdvActionErr> {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const tenantId = session.user.tenantId;
  try {
    assertStoreInSession(session, input.storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  const corretor = await prisma.corretor.findFirst({
    where: { id: input.corretorId, tenantId, isActive: true, isBlocked: false },
    select: { id: true, name: true },
  });
  if (!corretor) return { error: "Corretor inválido ou bloqueado." };

  const existing = await prisma.cliente.findFirst({
    where: {
      tenantId,
      storeId: input.storeId,
      corretorId: input.corretorId,
    },
    select: { id: true },
  });
  if (existing) {
    return { ok: true, clienteId: existing.id };
  }

  try {
    const c = await prisma.cliente.create({
      data: {
        tenantId,
        storeId: input.storeId,
        tipo: "PF",
        nome: corretor.name,
        corretorId: input.corretorId,
        isActive: true,
        isBlocked: false,
      },
      select: { id: true },
    });
    revalidateClientesVendas();
    return { ok: true, clienteId: c.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível associar o corretor." };
  }
}

async function assertPedidoEmAndamento(
  tx: Prisma.TransactionClient,
  tenantId: string,
  storeId: string,
  pedidoId: string,
) {
  const p = await tx.pedido.findFirst({
    where: { id: pedidoId, tenantId, storeId, estado: "EM_ANDAMENTO" },
    select: { id: true },
  });
  if (!p) throw new Error("Pedido não encontrado ou já finalizado.");
}

async function validateClienteSeInformado(
  tenantId: string,
  storeId: string,
  clienteId: string | null,
) {
  if (!clienteId) return;
  const cliente = await prisma.cliente.findFirst({
    where: {
      id: clienteId,
      tenantId,
      storeId,
      isActive: true,
      isBlocked: false,
    },
    select: { id: true },
  });
  if (!cliente) throw new Error("Cliente inválido ou bloqueado.");
}

async function validateVendedorECorretor(
  tenantId: string,
  storeId: string,
  vendedorId: string,
  corretorId: string | null,
) {
  const vendedor = await prisma.colaborador.findFirst({
    where: {
      id: vendedorId,
      tenantId,
      isDismissed: false,
      isActive: true,
      stores: { some: { storeId } },
    },
    select: { id: true },
  });
  if (!vendedor) throw new Error("Vendedor inválido para esta loja.");

  if (corretorId) {
    const c = await prisma.corretor.findFirst({
      where: { id: corretorId, tenantId, isActive: true, isBlocked: false },
      select: { id: true },
    });
    if (!c) throw new Error("Corretor inválido ou bloqueado.");
  }
}

function parsePreco(s: string): Prisma.Decimal {
  const t = s.trim().replace(",", ".");
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("Preço inválido.");
  }
  return new Prisma.Decimal(t);
}

function saldoEmAbertoPedido(p: {
  total: Prisma.Decimal | null;
  pagamentos: { valor: Prisma.Decimal }[];
}): Prisma.Decimal {
  if (!p.total) return new Prisma.Decimal(0);
  const pago = p.pagamentos.reduce(
    (a, x) => a.add(x.valor),
    new Prisma.Decimal(0),
  );
  const s = p.total.sub(pago);
  return s.gt(0) ? s : new Prisma.Decimal(0);
}

/**
 * Valida limite de crédito do cliente e do corretor (exposição em pedidos em aberto).
 * `totalDestePedido` = total das linhas a passar a em aberto.
 */
async function assertCreditoParaFinalizar(
  tx: Prisma.TransactionClient,
  tenantId: string,
  storeId: string,
  pedidoId: string,
  input: {
    clienteId: string | null;
    corretorId: string | null;
    totalDestePedido: Prisma.Decimal;
  },
) {
  if (input.clienteId) {
    const cliente = await tx.cliente.findFirst({
      where: { id: input.clienteId, tenantId, storeId },
      select: { isBlocked: true, creditLimit: true },
    });
    if (!cliente) throw new Error("Cliente inválido.");
    if (cliente.isBlocked) {
      throw new Error("Operação não autorizada: cliente bloqueado.");
    }
    if (cliente.creditLimit != null) {
      const outros = await tx.pedido.findMany({
        where: {
          tenantId,
          storeId,
          clienteId: input.clienteId,
          id: { not: pedidoId },
          estado: { in: ["EM_ABERTO", "PAGO_PARCIAL"] },
        },
        select: {
          total: true,
          pagamentos: { select: { valor: true } },
        },
      });
      const emAbertoOutros = outros.reduce(
        (acc, p) => acc.add(saldoEmAbertoPedido(p)),
        new Prisma.Decimal(0),
      );
      if (emAbertoOutros.add(input.totalDestePedido).gt(cliente.creditLimit)) {
        throw new Error(
          "Operação não autorizada: limite de crédito do cliente excedido.",
        );
      }
    }
  }

  if (input.corretorId) {
    const corretor = await tx.corretor.findFirst({
      where: { id: input.corretorId, tenantId },
      select: { isBlocked: true, creditLimitConsignado: true },
    });
    if (!corretor) throw new Error("Corretor inválido.");
    if (corretor.isBlocked) {
      throw new Error("Operação não autorizada: corretor bloqueado.");
    }
    if (corretor.creditLimitConsignado != null) {
      const outros = await tx.pedido.findMany({
        where: {
          tenantId,
          storeId,
          corretorId: input.corretorId,
          id: { not: pedidoId },
          estado: { in: ["EM_ABERTO", "PAGO_PARCIAL"] },
        },
        select: {
          total: true,
          pagamentos: { select: { valor: true } },
        },
      });
      const emAbertoOutros = outros.reduce(
        (acc, p) => acc.add(saldoEmAbertoPedido(p)),
        new Prisma.Decimal(0),
      );
      if (
        emAbertoOutros.add(input.totalDestePedido).gt(corretor.creditLimitConsignado)
      ) {
        throw new Error(
          "Operação não autorizada: limite de crédito consignado do corretor excedido.",
        );
      }
    }
  }
}

export async function pdvCreateDraft(input: {
  storeId: string;
  /** Opcional no rascunho; obrigatório antes de finalizar. */
  clienteId: string | null;
  vendedorId: string;
  corretorId: string | null;
}): Promise<PdvCreateResult> {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const tenantId = session.user.tenantId;
  try {
    assertStoreInSession(session, input.storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  const clienteId = input.clienteId?.trim() ? input.clienteId.trim() : null;

  try {
    await validateClienteSeInformado(tenantId, input.storeId, clienteId);
    await validateVendedorECorretor(
      tenantId,
      input.storeId,
      input.vendedorId,
      input.corretorId,
    );
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Validação falhou." };
  }

  try {
    const pedido = await prisma.$transaction(async (tx) => {
      const last = await tx.pedido.findFirst({
        where: { storeId: input.storeId },
        orderBy: { numero: "desc" },
        select: { numero: true },
      });
      const numero = (last?.numero ?? 0) + 1;

      return tx.pedido.create({
        data: {
          tenantId,
          storeId: input.storeId,
          numero,
          clienteId,
          vendedorId: input.vendedorId,
          corretorId: input.corretorId || null,
          estado: "EM_ANDAMENTO",
          modalidade: "DIRETA",
          total: null,
        },
        select: { id: true },
      });
    });

    revalidateVendas();
    return { ok: true, pedidoId: pedido.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível criar o pedido." };
  }
}

export async function pdvSavePedido(input: {
  storeId: string;
  pedidoId: string;
  clienteId: string | null;
  vendedorId: string;
  corretorId: string | null;
  itens: { produtoVariacaoId: string; quantidade: number; precoUnitario: string }[];
}): Promise<PdvActionOk | PdvActionErr> {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const tenantId = session.user.tenantId;
  try {
    assertStoreInSession(session, input.storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  const clienteId = input.clienteId?.trim() ? input.clienteId.trim() : null;

  try {
    await validateClienteSeInformado(tenantId, input.storeId, clienteId);
    await validateVendedorECorretor(
      tenantId,
      input.storeId,
      input.vendedorId,
      input.corretorId,
    );
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Validação falhou." };
  }

  for (const it of input.itens) {
    if (!Number.isInteger(it.quantidade) || it.quantidade <= 0) {
      return { error: "Cada item precisa de quantidade inteira positiva." };
    }
    try {
      parsePreco(it.precoUnitario);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Preço inválido." };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await assertPedidoEmAndamento(tx, tenantId, input.storeId, input.pedidoId);

      await tx.pedidoItem.deleteMany({ where: { pedidoId: input.pedidoId } });

      if (input.itens.length > 0) {
        await tx.pedidoItem.createMany({
          data: input.itens.map((it) => ({
            pedidoId: input.pedidoId,
            produtoVariacaoId: it.produtoVariacaoId,
            quantidade: it.quantidade,
            precoUnitario: parsePreco(it.precoUnitario),
          })),
        });
      }

      let total: Prisma.Decimal | null = null;
      if (input.itens.length > 0) {
        total = input.itens.reduce(
          (acc, it) => acc.add(parsePreco(it.precoUnitario).mul(it.quantidade)),
          new Prisma.Decimal(0),
        );
      }

      await tx.pedido.update({
        where: { id: input.pedidoId },
        data: {
          clienteId,
          vendedorId: input.vendedorId,
          corretorId: input.corretorId || null,
          modalidade: "DIRETA",
          total,
        },
      });
    });

    revalidateVendas();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível guardar o pedido." };
  }
}

export async function pdvFinalizarPedido(input: {
  storeId: string;
  pedidoId: string;
}): Promise<PdvActionOk | PdvActionErr> {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const tenantId = session.user.tenantId;
  const userId = session.user.id;
  try {
    assertStoreInSession(session, input.storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findFirst({
        where: {
          id: input.pedidoId,
          tenantId,
          storeId: input.storeId,
          estado: "EM_ANDAMENTO",
        },
        include: {
          itens: true,
        },
      });

      if (!pedido) {
        throw new Error("Pedido não encontrado ou já finalizado.");
      }

      if (!pedido.clienteId) {
        throw new Error("Selecione um comprador antes de finalizar a venda.");
      }

      if (pedido.itens.length === 0) {
        throw new Error("Inclua pelo menos um item para finalizar.");
      }

      for (const it of pedido.itens) {
        const saldo = await tx.estoqueSaldo.findUnique({
          where: {
            storeId_produtoVariacaoId: {
              storeId: input.storeId,
              produtoVariacaoId: it.produtoVariacaoId,
            },
          },
          select: { quantidade: true },
        });
        const disp = saldo?.quantidade ?? 0;
        if (disp < it.quantidade) {
          throw new Error(
            "Saldo insuficiente para um ou mais itens. Ajuste quantidades ou o stock.",
          );
        }
      }

      const linhas = pedido.itens.map((it) => ({
        storeId: input.storeId,
        produtoVariacaoId: it.produtoVariacaoId,
        delta: -it.quantidade,
        tipo: "VENDA" as const,
        motivo: `Pedido nº ${pedido.numero} (${pedido.id})`,
        loteTransferenciaId: null,
      }));

      await registrarMovimentosEstoqueInTransaction(tx, {
        tenantId,
        userId,
        linhas,
      });

      const total = pedido.itens.reduce(
        (acc, it) => acc.add(it.precoUnitario.mul(it.quantidade)),
        new Prisma.Decimal(0),
      );

      await assertCreditoParaFinalizar(tx, tenantId, input.storeId, pedido.id, {
        clienteId: pedido.clienteId,
        corretorId: pedido.corretorId,
        totalDestePedido: total,
      });

      await tx.pedido.update({
        where: { id: pedido.id },
        data: {
          estado: "EM_ABERTO",
          total,
        },
      });
    });

    revalidateVendas();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível finalizar." };
  }
}

/**
 * Regista entrega física: com saldo em aberto, passa a consignado e gera dívida do corretor.
 */
export async function pdvEntregarPedido(input: {
  storeId: string;
  pedidoId: string;
}): Promise<PdvActionOk | PdvActionErr> {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const tenantId = session.user.tenantId;
  const entreguePorId = session.user.colaboradorId ?? null;
  try {
    assertStoreInSession(session, input.storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findFirst({
        where: {
          id: input.pedidoId,
          tenantId,
          storeId: input.storeId,
          estado: { in: ["EM_ABERTO", "PAGO_PARCIAL"] },
          entregueEm: null,
        },
        include: { pagamentos: true },
      });

      if (!pedido) {
        throw new Error(
          "Pedido não encontrado, já quitado/cancelado ou entrega já registada.",
        );
      }

      if (!pedido.total) {
        throw new Error("Pedido sem total.");
      }

      const totalPago = pedido.pagamentos.reduce(
        (acc, p) => acc.add(p.valor),
        new Prisma.Decimal(0),
      );
      const saldo = pedido.total.sub(totalPago);
      if (saldo.lt(new Prisma.Decimal(0))) {
        throw new Error("Inconsistência: total pago superior ao pedido.");
      }

      const saldoAberto = saldo.gt(new Prisma.Decimal("0.005"));
      if (saldoAberto && !pedido.corretorId) {
        throw new Error(
          "Para registar entrega com saldo em aberto, o pedido precisa de um corretor.",
        );
      }

      await tx.pedido.update({
        where: { id: pedido.id },
        data: {
          entregueEm: new Date(),
          entreguePorId,
          ...(saldoAberto ? { modalidade: "CONSIGNADA" } : {}),
        },
      });

      if (saldoAberto) {
        const dup = await tx.movimentoCorretor.findUnique({
          where: { pedidoId: pedido.id },
        });
        if (dup) {
          throw new Error("Já existe movimento de corretor para este pedido.");
        }
        await tx.movimentoCorretor.create({
          data: {
            tenantId,
            corretorId: pedido.corretorId!,
            pedidoId: pedido.id,
            valor: saldo,
          },
        });
      }
    });

    revalidateVendas();
    return { ok: true };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Não foi possível registar a entrega.",
    };
  }
}

/** Total do pedido, valor pago e linhas de pagamento (passo Receber após finalizar). */
export async function pdvGetResumoPagamentoPedido(input: {
  storeId: string;
  pedidoId: string;
}): Promise<
  | {
      ok: true;
      totalPedido: number;
      totalPago: number;
      pagamentos: Array<{ id: string; forma: FormaPagamento; valor: number }>;
    }
  | PdvActionErr
> {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const tenantId = session.user.tenantId;
  try {
    assertStoreInSession(session, input.storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  const pedido = await prisma.pedido.findFirst({
    where: {
      id: input.pedidoId,
      tenantId,
      storeId: input.storeId,
    },
    include: {
      pagamentos: {
        select: { id: true, forma: true, valor: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!pedido) {
    return { error: "Pedido não encontrado." };
  }
  if (!pedido.total) {
    return { error: "Pedido sem total." };
  }

  const totalPago = pedido.pagamentos.reduce(
    (acc, p) => acc.add(p.valor),
    new Prisma.Decimal(0),
  );

  return {
    ok: true,
    totalPedido: pedido.total.toNumber(),
    totalPago: totalPago.toNumber(),
    pagamentos: pedido.pagamentos.map((p) => ({
      id: p.id,
      forma: p.forma,
      valor: p.valor.toNumber(),
    })),
  };
}

export type PdvPedidoCarregado = {
  pedidoId: string;
  clienteId: string | null;
  clienteNomeExibicao: string;
  vendedorId: string;
  corretorId: string | null;
  lines: {
    produtoVariacaoId: string;
    label: string;
    quantidade: number;
    precoUnitario: string;
    saldoRef: number;
  }[];
};

/** Carrega um pedido em andamento para continuar no PDV (edição). */
export async function pdvGetPedidoParaPdv(input: {
  storeId: string;
  pedidoId: string;
}): Promise<{ ok: true; data: PdvPedidoCarregado } | PdvActionErr> {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const tenantId = session.user.tenantId;
  try {
    assertStoreInSession(session, input.storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  const pedido = await prisma.pedido.findFirst({
    where: {
      id: input.pedidoId,
      tenantId,
      storeId: input.storeId,
      estado: "EM_ANDAMENTO",
    },
    include: {
      cliente: {
        select: {
          tipo: true,
          nome: true,
          fantasia: true,
          razaoSocial: true,
        },
      },
      itens: {
        include: {
          produtoVariacao: {
            select: {
              id: true,
              nome: true,
              produto: { select: { nome: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!pedido) {
    return { error: "Pedido não encontrado ou já finalizado." };
  }

  const ids = pedido.itens.map((i) => i.produtoVariacaoId);
  const saldos =
    ids.length === 0
      ? []
      : await prisma.estoqueSaldo.findMany({
          where: {
            storeId: input.storeId,
            produtoVariacaoId: { in: ids },
          },
          select: { produtoVariacaoId: true, quantidade: true },
        });
  const saldoMap = new Map(saldos.map((s) => [s.produtoVariacaoId, s.quantidade]));

  const clienteNomeExibicao = pedido.cliente
    ? clienteNomeCurto(pedido.cliente)
    : "";

  const lines = pedido.itens.map((it) => ({
    produtoVariacaoId: it.produtoVariacaoId,
    label: `${it.produtoVariacao.produto.nome} — ${it.produtoVariacao.nome}`,
    quantidade: it.quantidade,
    precoUnitario: it.precoUnitario.toFixed(2),
    saldoRef: saldoMap.get(it.produtoVariacaoId) ?? 0,
  }));

  return {
    ok: true,
    data: {
      pedidoId: pedido.id,
      clienteId: pedido.clienteId,
      clienteNomeExibicao,
      vendedorId: pedido.vendedorId,
      corretorId: pedido.corretorId,
      lines,
    },
  };
}

export async function pdvExcluirPedido(input: {
  storeId: string;
  pedidoId: string;
}): Promise<PdvActionOk | PdvActionErr> {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const tenantId = session.user.tenantId;
  try {
    assertStoreInSession(session, input.storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  try {
    const del = await prisma.pedido.deleteMany({
      where: {
        id: input.pedidoId,
        tenantId,
        storeId: input.storeId,
        estado: "EM_ANDAMENTO",
      },
    });
    if (del.count === 0) {
      return { error: "Pedido não encontrado ou já não está em andamento." };
    }
    revalidateVendas();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível excluir." };
  }
}

export type PdvSearchRow = {
  id: string;
  nome: string;
  ean13: string | null;
  produtoNome: string;
  referencia: string | null;
  precoSugerido: string | null;
  saldo: number;
};

const PDV_PAGE_SIZE_MAX = 48;
const PDV_PAGE_SIZE_DEFAULT = 12;

const variacaoPdvSelect = {
  id: true,
  nome: true,
  ean13: true,
  produto: {
    select: {
      nome: true,
      referencia: true,
      precoVenda: true,
    },
  },
} as const;

async function variacoesToPdvRows(
  storeId: string,
  variacoes: {
    id: string;
    nome: string;
    ean13: string | null;
    produto: {
      nome: string;
      referencia: string | null;
      precoVenda: Prisma.Decimal | null;
    };
  }[],
): Promise<PdvSearchRow[]> {
  if (variacoes.length === 0) return [];
  const ids = variacoes.map((v) => v.id);
  const saldos = await prisma.estoqueSaldo.findMany({
    where: { storeId, produtoVariacaoId: { in: ids } },
    select: { produtoVariacaoId: true, quantidade: true },
  });
  const saldoMap = new Map(saldos.map((s) => [s.produtoVariacaoId, s.quantidade]));

  return variacoes.map((v) => ({
    id: v.id,
    nome: v.nome,
    ean13: v.ean13,
    produtoNome: v.produto.nome,
    referencia: v.produto.referencia,
    precoSugerido: v.produto.precoVenda
      ? v.produto.precoVenda.toFixed(2)
      : null,
    saldo: saldoMap.get(v.id) ?? 0,
  }));
}

/**
 * Lista produtos para o PDV: sem texto (ou &lt; 2 chars) devolve catálogo ordenado com paginação;
 * com texto filtra e também pagina. `pageSize` mínimo 10.
 */
export async function pdvSearchVariacoes(input: {
  storeId: string;
  query: string;
  skip?: number;
  pageSize?: number;
}): Promise<{ rows: PdvSearchRow[]; hasMore: boolean } | PdvActionErr> {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const tenantId = session.user.tenantId;
  try {
    assertStoreInSession(session, input.storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  const skip = Math.max(0, input.skip ?? 0);
  const pageSize = Math.min(
    PDV_PAGE_SIZE_MAX,
    Math.max(10, input.pageSize ?? PDV_PAGE_SIZE_DEFAULT),
  );
  const take = pageSize + 1;

  const q = input.query.trim();

  if (q.length < 2) {
    const variacoes = await prisma.produtoVariacao.findMany({
      where: {
        tenantId,
        produto: { isActive: true },
      },
      skip,
      take,
      orderBy: [{ produto: { nome: "asc" } }, { nome: "asc" }],
      select: variacaoPdvSelect,
    });
    const hasMore = variacoes.length > pageSize;
    const slice = variacoes.slice(0, pageSize);
    const rows = await variacoesToPdvRows(input.storeId, slice);
    return { rows, hasMore };
  }

  const digits = q.replace(/\D/g, "");
  const or: Prisma.ProdutoVariacaoWhereInput[] = [
    { nome: { contains: q, mode: "insensitive" } },
    { produto: { nome: { contains: q, mode: "insensitive" } } },
  ];
  if (digits.length >= 3) {
    or.push({ ean13: { contains: digits } });
  }
  or.push({ produto: { referencia: { contains: q, mode: "insensitive" } } });

  const variacoes = await prisma.produtoVariacao.findMany({
    where: {
      tenantId,
      produto: { isActive: true },
      OR: or,
    },
    skip,
    take,
    orderBy: { nome: "asc" },
    select: variacaoPdvSelect,
  });

  const hasMore = variacoes.length > pageSize;
  const slice = variacoes.slice(0, pageSize);
  const rows = await variacoesToPdvRows(input.storeId, slice);
  return { rows, hasMore };
}

export async function pdvResolverEan(input: {
  storeId: string;
  eanRaw: string;
}): Promise<
  | { found: true; row: PdvSearchRow }
  | { found: false }
  | PdvActionErr
> {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const tenantId = session.user.tenantId;
  try {
    assertStoreInSession(session, input.storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  const id = await findVariacaoIdByEan13(tenantId, input.eanRaw);
  if (!id) return { found: false };

  const v = await prisma.produtoVariacao.findFirst({
    where: { id, tenantId, produto: { isActive: true } },
    select: {
      id: true,
      nome: true,
      ean13: true,
      produto: {
        select: {
          nome: true,
          referencia: true,
          precoVenda: true,
        },
      },
    },
  });
  if (!v) return { found: false };

  const saldoRow = await prisma.estoqueSaldo.findUnique({
    where: {
      storeId_produtoVariacaoId: {
        storeId: input.storeId,
        produtoVariacaoId: v.id,
      },
    },
    select: { quantidade: true },
  });

  const row: PdvSearchRow = {
    id: v.id,
    nome: v.nome,
    ean13: v.ean13,
    produtoNome: v.produto.nome,
    referencia: v.produto.referencia,
    precoSugerido: v.produto.precoVenda ? v.produto.precoVenda.toFixed(2) : null,
    saldo: saldoRow?.quantidade ?? 0,
  };

  return { found: true, row };
}
