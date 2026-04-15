import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { requireRole } from "@/lib/authorization";
import { Badge } from "@/components/ui/badge";
import { getStoresForUserEstoque } from "@/modules/estoque/estoque-queries";
import { listBalancosEstoqueForStore } from "@/modules/estoque/balanco-estoque-queries";
import { ESTOQUE_ROLES_LEITURA } from "@/modules/estoque/estoque-roles";
import { cn } from "@/lib/utils";

type Props = { searchParams?: Promise<{ store?: string }> };

const estadoLabel: Record<string, string> = {
  RASCUNHO: "Rascunho",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

export default async function BalancoEstoqueListPage({ searchParams }: Props) {
  await requireRole(ESTOQUE_ROLES_LEITURA);
  const sp = searchParams ? await searchParams : {};
  const { session, stores } = await getStoresForUserEstoque();
  const tenantId = session.user.tenantId;
  const first = stores[0]?.id;
  const storeParam = typeof sp.store === "string" ? sp.store : null;
  const storeId =
    storeParam && stores.some((s) => s.id === storeParam) ? storeParam : (first ?? null);

  const listRows = storeId ? await listBalancosEstoqueForStore(tenantId, storeId) : [];

  if (!storeId) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Back />
        <p className="text-sm text-muted-foreground">Não há lojas disponíveis para este utilizador.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Back />
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Balanço de estoque</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Documento de contagem física por loja: importação do saldo, contagens, conclusão com ajustes
            rastreáveis em movimentos de estoque.
          </p>
        </div>
        <Link
          href={`/admin/estoque/balanco/novo${storeId ? `?store=${storeId}` : ""}`}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Novo balanço
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">Loja:</span>
        <div className="flex flex-wrap gap-2">
          {stores.map((s) => (
            <Link
              key={s.id}
              href={s.id === storeId ? "/admin/estoque/balanco" : `/admin/estoque/balanco?store=${s.id}`}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm",
                s.id === storeId
                  ? "bg-primary font-medium text-primary-foreground"
                  : "border bg-card hover:bg-muted/60",
              )}
            >
              {s.name}
              {s.kind === "ADMINISTRATIVE" ? (
                <Badge variant="outline" className="ml-2 text-[10px]">
                  admin
                </Badge>
              ) : null}
            </Link>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">N.º</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Linhas</th>
              <th className="px-4 py-3 font-medium">Criado</th>
              <th className="px-4 py-3 font-medium">Concluído</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {listRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum balanço nesta loja. Crie um rascunho para começar.
                </td>
              </tr>
            )}
            {listRows.map((r) => (
              <tr key={r.id} className="bg-card">
                <td className="px-4 py-3 font-medium tabular-nums">#{r.numero}</td>
                <td className="px-4 py-3">
                  <Badge variant={r.estado === "CONCLUIDO" ? "default" : "secondary"}>
                    {estadoLabel[r.estado] ?? r.estado}
                  </Badge>
                </td>
                <td className="px-4 py-3 tabular-nums">{r.linhas}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {r.createdAt.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {r.concluidoEm
                    ? r.concluidoEm.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/estoque/balanco/${r.id}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Back() {
  return (
    <Link
      href="/admin/estoque"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ChevronLeft className="size-4" />
      Estoque
    </Link>
  );
}
