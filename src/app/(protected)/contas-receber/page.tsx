import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/authorization";
import { getActiveStoreContext } from "@/lib/session";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ROLES_ACESSO_VENDAS } from "@/modules/vendas/lib/roles";
import {
  listContasReceberPorCliente,
  listContasReceberPorCorretor,
} from "@/modules/vendas/cobranca-queries";
import {
  ContasReceberTabelaCliente,
  ContasReceberTabelaCorretor,
} from "@/modules/vendas/components/contas-receber-tabela";

type Props = {
  searchParams?: Promise<{ tab?: string }>;
};

export default async function ContasReceberPage({ searchParams }: Props) {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const { activeStore } = await getActiveStoreContext();
  if (!activeStore) redirect("/dashboard");

  const tab = (await searchParams)?.tab === "corretor" ? "corretor" : "cliente";

  const [porCliente, porCorretor] = await Promise.all([
    listContasReceberPorCliente(session.user.tenantId, activeStore.id),
    listContasReceberPorCorretor(session.user.tenantId, activeStore.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Contas a receber
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Saldos em aberto na loja{" "}
            <span className="font-medium text-foreground">{activeStore.name}</span>
            . Use <span className="font-medium text-foreground">Ver pedidos</span>{" "}
            para registar recebimentos; o valor aplica-se por ordem de pedido
            (FIFO).
          </p>
        </div>
        <Link href="/vendas" className={cn(buttonVariants({ variant: "outline" }))}>
          Ir a Vendas
        </Link>
      </div>

      <div className="flex gap-2 border-b">
        <Link
          href="/contas-receber"
          className={cn(
            "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            tab === "cliente"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          Por cliente
        </Link>
        <Link
          href="/contas-receber?tab=corretor"
          className={cn(
            "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            tab === "corretor"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          Por corretor
        </Link>
      </div>

      {tab === "cliente" ? (
        <div className="overflow-hidden rounded-lg border bg-card">
          <ContasReceberTabelaCliente rows={porCliente} />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <ContasReceberTabelaCorretor rows={porCorretor} />
        </div>
      )}
    </div>
  );
}
