import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { StoreForm } from "@/modules/admin/components/store-form";

type EditLojaPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditLojaPage({ params }: EditLojaPageProps) {
  const session = await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);
  const { id } = await params;

  const store = await prisma.store.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });

  if (!store) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link
          href="/admin/lojas"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Voltar para lojas
        </Link>
        <h2 className="mt-3 text-xl font-semibold">Editar loja</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {store.name}
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <StoreForm store={store} />
      </div>
    </div>
  );
}
