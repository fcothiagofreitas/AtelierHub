import type { Prisma } from "@prisma/client";

/**
 * Compra quitada implica entregue ao cliente. Se ainda não havia registo de entrega,
 * grava-a agora; se já existia `entregueEm`, não altera (não gera segunda data).
 */
export async function garantirEntregaAoQuitarPedido(
  tx: Prisma.TransactionClient,
  input: { pedidoId: string; entreguePorId: string | null },
): Promise<void> {
  const p = await tx.pedido.findUnique({
    where: { id: input.pedidoId },
    select: { entregueEm: true },
  });
  if (!p || p.entregueEm != null) return;
  await tx.pedido.update({
    where: { id: input.pedidoId },
    data: {
      entregueEm: new Date(),
      entreguePorId: input.entreguePorId,
    },
  });
}
