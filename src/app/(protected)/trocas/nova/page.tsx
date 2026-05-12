import { redirect } from "next/navigation";
import { requireRole } from "@/lib/authorization";
import { getActiveStoreContext } from "@/lib/session";
import { ROLES_ACESSO_VENDAS } from "@/modules/vendas/lib/roles";
import { getTrocaLojaOptions } from "@/modules/trocas/troca-data";
import { TrocaPdv } from "@/modules/trocas/components/troca-pdv";
import { clienteNomeCurto } from "@/modules/vendas/lib/cliente-nome";

export default async function NovaTrocaPage() {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const { activeStore } = await getActiveStoreContext();
  if (!activeStore) redirect("/dashboard");

  const { clientes, vendedores } = await getTrocaLojaOptions(
    activeStore.tenantId,
    activeStore.id,
  );

  const clienteOptions = clientes.map((c) => ({
    id: c.id,
    name: clienteNomeCurto(c),
    creditoTroca: c.creditoTroca.toNumber(),
    vendaRapidaPadrao: c.vendaRapidaPadrao,
  }));

  const defaultClienteId = clientes.find((c) => c.vendaRapidaPadrao)?.id ?? "";

  const vendedorOptions = vendedores.map((v) => ({
    id: v.id,
    name: v.name,
  }));

  const defaultColaboradorId = session.user.colaboradorId ?? vendedorOptions[0]?.id ?? "";

  return (
    <div className="container max-w-7xl space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nova troca</h1>
        <p className="text-sm text-muted-foreground">
          Leia os itens devolvidos, gere o crédito e selecione os novos itens.
        </p>
      </div>
      <TrocaPdv
        storeId={activeStore.id}
        defaultColaboradorId={defaultColaboradorId}
        defaultClienteId={defaultClienteId}
        clientes={clienteOptions}
        vendedores={vendedorOptions}
      />
    </div>
  );
}
