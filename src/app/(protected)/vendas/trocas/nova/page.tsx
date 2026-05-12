import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/authorization";
import { getActiveStoreContext } from "@/lib/session";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NovaTrocaForm } from "@/modules/trocas/components/nova-troca-form";
import { ROLES_ACESSO_VENDAS } from "@/modules/vendas/lib/roles";

export default async function NovaTrocaPage() {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const { activeStore } = await getActiveStoreContext();
  if (!activeStore) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/vendas/trocas"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 mb-2 text-muted-foreground",
          )}
        >
          <ArrowLeft className="size-4" />
          Trocas
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Nova troca</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Carregue o pedido pelo número, indique as quantidades a devolver e confirme.
        </p>
      </div>

      <NovaTrocaForm storeId={activeStore.id} />
    </div>
  );
}
