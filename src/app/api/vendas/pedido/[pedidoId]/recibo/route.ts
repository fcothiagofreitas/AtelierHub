import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertStoreInSession } from "@/modules/estoque/estoque-auth";
import {
  formasPagamentoLabels,
  pedidoEstadoLabels,
  pedidoModalidadeLabels,
} from "@/modules/vendas/lib/labels";
import { clienteNomeCurto } from "@/modules/vendas/lib/cliente-nome";
import {
  buildPedidoVendaPdf,
  clienteDocumentoReciboPdf,
} from "@/modules/vendas/lib/recibo-pdf";
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
      vendedor: { select: { name: true } },
      cliente: {
        select: {
          tipo: true,
          nome: true,
          fantasia: true,
          razaoSocial: true,
          cpf: true,
          cnpj: true,
          ie: true,
          ieIsento: true,
          endereco: true,
          telefone: true,
          email: true,
        },
      },
      itens: {
        include: {
          produtoVariacao: {
            include: {
              produto: {
                select: {
                  nome: true,
                  referencia: true,
                  unidadeTributavel: true,
                },
              },
            },
          },
        },
        orderBy: { id: "asc" },
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

  if (pedido.estado === "CANCELADO") {
    return NextResponse.json(
      { error: "Pedido cancelado: não é possível emitir PDF." },
      { status: 400 },
    );
  }

  if (pedido.estado === "EM_ANDAMENTO") {
    return NextResponse.json(
      { error: "Finalize o pedido antes de emitir o PDF." },
      { status: 400 },
    );
  }

  if (pedido.total == null || pedido.itens.length === 0) {
    return NextResponse.json(
      { error: "Pedido sem total ou sem itens para emitir PDF." },
      { status: 400 },
    );
  }

  const totalPedido = Number(pedido.total.toFixed(2));
  const totalPago = pedido.pagamentos.reduce(
    (a, p) => a + Number(p.valor.toFixed(2)),
    0,
  );

  const clienteNome = pedido.cliente
    ? clienteNomeCurto(pedido.cliente)
    : "—";

  const documentoLinha = pedido.cliente
    ? clienteDocumentoReciboPdf({
        tipo: pedido.cliente.tipo,
        cpf: pedido.cliente.cpf,
        cnpj: pedido.cliente.cnpj,
        ie: pedido.cliente.ie,
        ieIsento: pedido.cliente.ieIsento,
      })
    : "—";

  let totalProdutos = 0;
  let totalUnidadesItens = 0;
  const linhas = pedido.itens.map((it) => {
    const pv = it.produtoVariacao;
    const prod = pv.produto;
    const vu = Number(it.precoUnitario.toFixed(2));
    const q = it.quantidade;
    const tl = Number((vu * q).toFixed(2));
    totalProdutos += tl;
    totalUnidadesItens += q;
    const desc = `${prod.nome} — ${pv.nome}`;
    const ref = pv.codigoExterno?.trim() || prod.referencia?.trim() || "—";
    const ean = pv.ean13?.trim() || "—";
    const un = prod.unidadeTributavel?.trim() || "UN";
    return {
      ean,
      ref,
      descricao: desc,
      valorUnit: vu,
      quantidade: q,
      totalLinha: tl,
      unidade: un,
    };
  });

  const modalidadeEntregaLabel =
    pedido.modalidade === "CONSIGNADA" ? pedidoModalidadeLabels.CONSIGNADA : null;

  const pdfBytes = await buildPedidoVendaPdf({
    tenantNome: pedido.tenant.name,
    lojaNome: pedido.store.name,
    pedidoNumero: pedido.numero,
    criadoEm: pedido.createdAt,
    estadoLabel: pedidoEstadoLabels[pedido.estado],
    cliente: pedido.cliente
      ? {
          nomeExibicao: clienteNome,
          endereco: pedido.cliente.endereco,
          telefone: pedido.cliente.telefone,
          email: pedido.cliente.email,
          documentoLinha,
        }
      : null,
    linhas,
    totalPedido,
    totalProdutos: Number(totalProdutos.toFixed(2)),
    totalUnidadesItens,
    pagamentos: pedido.pagamentos.map((p) => ({
      data: p.createdAt,
      formaLabel: formasPagamentoLabels[p.forma],
      valor: Number(p.valor.toFixed(2)),
    })),
    totalPago,
    entregueEm: pedido.entregueEm,
    modalidadeEntregaLabel,
    observacoes: pedido.observacoes,
    vendedorNome: pedido.vendedor.name,
  });

  const filename = `pedido-venda-${pedido.numero}.pdf`;
  return new NextResponse(pdfBytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
