import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/authorization";
import { getActiveStoreContext } from "@/lib/session";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ROLES_ACESSO_VENDAS } from "@/modules/vendas/lib/roles";
import { listPedidosAbertosParaGrupo } from "@/modules/vendas/cobranca-queries";
import { GrupoCobrancaNovoForm } from "@/modules/vendas/components/grupo-cobranca-novo-form";
import type { GrupoCobrancaTipo } from "@prisma/client";

type Props = {
  searchParams?: Promise<{
    tipo?: string;
    clienteId?: string;
    corretorId?: string;
  }>;
};

function parseTipo(s: string | undefined): GrupoCobrancaTipo | null {
  if (s === "CLIENTE" || s === "CORRETOR") return s;
  return null;
}

export default async function NovoGrupoCobrancaPage({ searchParams }: Props) {
  await requireRole(ROLES_ACESSO_VENDAS);
  const { activeStore } = await getActiveStoreContext();
  if (!activeStore) redirect("/dashboard");

  const sp = searchParams ? await searchParams : {};
  const tipo = parseTipo(sp.tipo);
  if (!tipo) notFound();

  const clienteId = sp.clienteId?.trim() || undefined;
  const corretorId = sp.corretorId?.trim() || undefined;

  if (tipo === "CLIENTE" && !clienteId) notFound();
  if (tipo === "CORRETOR" && !corretorId) notFound();

  const pedidos = await listPedidosAbertosParaGrupo(
    activeStore.tenantId,
    activeStore.id,
    tipo === "CLIENTE"
      ? { tipo: "CLIENTE", clienteId }
      : { tipo: "CORRETOR", corretorId },
  );

  const titulo =
    tipo === "CLIENTE"
      ? "Novo grupo por cliente"
      : "Novo grupo por corretor";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Seleccione os pedidos com saldo em aberto para formar o lote. O valor
            será aplicado por ordem do pedido (FIFO).
          </p>
        </div>
        <Link
          href="/vendas/contas-receber"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Voltar
        </Link>
      </div>

      <GrupoCobrancaNovoForm storeId={activeStore.id} tipo={tipo} pedidos={pedidos} />
    </div>
  );
}
