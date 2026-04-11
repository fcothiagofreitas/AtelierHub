import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { ColaboradorForm } from "@/modules/admin/components/colaborador-form";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditColaboradorPage({ params }: Props) {
  const session = await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);
  const { id } = await params;

  const [colaborador, stores] = await Promise.all([
    prisma.colaborador.findFirst({
      where: { id, tenantId: session.user.tenantId },
      include: {
        user: { select: { email: true } },
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

  if (!colaborador) notFound();

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
        <h2 className="mt-3 text-xl font-semibold">Editar colaborador</h2>
        <p className="mt-1 text-sm text-muted-foreground">{colaborador.name}</p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <ColaboradorForm colaborador={colaborador} availableStores={stores} />
      </div>
    </div>
  );
}
