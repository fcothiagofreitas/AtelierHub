import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { allowedStoreIdsFilter } from "@/modules/estoque/estoque-auth";
import { ESTOQUE_ROLES_LEITURA } from "@/modules/estoque/estoque-roles";

export async function getStoresForUserEstoque() {
  const session = await requireRole(ESTOQUE_ROLES_LEITURA as UserRole[]);
  const stores = await prisma.store.findMany({
    where: { tenantId: session.user.tenantId, isActive: true },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    select: { id: true, name: true, kind: true },
  });
  const ids = allowedStoreIdsFilter(
    session,
    stores.map((s) => s.id),
  );
  return {
    session,
    stores: stores.filter((s) => ids.includes(s.id)),
    defaultStoreId: session.user.defaultStoreId,
  };
}

export async function getSaldosEstoque(storeId: string) {
  const { session, stores } = await getStoresForUserEstoque();
  if (!stores.some((s) => s.id === storeId)) {
    return { session, rows: [], error: "Loja inválida ou sem permissão." as const };
  }

  const rows = await prisma.estoqueSaldo.findMany({
    where: {
      tenantId: session.user.tenantId,
      storeId,
    },
    include: {
      produtoVariacao: {
        include: {
          produto: { select: { nome: true, referencia: true } },
          opcaoTamanho: { select: { nome: true } },
          corCatalogo: { select: { nome: true } },
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 500,
  });

  return { session, rows, error: null };
}

export async function getHistoricoEstoque(input: {
  storeId?: string;
  produtoVariacaoId?: string;
  take?: number;
}) {
  const { session, stores } = await getStoresForUserEstoque();
  const take = input.take ?? 200;

  const allowedIds = stores.map((s) => s.id);
  if (input.storeId) {
    if (!allowedIds.includes(input.storeId)) {
      return { session, rows: [], stores, error: "Loja inválida." as const };
    }
  }

  const where = {
    tenantId: session.user.tenantId,
    storeId: input.storeId ? input.storeId : { in: allowedIds },
    ...(input.produtoVariacaoId ? { produtoVariacaoId: input.produtoVariacaoId } : {}),
  };

  const rows = await prisma.movimentoEstoque.findMany({
    where,
    include: {
      store: { select: { name: true } },
      produtoVariacao: {
        include: {
          produto: { select: { nome: true } },
        },
      },
      user: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  return { session, rows, stores, error: null };
}
