import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { CorretorTable } from "@/modules/admin/components/corretor-table";
import { SearchBar } from "@/modules/admin/components/search-bar";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CorretoresPage({ searchParams }: Props) {
  const session = await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);
  const params = searchParams ? await searchParams : {};
  const search = typeof params.q === "string" ? params.q : "";

  const corretores = await prisma.corretor.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { document: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-5">
      <SearchBar
        placeholder="Buscar por nome, e-mail ou documento..."
        base="/admin/corretores"
        defaultValue={search}
      />
      <CorretorTable corretores={corretores} search={search} />
    </div>
  );
}
