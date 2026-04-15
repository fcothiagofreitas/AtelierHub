import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireRole } from "@/lib/authorization";
import { StoreForm } from "@/modules/admin/components/store-form";

export default async function NovaLojaPage() {
  await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link
          href="/admin/lojas"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Voltar para lojas
        </Link>
        <h2 className="mt-3 text-xl font-semibold">Nova loja</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre uma nova unidade operacional ou administrativa.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <StoreForm />
      </div>
    </div>
  );
}
