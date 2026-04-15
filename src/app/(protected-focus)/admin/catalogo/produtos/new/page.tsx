import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { ProdutoForm } from "@/modules/catalogo/components/produto-form";

export default async function NovoProdutoPage() {
  const session = await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);
  const tenantId = session.user.tenantId;

  const [categorias, subcategorias, tipos, colecoes, gradesTamanho, opcoesTamanho, catalogoCores] =
    await Promise.all([
      prisma.categoriaProduto.findMany({
        where: { tenantId, isActive: true },
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
        select: { id: true, nome: true },
      }),
      prisma.subcategoriaProduto.findMany({
        where: { categoria: { tenantId }, isActive: true },
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
        select: { id: true, nome: true, categoriaId: true },
      }),
      prisma.tipoProduto.findMany({
        where: { tenantId, isActive: true },
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
        select: { id: true, nome: true },
      }),
      prisma.colecaoProduto.findMany({
        where: { tenantId, isActive: true },
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
        select: { id: true, nome: true },
      }),
      prisma.gradeTamanho.findMany({
        where: { tenantId, isActive: true },
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
        select: { id: true, nome: true },
      }),
      prisma.opcaoTamanho.findMany({
        where: { gradeTamanho: { tenantId, isActive: true } },
        orderBy: [{ gradeTamanhoId: "asc" }, { ordem: "asc" }, { nome: "asc" }],
        select: { id: true, nome: true, gradeTamanhoId: true },
      }),
      prisma.catalogoCor.findMany({
        where: { tenantId, isActive: true },
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
        select: { id: true, nome: true },
      }),
    ]);

  return (
    <ProdutoForm
      produto={null}
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
