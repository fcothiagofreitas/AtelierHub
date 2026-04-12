import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireRole } from "@/lib/authorization";
import { getActiveStoreContext } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ROLES_ACESSO_CLIENTES } from "@/modules/clientes/lib/roles";
import { ClienteFormPj } from "@/modules/clientes/components/cliente-form-pj";

type Props = { params: Promise<{ id: string }> };

export default async function EditarClientePjPage({ params }: Props) {
  const session = await requireRole(ROLES_ACESSO_CLIENTES);
  const { id } = await params;
  const { activeStore } = await getActiveStoreContext();
  if (!activeStore) redirect("/dashboard");

  const cliente = await prisma.cliente.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
      tipo: "PJ",
      storeId: { in: session.user.storeIds },
    },
    include: { corretor: { select: { name: true } } },
  });

  if (!cliente) notFound();

  const corretores = await prisma.corretor.findMany({
    where: {
      tenantId: session.user.tenantId,
      isActive: true,
      isBlocked: false,
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/clientes"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Voltar para clientes
        </Link>
        <h2 className="mt-3 text-xl font-semibold">Editar pessoa jurídica</h2>
        <p className="mt-1 text-sm text-muted-foreground">{cliente.fantasia}</p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <ClienteFormPj
          storeId={cliente.storeId}
          corretores={corretores}
          cliente={cliente}
        />
      </div>
    </div>
  );
}
