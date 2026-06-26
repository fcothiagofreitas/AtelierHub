import { redirect } from "next/navigation";

export default function NovaTrocaPage() {
  redirect("/trocas?pdv=1");
}
