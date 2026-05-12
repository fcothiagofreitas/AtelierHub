import { redirect } from "next/navigation";

/** Preferência: nova troca abre o PDV modal na lista (`/trocas?pdv=1`). */
export default function NovaTrocaRedirectPage() {
  redirect("/trocas?pdv=1");
}
