import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CoresQuickAddClient } from "@/modules/catalogo/components/cores-quick-add-client";

export default async function NovaCorContinuaPage() {
  const session = await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);

  const rows = await prisma.catalogoCor.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    select: { id: true, nome: true, slug: true, ordem: true, isActive: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/admin/catalogo/cores"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            Voltar para cores
          </Link>
          <h2 className="mt-3 text-xl font-semibold">Adicionar várias cores</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre uma de cada vez sem sair da página. A lista abaixo atualiza a cada inclusão.
          </p>
        </div>
        <Link href="/admin/catalogo/cores" className={cn(buttonVariants({ variant: "outline" }))}>
          Ir para a lista
        </Link>
      </div>

      <CoresQuickAddClient initialRows={rows} />
    </div>
  );
}
