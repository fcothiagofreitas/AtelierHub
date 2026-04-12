import Link from "next/link";
import { ChevronLeft, User, Building2 } from "lucide-react";
import { requireRole } from "@/lib/authorization";
import { ROLES_ACESSO_CLIENTES } from "@/modules/clientes/lib/roles";
import { cn } from "@/lib/utils";

export default async function NovoClienteIndexPage() {
  await requireRole(ROLES_ACESSO_CLIENTES);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href="/clientes"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Voltar para clientes
        </Link>
        <h2 className="mt-3 text-xl font-semibold">Novo cliente</h2>
        <p className="mt-1 text-sm text-muted-foreground">Escolha o tipo de cadastro.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/clientes/new/pf"
          className={cn(
            "flex flex-col gap-3 rounded-lg border bg-card p-6 shadow-sm transition-colors",
            "hover:border-primary/40 hover:bg-accent/30",
          )}
        >
          <div className="flex size-10 items-center justify-center rounded-md bg-muted">
            <User className="size-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold">Pessoa física</p>
            <p className="mt-1 text-xs text-muted-foreground">CPF, contato e endereço</p>
          </div>
        </Link>
        <Link
          href="/clientes/new/pj"
          className={cn(
            "flex flex-col gap-3 rounded-lg border bg-card p-6 shadow-sm transition-colors",
            "hover:border-primary/40 hover:bg-accent/30",
          )}
        >
          <div className="flex size-10 items-center justify-center rounded-md bg-muted">
            <Building2 className="size-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold">Pessoa jurídica</p>
            <p className="mt-1 text-xs text-muted-foreground">CNPJ, IE e responsável</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
