import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/authorization";
import { getActiveStoreContext } from "@/lib/session";
import { ROLES_ACESSO_VENDAS } from "@/modules/vendas/lib/roles";
import { getGrupoCobrancaDetalhe } from "@/modules/vendas/cobranca-queries";
import { GrupoCobrancaDetalheClient } from "@/modules/vendas/components/grupo-cobranca-detalhe-client";

type Props = { params: Promise<{ id: string }> };

export default async function GrupoCobrancaDetalhePage({ params }: Props) {
  await requireRole(ROLES_ACESSO_VENDAS);
  const { activeStore } = await getActiveStoreContext();
  if (!activeStore) redirect("/dashboard");

  const { id } = await params;
  const detalhe = await getGrupoCobrancaDetalhe(
    activeStore.tenantId,
    activeStore.id,
    id,
  );
  if (!detalhe) notFound();

  return (
    <GrupoCobrancaDetalheClient
      detalhe={detalhe}
      storeId={activeStore.id}
      storeName={activeStore.name}
    />
  );
}
