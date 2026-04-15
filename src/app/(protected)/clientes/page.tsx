import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/authorization";
import { getActiveStoreContext } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ROLES_ACESSO_CLIENTES } from "@/modules/clientes/lib/roles";
import { ClienteTable } from "@/modules/clientes/components/cliente-table";
import { SearchBar } from "@/modules/admin/components/search-bar";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClientesPage({ searchParams }: Props) {
  await requireRole(ROLES_ACESSO_CLIENTES);
  const { activeStore } = await getActiveStoreContext();
  if (!activeStore) redirect("/dashboard");

  const params = searchParams ? await searchParams : {};
  const search = typeof params.q === "string" ? params.q.trim() : "";

  const searchOr: Prisma.ClienteWhereInput[] = [
    { nome: { contains: search, mode: "insensitive" } },
    { fantasia: { contains: search, mode: "insensitive" } },
    { razaoSocial: { contains: search, mode: "insensitive" } },
    { telefone: { contains: search, mode: "insensitive" } },
    { email: { contains: search, mode: "insensitive" } },
  ];
  const digits = search.replace(/\D/g, "");
  if (digits.length >= 3) {
    searchOr.push({ cpf: { contains: digits } }, { cnpj: { contains: digits } });
  }

  const clientes = await prisma.cliente.findMany({
    where: {
      tenantId: activeStore.tenantId,
      storeId: activeStore.id,
      ...(search ? { OR: searchOr } : {}),
    },
    include: {
      corretor: { select: { name: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Clientes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastros da loja <span className="font-medium text-foreground">{activeStore.name}</span>
          .
        </p>
      </div>
      <SearchBar
        placeholder="Buscar por nome, documento, telefone ou e-mail..."
        base="/clientes"
        defaultValue={search}
      />
      <ClienteTable clientes={clientes} search={search} />
    </div>
  );
}
