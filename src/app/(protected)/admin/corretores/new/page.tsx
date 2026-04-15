import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireRole } from "@/lib/authorization";
import { CorretorForm } from "@/modules/admin/components/corretor-form";

export default async function NovoCorretorPage() {
  await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/admin/corretores"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Voltar para corretores
        </Link>
        <h2 className="mt-3 text-xl font-semibold">Novo corretor</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastro de parceiro externo — não é colaborador da loja. Limite de crédito opcional
          (vazio = ilimitado).
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <CorretorForm />
      </div>
    </div>
  );
}
