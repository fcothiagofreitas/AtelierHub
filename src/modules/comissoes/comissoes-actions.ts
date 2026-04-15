"use server";

import { ComissaoTipo } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { gerarLancamentosComissaoPedidoQuitado } from "@/modules/comissoes/gerar-lancamentos-comissao";

const ALLOWED: ["ADMIN_DA_MARCA", "ADMINISTRATIVO"] = [
  "ADMIN_DA_MARCA",
  "ADMINISTRATIVO",
];

const schema = z.object({
  percentualComissaoVendedorPadrao: z.coerce
    .number()
    .min(0, "Mínimo 0")
    .max(100, "Máximo 100"),
});

export type ComissaoConfigActionResult = {
  ok?: true;
  error?: string;
};

export async function atualizarComissaoVendedorPadrao(
  _prev: ComissaoConfigActionResult | null,
  formData: FormData,
): Promise<ComissaoConfigActionResult> {
  const session = await requireRole(ALLOWED);
  const parsed = schema.safeParse({
    percentualComissaoVendedorPadrao: formData.get("percentualComissaoVendedorPadrao"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors[0] ?? "Dados inválidos." };
  }

  await prisma.tenant.update({
    where: { id: session.user.tenantId },
    data: {
      percentualComissaoVendedorPadrao: parsed.data.percentualComissaoVendedorPadrao,
    },
  });

  revalidatePath("/admin/comissoes");
  revalidatePath("/admin/comissoes/parametros");
  return { ok: true };
}

/**
 * Percorre pedidos quitados sem lançamento de comissão de vendedor e tenta criar
 * (útil após configurar % no colaborador ou padrão da marca).
 */
export async function completarComissoesVendedorEmPedidosQuitados(): Promise<
  { ok: true; pedidosAtualizados: number } | { error: string }
> {
  const session = await requireRole(ALLOWED);
  const tenantId = session.user.tenantId;

  const pedidos = await prisma.pedido.findMany({
    where: {
      tenantId,
      estado: "QUITADO",
      total: { not: null },
    },
    select: { id: true },
  });

  let pedidosAtualizados = 0;

  for (const p of pedidos) {
    const temV = await prisma.lancamentoComissao.findFirst({
      where: { pedidoId: p.id, tipo: ComissaoTipo.VENDEDOR },
      select: { id: true },
    });
    if (temV) continue;

    await prisma.$transaction((tx) =>
      gerarLancamentosComissaoPedidoQuitado(tx, p.id),
    );

    const criou = await prisma.lancamentoComissao.findFirst({
      where: { pedidoId: p.id, tipo: ComissaoTipo.VENDEDOR },
      select: { id: true },
    });
    if (criou) pedidosAtualizados += 1;
  }

  revalidatePath("/admin/comissoes");
  revalidatePath("/admin/comissoes/parametros");
  return { ok: true, pedidosAtualizados };
}
