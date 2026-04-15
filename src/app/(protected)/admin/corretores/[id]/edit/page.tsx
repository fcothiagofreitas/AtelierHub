import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { CorretorForm } from "@/modules/admin/components/corretor-form";

type Props = { params: Promise<{ id: string }> };

export default async function EditarCorretorPage({ params }: Props) {
  const session = await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);
  const { id } = await params;

  const corretor = await prisma.corretor.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });

  if (!corretor) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/admin/corretores"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Voltar para corretores
        </Link>
        <h2 className="mt-3 text-xl font-semibold">Editar corretor</h2>
        <p className="mt-1 text-sm text-muted-foreground">{corretor.name}</p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <CorretorForm corretor={corretor} />
      </div>
    </div>
  );
}
