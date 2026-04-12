import { redirect } from "next/navigation";

/** Compatibilidade: o PDV rápido abre em `/vendas?pdv=1`. */
export default function VendasNovoRedirectPage() {
  redirect("/vendas?pdv=1");
}
