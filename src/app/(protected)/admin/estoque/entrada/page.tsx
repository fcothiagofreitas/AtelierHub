import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { requireRole } from "@/lib/authorization";
import { EstoqueEntradaForm } from "@/modules/estoque/components/estoque-entrada-form";
import { getStoresForUserEstoque } from "@/modules/estoque/estoque-queries";
import { ESTOQUE_ROLES_ESCRITA } from "@/modules/estoque/estoque-roles";

export default async function EstoqueEntradaPage() {
  await requireRole(ESTOQUE_ROLES_ESCRITA);
  const { stores, defaultStoreId } = await getStoresForUserEstoque();

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
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Entrada manual</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Informe o EAN-13 da variação e a quantidade recebida na loja escolhida.
        </p>
      </div>
      <EstoqueEntradaForm stores={stores} defaultStoreId={defaultStoreId} />
    </div>
  );
}
