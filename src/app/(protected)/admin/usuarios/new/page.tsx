import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { UserForm } from "@/modules/admin/components/user-form";

export default async function NovoUsuarioPage() {
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
          href="/admin/usuarios"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Voltar para usuários
        </Link>
        <h2 className="mt-3 text-xl font-semibold">Novo usuário</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Defina perfil, lojas liberadas e loja padrão.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <UserForm availableStores={stores} />
      </div>
    </div>
  );
}
