import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { SearchBar } from "@/modules/admin/components/search-bar";
import { deleteProduto } from "@/modules/catalogo/actions/produto-actions";
import { CatalogoListAlert } from "@/modules/catalogo/components/catalogo-list-alert";
import { ProdutoTable } from "@/modules/catalogo/components/produto-table";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProdutosCatalogoPage({ searchParams }: Props) {
  const session = await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);
  const params = searchParams ? await searchParams : {};
  const search = typeof params.q === "string" ? params.q.trim() : "";
  const err = params.e;

  const produtos = await prisma.produto.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(search
        ? {
            OR: [
              { nome: { contains: search, mode: "insensitive" } },
              { descricao: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      categoria: { select: { nome: true } },
      _count: { select: { variacoes: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-5">
      <CatalogoListAlert code={err} />
      <SearchBar
        placeholder="Buscar por nome ou descrição..."
        base="/admin/catalogo/produtos"
        defaultValue={search}
      />
      <ProdutoTable
        search={search}
        deleteAction={deleteProduto}
        produtos={produtos.map((p) => ({
          id: p.id,
          nome: p.nome,
          isActive: p.isActive,
          categoriaNome: p.categoria?.nome ?? null,
          variacoesCount: p._count.variacoes,
        }))}
      />
    </div>
  );
}
