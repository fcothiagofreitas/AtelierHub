import type { BalancoEstoqueEstado } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { assertStoreInSession } from "@/modules/estoque/estoque-auth";
import { ESTOQUE_ROLES_LEITURA } from "@/modules/estoque/estoque-roles";

export type BalancoListaRow = {
  id: string;
  numero: number;
  estado: BalancoEstoqueEstado;
  createdAt: Date;
  concluidoEm: Date | null;
  storeName: string;
  linhas: number;
};

export async function listBalancosEstoqueForStore(
  tenantId: string,
  storeId: string,
  take = 100,
): Promise<BalancoListaRow[]> {
  const rows = await prisma.balancoEstoque.findMany({
    where: { tenantId, storeId },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      store: { select: { name: true } },
      _count: { select: { itens: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    numero: r.numero,
    estado: r.estado,
    createdAt: r.createdAt,
    concluidoEm: r.concluidoEm,
    storeName: r.store.name,
    linhas: r._count.itens,
  }));
}

export async function getBalancoEstoqueDetalhe(balancoId: string) {
  const session = await requireRole(ESTOQUE_ROLES_LEITURA);
  const tenantId = session.user.tenantId;

  const balanco = await prisma.balancoEstoque.findFirst({
    where: { id: balancoId, tenantId },
    include: {
      store: { select: { id: true, name: true } },
      criadoPor: { select: { name: true } },
      itens: {
        include: {
          produtoVariacao: {
            include: {
              produto: { select: { nome: true, referencia: true } },
              opcaoTamanho: { select: { nome: true } },
              corCatalogo: { select: { nome: true } },
            },
          },
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!balanco) {
    return { error: "Não encontrado." as const };
  }
  try {
    assertStoreInSession(session, balanco.storeId);
  } catch {
    return { error: "Sem permissão para esta loja." as const };
  }

  return { session, balanco };
}
