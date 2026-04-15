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

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

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
            . Agrupe pedidos para receber em lote.
          </p>
        </div>
        <Link href="/vendas" className={cn(buttonVariants({ variant: "outline" }))}>
          Voltar a Vendas
        </Link>
      </div>

      <div className="flex gap-2 border-b">
        <Link
          href="/vendas/contas-receber"
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
          href="/vendas/contas-receber?tab=corretor"
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
          {porCliente.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Nenhum saldo em aberto por cliente.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/50 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Pedidos</th>
                    <th className="px-4 py-3 text-right font-medium">Saldo total</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {porCliente.map((row) => (
                    <tr key={row.clienteId} className="bg-card">
                      <td className="px-4 py-3 font-medium">{row.label}</td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {row.pedidosEmAberto}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        {money.format(row.saldoTotal)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link
                            href={`/vendas?clienteId=${encodeURIComponent(row.clienteId)}&estadoAberto=1`}
                            className={cn(
                              buttonVariants({ variant: "outline", size: "sm" }),
                            )}
                          >
                            Ver pedidos
                          </Link>
                          <Link
                            href={`/vendas/cobrancas/novo?tipo=CLIENTE&clienteId=${encodeURIComponent(row.clienteId)}`}
                            className={cn(buttonVariants({ size: "sm" }))}
                          >
                            Novo grupo
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          {porCorretor.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Nenhum saldo em aberto por corretor.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/50 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Corretor</th>
                    <th className="px-4 py-3 font-medium">Pedidos</th>
                    <th className="px-4 py-3 text-right font-medium">Saldo total</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {porCorretor.map((row) => (
                    <tr key={row.corretorId} className="bg-card">
                      <td className="px-4 py-3 font-medium">{row.name}</td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {row.pedidosEmAberto}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        {money.format(row.saldoTotal)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link
                            href={`/vendas?corretorId=${encodeURIComponent(row.corretorId)}&estadoAberto=1`}
                            className={cn(
                              buttonVariants({ variant: "outline", size: "sm" }),
                            )}
                          >
                            Ver pedidos
                          </Link>
                          <Link
                            href={`/vendas/cobrancas/novo?tipo=CORRETOR&corretorId=${encodeURIComponent(row.corretorId)}`}
                            className={cn(buttonVariants({ size: "sm" }))}
                          >
                            Novo grupo
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
