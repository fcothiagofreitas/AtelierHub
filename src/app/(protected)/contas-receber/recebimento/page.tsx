import { redirect } from "next/navigation";
import { requireRole } from "@/lib/authorization";
import { getActiveStoreContext } from "@/lib/session";
import { ROLES_ACESSO_VENDAS } from "@/modules/vendas/lib/roles";
import {
  getRecebimentoPartyLabel,
  listPedidosAbertosParaGrupo,
} from "@/modules/vendas/cobranca-queries";
import { ContasReceberRecebimentoClient } from "@/modules/vendas/components/contas-receber-recebimento-client";
import type { GrupoCobrancaTipo } from "@prisma/client";

type Props = {
  searchParams?: Promise<{
    tipo?: string;
    clienteId?: string;
    corretorId?: string;
  }>;
};

export default async function ContasReceberRecebimentoPage({
  searchParams,
}: Props) {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const { activeStore } = await getActiveStoreContext();
  if (!activeStore) redirect("/dashboard");

  const sp = searchParams ? await searchParams : {};
  const tipo: GrupoCobrancaTipo =
    sp.tipo === "CORRETOR" ? "CORRETOR" : "CLIENTE";
  const clienteId = typeof sp.clienteId === "string" ? sp.clienteId : undefined;
  const corretorId =
    typeof sp.corretorId === "string" ? sp.corretorId : undefined;

  if (tipo === "CLIENTE" && !clienteId) {
    redirect("/contas-receber");
  }
  if (tipo === "CORRETOR" && !corretorId) {
    redirect("/contas-receber");
  }

  const pedidos = await listPedidosAbertosParaGrupo(
    session.user.tenantId,
    activeStore.id,
    tipo === "CLIENTE"
      ? { tipo: "CLIENTE", clienteId }
      : { tipo: "CORRETOR", corretorId },
  );

  if (pedidos.length === 0) {
    redirect("/contas-receber");
  }

  const partyLabel =
    (await getRecebimentoPartyLabel(
      session.user.tenantId,
      activeStore.id,
      tipo,
      clienteId,
      corretorId,
    )) ?? (tipo === "CLIENTE" ? "Cliente" : "Corretor");

  const voltarHref =
    tipo === "CORRETOR"
      ? "/contas-receber?tab=corretor"
      : "/contas-receber";

  return (
    <ContasReceberRecebimentoClient
      storeId={activeStore.id}
      tipo={tipo}
      partyLabel={partyLabel}
      pedidos={pedidos}
      voltarHref={voltarHref}
    />
  );
}
