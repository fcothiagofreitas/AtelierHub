import type { Prisma } from "@prisma/client";

/**
 * Quando o pedido fica quitado, não há saldo em aberto: remove o registo de dívida
 * ao corretor (consignado) e normaliza a modalidade para direta — venda paga no balcão
 * não permanece como consignada no registo.
 */
export async function resolverDividaCorretorAoQuitarPedido(
  tx: Prisma.TransactionClient,
  pedidoId: string,
): Promise<void> {
  await tx.movimentoCorretor.deleteMany({ where: { pedidoId } });
}
