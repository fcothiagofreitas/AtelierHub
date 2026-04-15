import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertStoreInSession } from "@/modules/estoque/estoque-auth";
import { formasPagamentoLabels } from "@/modules/vendas/lib/labels";
import { clienteNomeCurto } from "@/modules/vendas/lib/cliente-nome";
import { buildReciboPedidoPdf } from "@/modules/vendas/lib/recibo-pdf";
import { ROLES_ACESSO_VENDAS } from "@/modules/vendas/lib/roles";

type RouteCtx = { params: Promise<{ pedidoId: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  if (!ROLES_ACESSO_VENDAS.includes(session.user.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const { pedidoId } = await ctx.params;

  const pedido = await prisma.pedido.findFirst({
    where: { id: pedidoId, tenantId: session.user.tenantId },
    include: {
      store: { select: { id: true, name: true } },
      tenant: { select: { name: true } },
      cliente: {
        select: {
          tipo: true,
          nome: true,
          fantasia: true,
          razaoSocial: true,
        },
      },
      pagamentos: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!pedido) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  try {
    assertStoreInSession(session, pedido.storeId);
  } catch {
    return NextResponse.json({ error: "Sem permissão para esta loja." }, { status: 403 });
  }

  if (pedido.pagamentos.length === 0) {
    return NextResponse.json(
      { error: "Não há pagamentos registados para emitir recibo." },
      { status: 400 },
    );
  }

  const totalPedido =
    pedido.total != null ? Number(pedido.total.toFixed(2)) : 0;
  const totalPago = pedido.pagamentos.reduce(
    (a, p) => a + Number(p.valor.toFixed(2)),
    0,
  );

  const clienteNome = pedido.cliente
    ? clienteNomeCurto(pedido.cliente)
    : "—";

  const pdfBytes = await buildReciboPedidoPdf({
    lojaNome: pedido.store.name,
    tenantNome: pedido.tenant.name,
    pedidoNumero: pedido.numero,
    clienteNome,
    criadoEm: pedido.createdAt,
    pagamentos: pedido.pagamentos.map((p) => ({
      data: p.createdAt,
      formaLabel: formasPagamentoLabels[p.forma],
      valor: Number(p.valor.toFixed(2)),
    })),
    totalPedido,
    totalPago,
  });

  const filename = `recibo-pedido-${pedido.numero}.pdf`;
  return new NextResponse(pdfBytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
