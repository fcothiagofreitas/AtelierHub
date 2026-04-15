import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { SearchBar } from "@/modules/admin/components/search-bar";
import { deleteSubcategoria } from "@/modules/catalogo/actions/taxonomy-actions";
import { CatalogoListAlert } from "@/modules/catalogo/components/catalogo-list-alert";
import { TaxonomyTable } from "@/modules/catalogo/components/taxonomy-table";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SubcategoriasPage({ searchParams }: Props) {
  const session = await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);
  const params = searchParams ? await searchParams : {};
  const search = typeof params.q === "string" ? params.q.trim() : "";
  const err = params.e;

  const rows = await prisma.subcategoriaProduto.findMany({
    where: {
      categoria: { tenantId: session.user.tenantId },
      ...(search
        ? {
            OR: [
              { nome: { contains: search, mode: "insensitive" } },
              { slug: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { categoria: { select: { nome: true } } },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
  });

  return (
    <div className="space-y-5">
      <CatalogoListAlert code={err} />
      <SearchBar
        placeholder="Buscar por nome ou slug..."
        base="/admin/catalogo/subcategorias"
        defaultValue={search}
      />
      <TaxonomyTable
        title="Subcategorias"
        search={search}
        newHref="/admin/catalogo/subcategorias/new"
        editHref={(id) => `/admin/catalogo/subcategorias/${id}/edit`}
        emptyHint="Nenhuma subcategoria. Crie após ter ao menos uma categoria."
        deleteAction={deleteSubcategoria}
        rows={rows.map((r) => ({
          id: r.id,
          nome: r.nome,
          slug: r.slug,
          ordem: r.ordem,
          isActive: r.isActive,
          subtitle: `Categoria: ${r.categoria.nome}`,
        }))}
      />
    </div>
  );
}
