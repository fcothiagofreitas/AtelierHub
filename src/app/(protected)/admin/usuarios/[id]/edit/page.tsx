import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { UserForm } from "@/modules/admin/components/user-form";

type EditUsuarioPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditUsuarioPage({ params }: EditUsuarioPageProps) {
  const session = await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);
  const { id } = await params;

  const [user, stores] = await Promise.all([
    prisma.user.findFirst({
      where: { id, tenantId: session.user.tenantId },
      include: {
        stores: {
          select: { storeId: true, isDefault: true },
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        },
      },
    }),
    prisma.store.findMany({
      where: { tenantId: session.user.tenantId, isActive: true },
      orderBy: [{ kind: "asc" }, { name: "asc" }],
      select: { id: true, name: true, kind: true },
    }),
  ]);

  if (!user) notFound();

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
        <h2 className="mt-3 text-xl font-semibold">Editar usuário</h2>
        <p className="mt-1 text-sm text-muted-foreground">{user.name}</p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <UserForm user={user} availableStores={stores} />
      </div>
    </div>
  );
}
