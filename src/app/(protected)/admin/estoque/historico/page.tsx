import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { requireRole } from "@/lib/authorization";
import { getHistoricoEstoque, getStoresForUserEstoque } from "@/modules/estoque/estoque-queries";
import { ESTOQUE_ROLES_LEITURA } from "@/modules/estoque/estoque-roles";

type Props = { searchParams?: Promise<{ store?: string }> };

export default async function EstoqueHistoricoPage({ searchParams }: Props) {
  await requireRole(ESTOQUE_ROLES_LEITURA);
  const sp = searchParams ? await searchParams : {};
  const storeFilter = typeof sp.store === "string" ? sp.store : undefined;
  const { stores } = await getStoresForUserEstoque();

  if (storeFilter && !stores.some((s) => s.id === storeFilter)) {
    return (
      <div className="mx-auto max-w-5xl">
        <Back />
        <p className="mt-4 text-sm text-destructive">Loja inválida para o seu acesso.</p>
      </div>
    );
  }

  const { rows, error } = await getHistoricoEstoque({ storeId: storeFilter });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Back />
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Histórico de movimentos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Últimos registos (até 200 linhas). Filtre por loja para auditoria.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip active={!storeFilter} href="/admin/estoque/historico" label="Todas (permitidas)" />
        {stores.map((s) => (
          <FilterChip
            key={s.id}
            active={storeFilter === s.id}
            href={`/admin/estoque/historico?store=${s.id}`}
            label={s.name}
          />
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!error && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum movimento encontrado.</p>
      )}

      {!error && rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 font-medium">Loja</th>
                <th className="px-3 py-2 font-medium">Produto</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 text-right font-medium">Delta</th>
                <th className="px-3 py-2 font-medium">Utilizador</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((m) => (
                <tr key={m.id} className="bg-card">
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                    {m.createdAt.toISOString().slice(0, 19).replace("T", " ")}
                  </td>
                  <td className="px-3 py-2">{m.store.name}</td>
                  <td className="px-3 py-2">{m.produtoVariacao.produto.nome}</td>
                  <td className="px-3 py-2 text-xs">{m.tipo}</td>
                  <td
                    className={`px-3 py-2 text-right font-mono tabular-nums ${m.delta < 0 ? "text-destructive" : "text-foreground"}`}
                  >
                    {m.delta > 0 ? `+${m.delta}` : m.delta}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{m.user?.email ?? "—"}</td>
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

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
          : "rounded-md border bg-card px-3 py-1.5 text-sm hover:bg-muted/60"
      }
    >
      {label}
    </Link>
  );
}
