import { ChevronLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { requireRole } from "@/lib/authorization";
import { ESTOQUE_ROLES_LEITURA } from "@/modules/estoque/estoque-roles";

const links = [
  { href: "/admin/estoque/consulta", title: "Consulta por loja", desc: "Saldos atuais por SKU (variação)." },
  { href: "/admin/estoque/historico", title: "Histórico de movimentos", desc: "Auditoria por período e loja." },
  { href: "/admin/estoque/entrada", title: "Entrada manual", desc: "Receção de mercadoria (EAN-13)." },
  { href: "/admin/estoque/saida-defeito", title: "Saída por defeito", desc: "Baixa de peças com motivo." },
  { href: "/admin/estoque/transferencia", title: "Transferência", desc: "Entre lojas ou a partir do administrativo." },
  { href: "/admin/estoque/conferencia", title: "Ajuste / conferência", desc: "Correção de inventário ou receção (delta +/−)." },
];

export default async function AdminEstoqueHubPage() {
  await requireRole(ESTOQUE_ROLES_LEITURA);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Painel administrativo
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Estoque</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Movimentos por loja e SKU. O saldo é sempre por variação (cor × tamanho) e por loja.
        </p>
      </div>

      <ul className="divide-y divide-border rounded-xl border bg-card">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/40"
            >
              <div>
                <p className="font-medium">{l.title}</p>
                <p className="text-sm text-muted-foreground">{l.desc}</p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
