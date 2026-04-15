import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { requireRole } from "@/lib/authorization";
import { BalancoEstoqueNovoForm } from "@/modules/estoque/components/balanco-estoque-novo-form";
import { getStoresForUserEstoque } from "@/modules/estoque/estoque-queries";
import { ESTOQUE_ROLES_ESCRITA } from "@/modules/estoque/estoque-roles";

type Props = { searchParams?: Promise<{ store?: string }> };

export default async function BalancoEstoqueNovoPage({ searchParams }: Props) {
  await requireRole(ESTOQUE_ROLES_ESCRITA);
  const sp = searchParams ? await searchParams : {};
  const { stores, defaultStoreId } = await getStoresForUserEstoque();
  const storeParam = typeof sp.store === "string" ? sp.store : null;
  const initialStore =
    storeParam && stores.some((s) => s.id === storeParam) ? storeParam : defaultStoreId;

  if (stores.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Back />
        <p className="text-sm text-muted-foreground">Não há lojas disponíveis.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Back />
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Novo balanço</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Será criado um documento em rascunho. Depois importe as linhas a partir do saldo da loja e
          registe as contagens.
        </p>
      </div>
      <BalancoEstoqueNovoForm stores={stores} defaultStoreId={initialStore} />
    </div>
  );
}

function Back() {
  return (
    <Link
      href="/admin/estoque/balanco"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ChevronLeft className="size-4" />
      Balanço de estoque
    </Link>
  );
}
