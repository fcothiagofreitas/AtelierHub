import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { SearchBar } from "@/modules/admin/components/search-bar";
import { deleteTipoProduto } from "@/modules/catalogo/actions/taxonomy-actions";
import { CatalogoListAlert } from "@/modules/catalogo/components/catalogo-list-alert";
import { TaxonomyTable } from "@/modules/catalogo/components/taxonomy-table";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TiposPage({ searchParams }: Props) {
  const session = await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);
  const params = searchParams ? await searchParams : {};
  const search = typeof params.q === "string" ? params.q.trim() : "";
  const err = params.e;

  const rows = await prisma.tipoProduto.findMany({
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
        base="/admin/catalogo/tipos"
        defaultValue={search}
      />
      <TaxonomyTable
        title="Tipos de produto"
        search={search}
        newHref="/admin/catalogo/tipos/new"
        editHref={(id) => `/admin/catalogo/tipos/${id}/edit`}
        emptyHint="Nenhum tipo cadastrado."
        deleteAction={deleteTipoProduto}
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
