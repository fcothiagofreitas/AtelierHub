import Link from "next/link";
import { format, subDays } from "date-fns";
import { Settings2 } from "lucide-react";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listLancamentosComissao } from "@/modules/comissoes/comissoes-queries";
import { ComissoesConsultaFilters } from "@/modules/comissoes/components/comissoes-consulta-filters";
import { ComissoesLancamentosTable } from "@/modules/comissoes/components/comissoes-lancamentos-table";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminComissoesPage({ searchParams }: Props) {
  const session = await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);
  const params = searchParams ? await searchParams : {};

  const deParam = typeof params.de === "string" ? params.de : undefined;
  const ateParam = typeof params.ate === "string" ? params.ate : undefined;
  const colaboradorId =
    typeof params.colaboradorId === "string" ? params.colaboradorId : undefined;
  const corretorId = typeof params.corretorId === "string" ? params.corretorId : undefined;

  const defaultDe = deParam ?? format(subDays(new Date(), 30), "yyyy-MM-dd");
  const defaultAte = ateParam ?? format(new Date(), "yyyy-MM-dd");

  const [rows, colaboradores, corretores] = await Promise.all([
    listLancamentosComissao(session.user.tenantId, {
      de: deParam ?? null,
      ate: ateParam ?? null,
      colaboradorId: colaboradorId ?? null,
      corretorId: corretorId ?? null,
    }),
    prisma.colaborador.findMany({
      where: { tenantId: session.user.tenantId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.corretor.findMany({
      where: { tenantId: session.user.tenantId, isActive: true, isBlocked: false },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Comissões</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Lançamentos gerados automaticamente quando um pedido fica quitado.
          </p>
        </div>
        <Link
          href="/admin/comissoes/parametros"
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
        >
          <Settings2 className="size-4" />
          Parâmetros da marca
        </Link>
      </div>

      <ComissoesConsultaFilters
        colaboradores={colaboradores}
        corretores={corretores}
        defaultDe={defaultDe}
        defaultAte={defaultAte}
        defaultColaboradorId={colaboradorId ?? ""}
        defaultCorretorId={corretorId ?? ""}
      />

      <ComissoesLancamentosTable rows={rows} />
    </div>
  );
}
