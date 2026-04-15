import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { SearchBar } from "@/modules/admin/components/search-bar";
import { deleteGradeTamanho } from "@/modules/catalogo/actions/grade-tamanho-actions";
import { CatalogoListAlert } from "@/modules/catalogo/components/catalogo-list-alert";
import { TaxonomyTable } from "@/modules/catalogo/components/taxonomy-table";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GradesTamanhoPage({ searchParams }: Props) {
  const session = await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);
  const params = searchParams ? await searchParams : {};
  const search = typeof params.q === "string" ? params.q.trim() : "";
  const err = params.e;

  const rows = await prisma.gradeTamanho.findMany({
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
    include: { _count: { select: { opcoes: true } } },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
  });

  return (
    <div className="space-y-5">
      <CatalogoListAlert code={err} />
      <SearchBar
        placeholder="Buscar por nome ou slug..."
        base="/admin/catalogo/tamanhos"
        defaultValue={search}
      />
      <TaxonomyTable
        title="Grades de tamanhos"
        search={search}
        newHref="/admin/catalogo/tamanhos/new"
        editHref={(id) => `/admin/catalogo/tamanhos/${id}/edit`}
        emptyHint="Nenhuma grade cadastrada. Crie uma (ex.: Letras, Numérico) e adicione opções dentro."
        deleteAction={deleteGradeTamanho}
        rows={rows.map((r) => ({
          id: r.id,
          nome: r.nome,
          slug: r.slug,
          ordem: r.ordem,
          isActive: r.isActive,
          subtitle: `${r._count.opcoes} ${r._count.opcoes === 1 ? "opção" : "opções"}`,
        }))}
      />
    </div>
  );
}
