import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { requireRole } from "@/lib/authorization";
import { getActiveStoreContext } from "@/lib/session";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { listTrocasForStore } from "@/modules/trocas/trocas-queries";
import { TrocasPrazoForm } from "@/modules/trocas/components/trocas-prazo-form";
import { TrocasTable } from "@/modules/trocas/components/trocas-table";
import { TrocasVincularForm } from "@/modules/trocas/components/trocas-vincular-form";
import { ROLES_ACESSO_VENDAS } from "@/modules/vendas/lib/roles";

export default async function VendasTrocasPage() {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const { activeStore } = await getActiveStoreContext();
  if (!activeStore) redirect("/dashboard");

  const [tenant, rows] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { prazoTrocaDias: true },
    }),
    listTrocasForStore(session.user.tenantId, activeStore.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/vendas"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 mb-1 text-muted-foreground",
            )}
          >
            <ArrowLeft className="size-4" />
            Vendas
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Trocas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Devoluções com crédito para o cliente e reposição de stock na loja. Consignado em aberto
            reduz a dívida registada ao corretor.
          </p>
        </div>
        <Link href="/vendas/trocas/nova" className={cn(buttonVariants())}>
          <Plus className="size-4" />
          Nova troca
        </Link>
      </div>

      <TrocasPrazoForm
        prazoAtual={tenant?.prazoTrocaDias ?? null}
        userRole={session.user.role}
      />

      <div className="overflow-hidden rounded-lg border bg-card">
        <TrocasTable rows={rows} />
      </div>

      <TrocasVincularForm storeId={activeStore.id} />
    </div>
  );
}
