import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { requireRole } from "@/lib/authorization";
import { EstoqueSaidaForm } from "@/modules/estoque/components/estoque-saida-form";
import { getStoresForUserEstoque } from "@/modules/estoque/estoque-queries";
import { ESTOQUE_ROLES_ESCRITA } from "@/modules/estoque/estoque-roles";

export default async function EstoqueSaidaPage() {
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
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Saída por defeito</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Baixa de peças no estoque da loja (ex.: envio à fábrica). Exige saldo suficiente.
        </p>
      </div>
      <EstoqueSaidaForm stores={stores} defaultStoreId={defaultStoreId} />
    </div>
  );
}
