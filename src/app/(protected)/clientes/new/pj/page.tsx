import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireRole } from "@/lib/authorization";
import { getActiveStoreContext } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ROLES_ACESSO_CLIENTES } from "@/modules/clientes/lib/roles";
import { ClienteFormPj } from "@/modules/clientes/components/cliente-form-pj";

export default async function NovaClientePjPage() {
  const session = await requireRole(ROLES_ACESSO_CLIENTES);
  const { activeStore } = await getActiveStoreContext();
  if (!activeStore) redirect("/dashboard");

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
          href="/clientes/new"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Tipo de cliente
        </Link>
        <h2 className="mt-3 text-xl font-semibold">Nova pessoa jurídica</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Loja: <span className="font-medium text-foreground">{activeStore.name}</span>
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <ClienteFormPj storeId={activeStore.id} corretores={corretores} />
      </div>
    </div>
  );
}
