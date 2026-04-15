import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { requireRole } from "@/lib/authorization";
import { EstoqueTransferenciaForm } from "@/modules/estoque/components/estoque-transferencia-form";
import { getStoresForUserEstoque } from "@/modules/estoque/estoque-queries";
import { ESTOQUE_ROLES_ESCRITA } from "@/modules/estoque/estoque-roles";

export default async function EstoqueTransferenciaPage() {
  await requireRole(ESTOQUE_ROLES_ESCRITA);
  const { stores, defaultStoreId } = await getStoresForUserEstoque();

  const admin = stores.find((s) => s.kind === "ADMINISTRATIVE");
  const op = stores.filter((s) => s.kind === "OPERATIONAL");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/admin/estoque"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Estoque
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Transferência</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Move quantidade entre duas lojas do mesmo tenant. Gera par de movimentos rastreados (lote).
        </p>
      </div>
      <EstoqueTransferenciaForm
        stores={stores}
        defaultOrigemId={admin?.id ?? defaultStoreId}
        defaultDestinoId={op.find((s) => s.id !== admin?.id)?.id ?? op[0]?.id ?? defaultStoreId}
      />
    </div>
  );
}
