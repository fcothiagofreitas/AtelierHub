import { redirect } from "next/navigation";
import { requireRole } from "@/lib/authorization";
import { ROLES_ACESSO_VENDAS } from "@/modules/vendas/lib/roles";

type Props = { params: Promise<{ id: string }> };

/** Compatibilidade: detalhe do pedido abre no PDV em modo leitura (`?pdv=1&view=`). */
export default async function VendaDetalheRedirect({ params }: Props) {
  await requireRole(ROLES_ACESSO_VENDAS);
  const { id } = await params;
  redirect(`/vendas?pdv=1&view=${encodeURIComponent(id)}`);
}
