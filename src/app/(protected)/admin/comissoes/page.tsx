import Link from "next/link";
import { format } from "date-fns";
import { Table2 } from "lucide-react";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ComissoesBackfillButton } from "@/modules/comissoes/components/comissoes-backfill-button";
import { ComissoesVendedorPadraoForm } from "@/modules/comissoes/components/comissoes-vendedor-padrao-form";

export default async function AdminComissoesPage() {
  const session = await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { percentualComissaoVendedorPadrao: true },
  });

  const padrao = tenant?.percentualComissaoVendedorPadrao ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Comissões</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Parâmetros da marca e consulta de lançamentos gerados quando um pedido fica quitado.
          </p>
        </div>
        <Link
          href={`/admin/comissoes/consulta?de=${format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")}&ate=${format(new Date(), "yyyy-MM-dd")}`}
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
        >
          <Table2 className="size-4" />
          Consultar lançamentos
        </Link>
      </div>

      <ComissoesVendedorPadraoForm percentualAtual={padrao} />

      <div className="rounded-lg border bg-muted/20 p-5 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Como os valores são calculados</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <strong>Vendedor:</strong> usa a comissão cadastrada no colaborador (campo &quot;Comissão
            mínima (%)&quot;). Se for zero, usa o percentual padrão da marca acima.
          </li>
          <li>
            <strong>Corretor:</strong> usa o percentual no cadastro do corretor, apenas em pedidos
            com corretor associado.
          </li>
          <li>A base de cálculo é o total do pedido no momento em que fica quitado.</li>
        </ul>
        <p className="mt-3 text-xs">
          Se já quitou vendas antes de configurar o % do vendedor ou o padrão da marca, use o botão
          abaixo para tentar criar só os lançamentos em falta (pedidos quitados sem linha de
          vendedor).
        </p>
        <div className="mt-3">
          <ComissoesBackfillButton />
        </div>
      </div>
    </div>
  );
}
