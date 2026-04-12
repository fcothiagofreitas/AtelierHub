import { notFound } from "next/navigation";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { ProdutoForm } from "@/modules/catalogo/components/produto-form";

type Props = { params: Promise<{ id: string }> };

export default async function EditarProdutoPage({ params }: Props) {
  const session = await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);
  const tenantId = session.user.tenantId;
  const { id } = await params;

  const produto = await prisma.produto.findFirst({
    where: { id, tenantId },
    include: {
      variacoes: { orderBy: { ordem: "asc" } },
    },
  });
  if (!produto) notFound();

  const [
    categorias,
    subcategorias,
    tipos,
    colecoes,
    gradesTamanho,
    opcoesTamanho,
    catalogoCores,
  ] = await Promise.all([
    prisma.categoriaProduto.findMany({
      where: { tenantId },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      select: { id: true, nome: true },
    }),
    prisma.subcategoriaProduto.findMany({
      where: { categoria: { tenantId } },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      select: { id: true, nome: true, categoriaId: true },
    }),
    prisma.tipoProduto.findMany({
      where: { tenantId },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      select: { id: true, nome: true },
    }),
    prisma.colecaoProduto.findMany({
      where: { tenantId },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      select: { id: true, nome: true },
    }),
    prisma.gradeTamanho.findMany({
      where: { tenantId },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      select: { id: true, nome: true },
    }),
    prisma.opcaoTamanho.findMany({
      where: { gradeTamanho: { tenantId } },
      orderBy: [{ gradeTamanhoId: "asc" }, { ordem: "asc" }, { nome: "asc" }],
      select: { id: true, nome: true, gradeTamanhoId: true },
    }),
    prisma.catalogoCor.findMany({
      where: { tenantId },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      select: { id: true, nome: true },
    }),
  ]);

  return (
    <ProdutoForm
      produto={{
        id: produto.id,
        referencia: produto.referencia,
        nome: produto.nome,
        descricao: produto.descricao,
        precoVenda: produto.precoVenda != null ? Number(produto.precoVenda) : null,
        categoriaId: produto.categoriaId,
        subcategoriaId: produto.subcategoriaId,
        tipoId: produto.tipoId,
        colecaoId: produto.colecaoId,
        gradeTamanhoId: produto.gradeTamanhoId,
        isActive: produto.isActive,
        ncm: produto.ncm,
        cest: produto.cest,
        origemMercadoria: produto.origemMercadoria,
        unidadeTributavel: produto.unidadeTributavel,
        variacoes: produto.variacoes.map((v) => ({
          id: v.id,
          opcaoTamanhoId: v.opcaoTamanhoId ?? "",
          corCatalogoId: v.corCatalogoId ?? "",
          ean13: v.ean13 ?? "",
          codigoExterno: v.codigoExterno ?? "",
          ordem: v.ordem,
        })),
      }}
      categorias={categorias}
      subcategorias={subcategorias}
      tipos={tipos}
      colecoes={colecoes}
      gradesTamanho={gradesTamanho}
      opcoesTamanho={opcoesTamanho}
      catalogoCores={catalogoCores}
    />
  );
}
