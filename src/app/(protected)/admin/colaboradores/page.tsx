import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { ColaboradorTable } from "@/modules/admin/components/colaborador-table";
import { SearchBar } from "@/modules/admin/components/search-bar";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ColaboradoresPage({ searchParams }: Props) {
  const session = await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);
  const params = searchParams ? await searchParams : {};
  const search = typeof params.q === "string" ? params.q : "";
  const resetOk = params.reset === "ok";

  const colaboradores = await prisma.colaborador.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { cpf: { contains: search, mode: "insensitive" } },
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
        placeholder="Buscar por nome ou CPF..."
        base="/admin/colaboradores"
        defaultValue={search}
      />
      <ColaboradorTable
        colaboradores={colaboradores}
        search={search}
        resetOk={resetOk}
      />
    </div>
  );
}
