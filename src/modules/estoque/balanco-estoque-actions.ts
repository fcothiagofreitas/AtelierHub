"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { assertStoreInSession } from "@/modules/estoque/estoque-auth";
import { registrarMovimentosEstoqueInTransaction } from "@/modules/estoque/estoque-service";
import { ESTOQUE_ROLES_ESCRITA } from "@/modules/estoque/estoque-roles";

export type BalancoActionErr = { error: string };

function revalidateBalanco(balancoId?: string) {
  revalidatePath("/admin/estoque");
  revalidatePath("/admin/estoque/balanco");
  if (balancoId) {
    revalidatePath(`/admin/estoque/balanco/${balancoId}`);
  }
}

function labelSku(p: {
  produto: { nome: string; referencia: string | null };
  corCatalogo: { nome: string } | null;
  opcaoTamanho: { nome: string } | null;
}): string {
  const bits = [p.produto.nome, p.corCatalogo?.nome, p.opcaoTamanho?.nome].filter(Boolean);
  return bits.join(" · ");
}

export type CriarBalancoOk = { ok: true; id: string };

/**
 * Cria rascunho de balanço (o cliente pode redirecionar para o detalhe).
 */
export async function criarBalancoEstoque(
  _prev: CriarBalancoOk | BalancoActionErr | null,
  formData: FormData,
): Promise<CriarBalancoOk | BalancoActionErr> {
  const session = await requireRole(ESTOQUE_ROLES_ESCRITA);
  const tenantId = session.user.tenantId;
  const storeId = String(formData.get("storeId") || "").trim();
  const observacoes = String(formData.get("observacoes") || "").trim() || null;

  try {
    assertStoreInSession(session, storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  const last = await prisma.balancoEstoque.findFirst({
    where: { storeId },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  const numero = (last?.numero ?? 0) + 1;

  const b = await prisma.balancoEstoque.create({
    data: {
      tenantId,
      storeId,
      numero,
      estado: "RASCUNHO",
      observacoes,
      criadoPorId: session.user.colaboradorId ?? null,
    },
    select: { id: true },
  });

  revalidateBalanco();
  return { ok: true, id: b.id };
}

/**
 * Importa linhas a partir de `EstoqueSaldo` da loja do documento.
 */
export async function importarItensBalancoEstoque(
  formData: FormData,
): Promise<{ ok: true } | BalancoActionErr> {
  const session = await requireRole(ESTOQUE_ROLES_ESCRITA);
  const tenantId = session.user.tenantId;
  const balancoId = String(formData.get("balancoId") || "").trim();
  const apenasSaldoPositivo = formData.get("apenasSaldoPositivo") === "on";

  if (!balancoId) {
    return { error: "Documento inválido." };
  }

  try {
    const balanco = await prisma.balancoEstoque.findFirst({
      where: { id: balancoId, tenantId },
      select: { id: true, storeId: true, estado: true },
    });
    if (!balanco || balanco.estado !== "RASCUNHO") {
      return { error: "Balanço não encontrado ou já fechado." };
    }
    assertStoreInSession(session, balanco.storeId);

    const saldos = await prisma.estoqueSaldo.findMany({
      where: {
        tenantId,
        storeId: balanco.storeId,
        ...(apenasSaldoPositivo ? { quantidade: { gt: 0 } } : {}),
      },
      select: { produtoVariacaoId: true, quantidade: true },
    });

    if (saldos.length === 0) {
      return { error: "Não há linhas de saldo para importar com estes critérios." };
    }

    await prisma.balancoEstoqueItem.createMany({
      data: saldos.map((s) => ({
        balancoId: balanco.id,
        produtoVariacaoId: s.produtoVariacaoId,
        saldoSnapshot: s.quantidade,
      })),
      skipDuplicates: true,
    });

    revalidateBalanco(balanco.id);
    return { ok: true };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Não foi possível importar as linhas.",
    };
  }
}

/**
 * Grava contagens (inteiros ≥ 0) para linhas em rascunho.
 */
export async function gravarContagensBalancoEstoque(
  formData: FormData,
): Promise<{ ok: true } | BalancoActionErr> {
  const session = await requireRole(ESTOQUE_ROLES_ESCRITA);
  const tenantId = session.user.tenantId;
  const balancoId = String(formData.get("balancoId") || "").trim();

  if (!balancoId) {
    return { error: "Documento inválido." };
  }

  try {
    const balanco = await prisma.balancoEstoque.findFirst({
      where: { id: balancoId, tenantId },
      include: { itens: { select: { id: true } } },
    });
    if (!balanco || balanco.estado !== "RASCUNHO") {
      return { error: "Balanço não encontrado ou já fechado." };
    }
    assertStoreInSession(session, balanco.storeId);

    const updates: { id: string; quantidadeContada: number | null }[] = [];
    for (const it of balanco.itens) {
      const raw = formData.get(`q_${it.id}`);
      if (raw === null || String(raw).trim() === "") {
        updates.push({ id: it.id, quantidadeContada: null });
        continue;
      }
      const n = Number.parseInt(String(raw), 10);
      if (!Number.isFinite(n) || n < 0) {
        return { error: "Todas as contagens devem ser inteiros ≥ 0 ou vazio." };
      }
      updates.push({ id: it.id, quantidadeContada: n });
    }

    await prisma.$transaction(
      updates.map((u) =>
        prisma.balancoEstoqueItem.update({
          where: { id: u.id },
          data: { quantidadeContada: u.quantidadeContada },
        }),
      ),
    );

    revalidateBalanco(balanco.id);
    return { ok: true };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Não foi possível gravar as contagens.",
    };
  }
}

/**
 * Conclui o balanço: ajusta stock para igualar à contagem (saldo atual → quantidade contada).
 */
export async function concluirBalancoEstoque(
  formData: FormData,
): Promise<{ ok: true } | BalancoActionErr> {
  const session = await requireRole(ESTOQUE_ROLES_ESCRITA);
  const tenantId = session.user.tenantId;
  const userId = session.user.id;
  const balancoId = String(formData.get("balancoId") || "").trim();

  if (!balancoId) {
    return { error: "Documento inválido." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const balanco = await tx.balancoEstoque.findFirst({
        where: { id: balancoId, tenantId },
        include: {
          itens: {
            include: {
              produtoVariacao: {
                select: {
                  produto: { select: { nome: true, referencia: true } },
                  corCatalogo: { select: { nome: true } },
                  opcaoTamanho: { select: { nome: true } },
                },
              },
            },
          },
        },
      });

      if (!balanco || balanco.estado !== "RASCUNHO") {
        throw new Error("Balanço não encontrado ou já fechado.");
      }
      assertStoreInSession(session, balanco.storeId);

      if (balanco.itens.length === 0) {
        throw new Error("Importe linhas antes de concluir.");
      }

      for (const it of balanco.itens) {
        if (it.quantidadeContada === null) {
          throw new Error(
            `Preencha a contagem em todas as linhas (falta: ${labelSku(it.produtoVariacao)}).`,
          );
        }
      }

      const linhasMov: {
        storeId: string;
        produtoVariacaoId: string;
        delta: number;
        tipo: "AJUSTE_CONFERENCIA";
        motivo: string;
      }[] = [];

      const motivoBase = `Balanço #${balanco.numero}`;

      for (const it of balanco.itens) {
        const contada = it.quantidadeContada!;
        const saldoRow = await tx.estoqueSaldo.findUnique({
          where: {
            storeId_produtoVariacaoId: {
              storeId: balanco.storeId,
              produtoVariacaoId: it.produtoVariacaoId,
            },
          },
          select: { quantidade: true },
        });
        const saldoAtual = saldoRow?.quantidade ?? 0;
        const delta = contada - saldoAtual;

        await tx.balancoEstoqueItem.update({
          where: { id: it.id },
          data: {
            saldoNoFecho: saldoAtual,
            deltaAplicado: delta,
          },
        });

        if (delta !== 0) {
          linhasMov.push({
            storeId: balanco.storeId,
            produtoVariacaoId: it.produtoVariacaoId,
            delta,
            tipo: "AJUSTE_CONFERENCIA",
            motivo: motivoBase,
          });
        }
      }

      if (linhasMov.length > 0) {
        await registrarMovimentosEstoqueInTransaction(tx, {
          tenantId,
          userId,
          linhas: linhasMov,
        });
      }

      await tx.balancoEstoque.update({
        where: { id: balanco.id },
        data: {
          estado: "CONCLUIDO",
          concluidoEm: new Date(),
        },
      });
    });

    revalidateBalanco(balancoId);
    return { ok: true };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Não foi possível concluir o balanço.",
    };
  }
}

export async function cancelarBalancoEstoque(
  formData: FormData,
): Promise<{ ok: true } | BalancoActionErr> {
  const session = await requireRole(ESTOQUE_ROLES_ESCRITA);
  const tenantId = session.user.tenantId;
  const balancoId = String(formData.get("balancoId") || "").trim();

  if (!balancoId) {
    return { error: "Documento inválido." };
  }

  try {
    const balanco = await prisma.balancoEstoque.findFirst({
      where: { id: balancoId, tenantId },
      select: { id: true, storeId: true, estado: true },
    });
    if (!balanco || balanco.estado !== "RASCUNHO") {
      return { error: "Apenas rascunhos podem ser cancelados." };
    }
    assertStoreInSession(session, balanco.storeId);

    await prisma.balancoEstoque.update({
      where: { id: balanco.id },
      data: { estado: "CANCELADO" },
    });

    revalidateBalanco(balanco.id);
    return { ok: true };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Não foi possível cancelar.",
    };
  }
}
