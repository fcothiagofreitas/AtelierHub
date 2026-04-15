import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { requireRole } from "@/lib/authorization";
import { Badge } from "@/components/ui/badge";
import { getSaldosEstoque, getStoresForUserEstoque } from "@/modules/estoque/estoque-queries";
import { ESTOQUE_ROLES_LEITURA } from "@/modules/estoque/estoque-roles";

type Props = { searchParams?: Promise<{ store?: string }> };

export default async function EstoqueConsultaPage({ searchParams }: Props) {
  await requireRole(ESTOQUE_ROLES_LEITURA);
  const sp = searchParams ? await searchParams : {};
  const { stores } = await getStoresForUserEstoque();
  const first = stores[0]?.id;
  const storeParam = typeof sp.store === "string" ? sp.store : null;
  const storeId =
    storeParam && stores.some((s) => s.id === storeParam) ? storeParam : (first ?? null);

  if (!storeId) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Back />
        <p className="text-sm text-muted-foreground">Não há lojas disponíveis para este utilizador.</p>
      </div>
    );
  }

  const { rows, error } = await getSaldosEstoque(storeId);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Back />
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Consulta de estoque</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Saldos na loja selecionada. Para ver outra unidade, use o filtro (disponibilidade por loja).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">Loja:</span>
        <div className="flex flex-wrap gap-2">
          {stores.map((s) => (
            <Link
              key={s.id}
              href={s.id === storeId ? "/admin/estoque/consulta" : `/admin/estoque/consulta?store=${s.id}`}
              className={
                s.id === storeId
                  ? "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                  : "rounded-md border bg-card px-3 py-1.5 text-sm hover:bg-muted/60"
              }
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!error && rows.length === 0 && (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Sem saldos registados nesta loja. Faça uma entrada manual ou aguarde movimentos.
        </p>
      )}

      {!error && rows.length > 0 && (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Variação</th>
                <th className="px-4 py-3 font-medium">EAN</th>
                <th className="px-4 py-3 text-right font-medium">Quantidade</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id} className="bg-card">
                  <td className="px-4 py-3">
                    <span className="font-medium">{r.produtoVariacao.produto.nome}</span>
                    {r.produtoVariacao.produto.referencia && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({r.produtoVariacao.produto.referencia})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{r.produtoVariacao.nome}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.produtoVariacao.ean13 ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">{r.quantidade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
