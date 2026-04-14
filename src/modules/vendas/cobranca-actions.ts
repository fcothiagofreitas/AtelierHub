"use server";

import type { FormaPagamento, GrupoCobrancaTipo } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { assertStoreInSession } from "@/modules/estoque/estoque-auth";
import type { LinhaRecebimento } from "@/modules/vendas/pagamento-actions";
import { ROLES_ACESSO_VENDAS } from "@/modules/vendas/lib/roles";
import { resolverDividaCorretorAoQuitarPedido } from "@/modules/vendas/lib/corretor-divida-quit";
import { garantirEntregaAoQuitarPedido } from "@/modules/vendas/lib/entrega-ao-quitar";

export type CobrancaActionOk = { ok: true; grupoId: string };
export type CobrancaActionErr = { error: string };

const FORMAS_VALIDAS: FormaPagamento[] = [
  "DINHEIRO",
  "CARTAO_DEBITO",
  "CARTAO_CREDITO",
  "PIX",
  "TRANSFERENCIA",
  "CHEQUE",
  "OUTROS",
];

function parseValor(s: string): Prisma.Decimal | null {
  const t = s.trim().replace(",", ".");
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return new Prisma.Decimal(t);
}

function decMin(a: Prisma.Decimal, b: Prisma.Decimal): Prisma.Decimal {
  return a.lt(b) ? a : b;
}

export async function criarGrupoCobranca(input: {
  storeId: string;
  tipo: GrupoCobrancaTipo;
  pedidoIds: string[];
}): Promise<CobrancaActionOk | CobrancaActionErr> {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const tenantId = session.user.tenantId;

  try {
    assertStoreInSession(session, input.storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  const ids = [...new Set(input.pedidoIds)].filter(Boolean);
  if (ids.length === 0) {
    return { error: "Seleccione pelo menos um pedido com saldo em aberto." };
  }

  try {
    const grupoId = await prisma.$transaction(async (tx) => {
      const pedidos = await tx.pedido.findMany({
        where: {
          id: { in: ids },
          tenantId,
          storeId: input.storeId,
          estado: { in: ["EM_ABERTO", "PAGO_PARCIAL"] },
        },
        orderBy: { numero: "asc" },
        include: { pagamentos: { select: { valor: true } } },
      });

      if (pedidos.length !== ids.length) {
        throw new Error(
          "Um ou mais pedidos não foram encontrados ou já não estão em aberto.",
        );
      }

      let clienteId: string | null = null;
      let corretorId: string | null = null;

      for (const p of pedidos) {
        if (!p.total) throw new Error("Pedido sem total calculado.");
        const ja = p.pagamentos.reduce(
          (a, x) => a.add(x.valor),
          new Prisma.Decimal(0),
        );
        const saldo = p.total.sub(ja);
        if (saldo.lte(0)) {
          throw new Error(`Pedido #${p.numero} não tem saldo em aberto.`);
        }

        if (input.tipo === "CLIENTE") {
          if (!p.clienteId) {
            throw new Error(
              `Pedido #${p.numero} não tem cliente; não pode entrar num grupo por cliente.`,
            );
          }
          if (clienteId === null) clienteId = p.clienteId;
          else if (clienteId !== p.clienteId) {
            throw new Error("Todos os pedidos devem ser do mesmo cliente.");
          }
        } else {
          if (!p.corretorId) {
            throw new Error(
              `Pedido #${p.numero} não tem corretor; não pode entrar num grupo por corretor.`,
            );
          }
          if (corretorId === null) corretorId = p.corretorId;
          else if (corretorId !== p.corretorId) {
            throw new Error("Todos os pedidos devem ser do mesmo corretor.");
          }
        }
      }

      const criado = await tx.grupoCobranca.create({
        data: {
          tenantId,
          storeId: input.storeId,
          tipo: input.tipo,
          clienteId: input.tipo === "CLIENTE" ? clienteId : null,
          corretorId: input.tipo === "CORRETOR" ? corretorId : null,
          criadoPorId: session.user.colaboradorId ?? null,
          itens: {
            create: pedidos.map((p, i) => ({
              pedidoId: p.id,
              ordem: i,
            })),
          },
        },
        select: { id: true },
      });

      return criado.id;
    });

    revalidatePath("/vendas/contas-receber");
    revalidatePath("/vendas/cobrancas");
    return { ok: true, grupoId };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Não foi possível criar o grupo.",
    };
  }
}

/**
 * Regista um ou mais meios de pagamento distribuindo o valor pelos pedidos do grupo
 * (FIFO conforme a ordem definida na criação do grupo).
 */
export async function registrarMultiPagamentoGrupo(input: {
  storeId: string;
  grupoId: string;
  linhas: LinhaRecebimento[];
}): Promise<{ ok: true } | CobrancaActionErr> {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const tenantId = session.user.tenantId;

  try {
    assertStoreInSession(session, input.storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  const linhasParsed = input.linhas
    .map((l) => ({
      forma: l.forma,
      valor: parseValor(l.valorRegistar),
    }))
    .filter((l): l is { forma: FormaPagamento; valor: Prisma.Decimal } =>
      l.valor !== null && l.valor.gt(0),
    );

  if (linhasParsed.length === 0) {
    return { error: "Informe pelo menos um valor para registar." };
  }

  for (const l of linhasParsed) {
    if (!FORMAS_VALIDAS.includes(l.forma)) {
      return { error: "Forma de pagamento inválida." };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const grupo = await tx.grupoCobranca.findFirst({
        where: {
          id: input.grupoId,
          tenantId,
          storeId: input.storeId,
        },
        include: {
          itens: {
            orderBy: [{ ordem: "asc" }, { id: "asc" }],
            include: {
              pedido: {
                include: { pagamentos: { select: { valor: true } } },
              },
            },
          },
        },
      });

      if (!grupo) throw new Error("Grupo de cobrança não encontrado.");
      if (grupo.itens.length === 0) throw new Error("Grupo sem pedidos.");

      const itensOrdenados = grupo.itens;
      const saldos = new Map<string, Prisma.Decimal>();

      for (const it of itensOrdenados) {
        const ped = it.pedido;
        if (!ped.total) throw new Error(`Pedido #${ped.numero} sem total.`);
        if (!["EM_ABERTO", "PAGO_PARCIAL"].includes(ped.estado)) {
          throw new Error(
            `Pedido #${ped.numero} não está mais em aberto; actualize a página.`,
          );
        }
        const ja = ped.pagamentos.reduce(
          (a, x) => a.add(x.valor),
          new Prisma.Decimal(0),
        );
        const saldo = ped.total.sub(ja);
        saldos.set(
          ped.id,
          saldo.gt(0) ? saldo : new Prisma.Decimal(0),
        );
      }

      const totalGrupoAberto = [...saldos.values()].reduce(
        (a, s) => a.add(s),
        new Prisma.Decimal(0),
      );

      const totalLinhas = linhasParsed.reduce(
        (a, l) => a.add(l.valor),
        new Prisma.Decimal(0),
      );

      if (totalLinhas.gt(totalGrupoAberto.add(new Prisma.Decimal("0.01")))) {
        throw new Error(
          `Total a registar (${totalLinhas.toFixed(2)}) supera o saldo do grupo (${totalGrupoAberto.toFixed(2)}).`,
        );
      }

      for (const linha of linhasParsed) {
        let restante = linha.valor;
        for (const it of itensOrdenados) {
          if (restante.lte(0)) break;
          const s = saldos.get(it.pedidoId);
          if (!s || s.lte(0)) continue;
          const chunk = decMin(restante, s);
          if (chunk.lte(0)) continue;

          await tx.pagamento.create({
            data: {
              tenantId,
              pedidoId: it.pedidoId,
              forma: linha.forma,
              valor: chunk,
              criadoPorId: session.user.colaboradorId ?? null,
              grupoCobrancaId: grupo.id,
            },
          });

          saldos.set(it.pedidoId, s.sub(chunk));
          restante = restante.sub(chunk);
        }

        if (restante.gt(new Prisma.Decimal("0.01"))) {
          throw new Error(
            `Não foi possível aplicar toda a linha (${linha.forma}): saldo insuficiente no grupo.`,
          );
        }
      }

      for (const it of itensOrdenados) {
        const ped = await tx.pedido.findUnique({
          where: { id: it.pedidoId },
          select: { id: true, total: true },
        });
        if (!ped?.total) continue;

        const agg = await tx.pagamento.aggregate({
          where: { pedidoId: ped.id },
          _sum: { valor: true },
        });
        const pago = agg._sum.valor ?? new Prisma.Decimal(0);
        const novoEstado = pago.gte(ped.total) ? "QUITADO" : "PAGO_PARCIAL";
        await tx.pedido.update({
          where: { id: ped.id },
          data: {
            estado: novoEstado,
            ...(novoEstado === "QUITADO" ? { modalidade: "DIRETA" } : {}),
          },
        });
        if (novoEstado === "QUITADO") {
          await resolverDividaCorretorAoQuitarPedido(tx, ped.id);
          await garantirEntregaAoQuitarPedido(tx, {
            pedidoId: ped.id,
            entreguePorId: session.user.colaboradorId ?? null,
          });
        }
      }
    });

    revalidatePath("/vendas");
    revalidatePath("/vendas/contas-receber");
    revalidatePath(`/vendas/cobrancas/${input.grupoId}`);
    return { ok: true };
  } catch (e) {
    return {
      error:
        e instanceof Error ? e.message : "Não foi possível registrar o pagamento.",
    };
  }
}

