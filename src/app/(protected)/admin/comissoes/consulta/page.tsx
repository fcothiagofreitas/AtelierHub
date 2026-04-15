import { redirect } from "next/navigation";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/** Rota antiga: mantém bookmarks e links partilhados. */
export default async function AdminComissoesConsultaRedirect({ searchParams }: Props) {
  const raw = searchParams ? await searchParams : {};
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" && v.length > 0) sp.set(k, v);
  }
  const q = sp.toString();
  redirect(q ? `/admin/comissoes?${q}` : "/admin/comissoes");
}
