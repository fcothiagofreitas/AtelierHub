import { redirect } from "next/navigation";

/**
 * Rota legada: o recebimento em lote passou a ser só em Contas a receber
 * (Pagamento em lote → Receber), num único passo.
 */
export default function CobrancasNovoRedirect() {
  redirect("/vendas/contas-receber");
}
