import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { UserTable } from "@/modules/admin/components/user-table";
import { SearchBar } from "@/modules/admin/components/search-bar";

type UsuariosPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function UsuariosPage({ searchParams }: UsuariosPageProps) {
  const session = await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);
  const params = searchParams ? await searchParams : {};
  const search = typeof params.q === "string" ? params.q : "";
  const resetOk = params.reset === "ok";

  const users = await prisma.user.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      stores: {
        include: { store: { select: { name: true } } },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-5">
      <SearchBar
        placeholder="Buscar por nome ou e-mail..."
        base="/admin/usuarios"
        defaultValue={search}
      />
      <UserTable users={users} search={search} resetOk={resetOk} />
    </div>
  );
}
