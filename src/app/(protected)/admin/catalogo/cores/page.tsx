import Link from "next/link";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { SearchBar } from "@/modules/admin/components/search-bar";
import { deleteCatalogoCor } from "@/modules/catalogo/actions/catalogo-tc-actions";
import { CatalogoListAlert } from "@/modules/catalogo/components/catalogo-list-alert";
import { TaxonomyTable } from "@/modules/catalogo/components/taxonomy-table";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CoresCatalogoPage({ searchParams }: Props) {
  const session = await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);
  const params = searchParams ? await searchParams : {};
  const search = typeof params.q === "string" ? params.q.trim() : "";
  const err = params.e;

  const rows = await prisma.catalogoCor.findMany({
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
        base="/admin/catalogo/cores"
        defaultValue={search}
      />
      <p className="text-sm text-muted-foreground">
        <Link href="/admin/catalogo/cores/new" className="font-medium text-primary underline">
          Cadastro contínuo
        </Link>{" "}
        — adicione várias cores na mesma tela, sem voltar à lista a cada uma.
      </p>
      <TaxonomyTable
        title="Cores"
        search={search}
        newHref="/admin/catalogo/cores/new"
        editHref={(id) => `/admin/catalogo/cores/${id}/edit`}
        emptyHint="Nenhuma cor cadastrada."
        deleteAction={deleteCatalogoCor}
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
