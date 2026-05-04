import { redirect } from "next/navigation";

/** Rota antiga: contas a receber passaram para fora de Vendas. */
export default function VendasContasReceberRedirectPage() {
  redirect("/contas-receber");
}
