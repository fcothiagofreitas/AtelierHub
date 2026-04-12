import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { SearchBar } from "@/modules/admin/components/search-bar";
import { deleteCategoria } from "@/modules/catalogo/actions/taxonomy-actions";
import { CatalogoListAlert } from "@/modules/catalogo/components/catalogo-list-alert";
import { TaxonomyTable } from "@/modules/catalogo/components/taxonomy-table";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CategoriasPage({ searchParams }: Props) {
  const session = await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);
  const params = searchParams ? await searchParams : {};
  const search = typeof params.q === "string" ? params.q.trim() : "";
  const err = params.e;

  const rows = await prisma.categoriaProduto.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(search
        ? {
            OR: [
              { nome: { contains: search, mode: "insensitive" } },
              { slug: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
  });

  return (
    <div className="space-y-5">
      <CatalogoListAlert code={err} />
      <SearchBar
        placeholder="Buscar por nome ou slug..."
        base="/admin/catalogo/categorias"
        defaultValue={search}
      />
      <TaxonomyTable
        title="Categorias"
        search={search}
        newHref="/admin/catalogo/categorias/new"
        editHref={(id) => `/admin/catalogo/categorias/${id}/edit`}
        emptyHint="Nenhuma categoria ainda. Crie a primeira para organizar o catálogo."
        deleteAction={deleteCategoria}
        rows={rows.map((r) => ({
          id: r.id,
          nome: r.nome,
          slug: r.slug,
          ordem: r.ordem,
          isActive: r.isActive,
        }))}
      />
    </div>
  );
}
