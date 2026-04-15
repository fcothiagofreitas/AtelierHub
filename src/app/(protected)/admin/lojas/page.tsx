import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { StoreTable } from "@/modules/admin/components/store-table";
import { SearchBar } from "@/modules/admin/components/search-bar";

type LojasPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LojasPage({ searchParams }: LojasPageProps) {
  const session = await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);
  const params = searchParams ? await searchParams : {};
  const search = typeof params.q === "string" ? params.q : "";

  const stores = await prisma.store.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(search
        ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { slug: { contains: search, mode: "insensitive" } }] }
        : {}),
    },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    include: { _count: { select: { colaboradorAccess: true } } },
  });

  return (
    <div className="space-y-5">
      <SearchBar placeholder="Buscar por nome ou slug..." base="/admin/lojas" defaultValue={search} />
      <StoreTable stores={stores} search={search} />
    </div>
  );
}
