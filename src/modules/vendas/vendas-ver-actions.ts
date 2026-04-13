"use server";

import type {
  ClienteTipo,
  FormaPagamento,
  PedidoEstado,
  PedidoModalidade,
} from "@prisma/client";
import { requireRole } from "@/lib/authorization";
import { getActiveStoreContext } from "@/lib/session";
import { ROLES_ACESSO_VENDAS } from "@/modules/vendas/lib/roles";
import { getPedidoDetalhe } from "@/modules/vendas/vendas-queries";

export type PedidoVerPayload = {
  id: string;
  numero: number;
  estado: PedidoEstado;
  modalidade: PedidoModalidade;
  createdAt: string;
  total: number | null;
  cliente: {
    id: string;
    tipo: ClienteTipo;
    nome: string | null;
    fantasia: string | null;
    razaoSocial: string | null;
  } | null;
  vendedor: { id: string; name: string };
  corretor: { id: string; name: string } | null;
  itens: Array<{
    id: string;
    quantidade: number;
    precoUnitario: number;
    produtoVariacao: {
      nome: string;
      ean13: string | null;
      produto: { nome: string; referencia: string | null };
    };
  }>;
  pagamentos: Array<{
    id: string;
    createdAt: string;
    forma: FormaPagamento;
    obs: string | null;
    valor: number;
  }>;
};

function toPayload(
  p: NonNullable<Awaited<ReturnType<typeof getPedidoDetalhe>>>,
): PedidoVerPayload {
  return {
    id: p.id,
    numero: p.numero,
    estado: p.estado,
    modalidade: p.modalidade,
    createdAt: p.createdAt.toISOString(),
    total: p.total != null ? Number(p.total) : null,
    cliente: p.cliente
      ? {
          id: p.cliente.id,
          tipo: p.cliente.tipo,
          nome: p.cliente.nome,
          fantasia: p.cliente.fantasia,
          razaoSocial: p.cliente.razaoSocial,
        }
      : null,
    vendedor: p.vendedor,
    corretor: p.corretor,
    itens: p.itens.map((it) => ({
      id: it.id,
      quantidade: it.quantidade,
      precoUnitario: Number(it.precoUnitario),
      produtoVariacao: {
        nome: it.produtoVariacao.nome,
        ean13: it.produtoVariacao.ean13,
        produto: {
          nome: it.produtoVariacao.produto.nome,
          referencia: it.produtoVariacao.produto.referencia,
        },
      },
    })),
    pagamentos: p.pagamentos.map((pay) => ({
      id: pay.id,
      createdAt: pay.createdAt.toISOString(),
      forma: pay.forma,
      obs: pay.obs,
      valor: Number(pay.valor),
    })),
  };
}

export async function fetchPedidoParaVerModal(
  pedidoId: string,
): Promise<
  | { ok: true; storeId: string; storeName: string; pedido: PedidoVerPayload }
  | { ok: false; error: string }
> {
  await requireRole(ROLES_ACESSO_VENDAS);
  const { activeStore } = await getActiveStoreContext();
  if (!activeStore) {
    return { ok: false, error: "Loja não encontrada." };
  }

  const pedido = await getPedidoDetalhe(
    activeStore.tenantId,
    activeStore.id,
    pedidoId,
  );
  if (!pedido) {
    return { ok: false, error: "Pedido não encontrado." };
  }

  return {
    ok: true,
    storeId: activeStore.id,
    storeName: activeStore.name,
    pedido: toPayload(pedido),
  };
}
