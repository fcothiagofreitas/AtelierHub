import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { ColaboradorForm } from "@/modules/admin/components/colaborador-form";

export default async function NovoColaboradorPage() {
  const session = await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);

  const stores = await prisma.store.findMany({
    where: { tenantId: session.user.tenantId, isActive: true },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    select: { id: true, name: true, kind: true },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/admin/colaboradores"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Voltar para colaboradores
        </Link>
        <h2 className="mt-3 text-xl font-semibold">Novo colaborador</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre a pessoa e defina se ela terá acesso ao sistema.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <ColaboradorForm availableStores={stores} />
      </div>
    </div>
  );
}
